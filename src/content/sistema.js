/**
 * Formulário "Reembolso de Diária" do sistema interno (Angular Material).
 *
 * Barra flutuante com a fila de diárias:
 * - "Salvar PDFs": imprime cada nota da fila em PDF (impressão do Firefox).
 * - "Pasta dos PDFs": você escolhe a pasta uma vez; os arquivos
 *   NFCe-<número>.pdf são relacionados às notas da fila.
 * - "Preencher próxima": preenche o formulário e anexa o PDF da nota.
 * O "Salvar" do sistema continua com você; "Concluída" tira a diária da fila.
 */
(function () {
  'use strict';

  const { money, nfce, settings } = globalThis.NFCe;

  const FIELDS = {
    priority: 'priority-select',
    description: 'description-textarea',
    date: '-from',
    number: 'document-number',
    type: 'expenseType-select',
    value: 'value',
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, timeout = 3000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const result = fn();
      if (result) return result;
      await sleep(100);
    }
    return null;
  }

  // ------------------------------------------------------ preenchimento

  /** O sistema deixa cópias ocultas com o mesmo id; vale a visível. */
  function byId(id, inner = '') {
    return [...document.querySelectorAll(`[id="${id}"] ${inner}`.trim())].find((el) => el.offsetParent) ?? null;
  }

  /**
   * Angular só registra o valor com os eventos de input/change/blur.
   * A descrição tem um textarea decorativo com o mesmo id e sem vínculo
   * com o formulário; o real é o que tem a classe do Material/Bootstrap.
   */
  function setInput(id, value) {
    const el = document.querySelector(`[id="${id}"]:is(.mat-mdc-input-element, .form-control)`);
    if (!el) throw new Error(`campo #${id} não encontrado`);
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    el.blur();
  }

  async function selectOption(id, label) {
    const trigger = byId(id, '.mat-mdc-select-trigger');
    if (!trigger) throw new Error(`seletor #${id} não encontrado`);
    trigger.click();
    const option = await waitFor(() =>
      [...document.querySelectorAll('mat-option')].find((o) => o.textContent.trim() === label));
    if (!option) {
      document.querySelector('.cdk-overlay-backdrop')?.click();
      throw new Error(`opção "${label}" não existe em #${id}`);
    }
    option.click();
    await waitFor(() => !document.querySelector('mat-option'), 1000);
  }

  async function fill(entry, cfg) {
    if (cfg.systemPriority) await selectOption(FIELDS.priority, cfg.systemPriority);
    await selectOption(FIELDS.type, entry.type);
    setInput(FIELDS.date, nfce.formatDateBR(entry.date));
    setInput(FIELDS.number, entry.number);
    setInput(FIELDS.value, (entry.valueCents / 100).toFixed(2));
    setInput(FIELDS.description, `NFC-e ${entry.number} · ${entry.store}`);
  }


  // --------------------------------------------------------------- anexos

  /**
   * PDFs escolhidos pelo usuário (pasta ou arquivos), por número da nota.
   * A extensão não pode ler o disco sozinha: o Firefox só entrega arquivos
   * que a pessoa seleciona. Por isso a pasta é escolhida uma vez por sessão.
   */
  const pdfFiles = new Map();
  const PDF_NAME = /NFCe-(\d+)\.pdf$/i;

  function pdfName(entry) {
    return `NFCe-${entry.number}.pdf`;
  }

  /** Entrega o arquivo ao Dropzone pelo input oculto dele. */
  function attachPdf(file) {
    const input = document.querySelector('input.dz-hidden-input[type="file"]');
    if (!input) throw new Error('área de anexos não encontrada');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const folderInput = document.createElement('input');
  folderInput.type = 'file';
  folderInput.multiple = true;
  folderInput.webkitdirectory = true;
  folderInput.hidden = true;
  folderInput.addEventListener('change', () => {
    for (const file of folderInput.files) {
      const match = file.name.match(PDF_NAME);
      if (match) pdfFiles.set(match[1], file);
    }
    folderInput.value = '';
    render();
  });

  // ---------------------------------------------------------- interface

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (key === 'class') el.className = value;
      else if (key in el) el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    el.append(...children.flat().filter((c) => c != null && c !== false));
    return el;
  }

  const host = h('div', { id: 'nfx-root' });
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(h('link', { rel: 'stylesheet', href: browser.runtime.getURL('src/content/panel.css') }), folderInput);

  const label = h('span', { class: 'bar__label' });
  const savePdfsBtn = h('button', { class: 'btn btn--ghost', onclick: onSavePdfs }, 'Salvar PDFs');
  const folderBtn = h('button', { class: 'btn btn--ghost', onclick: () => folderInput.click() }, 'Pasta dos PDFs');
  const fillBtn = h('button', { class: 'btn btn--primary', onclick: onFill }, 'Preencher próxima');
  const skipBtn = h('button', { class: 'btn btn--ghost', onclick: onSkip }, 'Pular');
  const doneBtn = h('button', { class: 'btn btn--primary', onclick: onDone }, 'Concluída');
  const bar = h('div', { class: 'bar', hidden: true }, label, savePdfsBtn, folderBtn, skipBtn, fillBtn, doneBtn);
  shadow.append(bar);

  /** Diária preenchida e ainda não concluída. */
  let current = null;
  /** Mensagem temporária (erros, progresso). */
  let notice = '';

  const describe = (e) => `Nº ${e.number} · ${e.type} · R$ ${money.formatBRL(e.valueCents)}`;

  async function render() {
    const formVisible = !!byId(FIELDS.number);
    const { queue } = await settings.load();
    if (current && !queue.some((e) => e.url === current.url)) current = null;

    bar.hidden = !formVisible || queue.length === 0;
    savePdfsBtn.hidden = folderBtn.hidden = fillBtn.hidden = !!current;
    skipBtn.hidden = doneBtn.hidden = !current;

    const withPdf = queue.filter((e) => pdfFiles.has(e.number)).length;
    if (notice) {
      label.textContent = notice;
    } else if (current) {
      label.textContent = `${describe(current)} — ${current.attached
        ? `${pdfName(current)} anexado; confira e salve`
        : `sem ${pdfName(current)} na pasta: anexe manualmente e salve`}`;
    } else {
      label.textContent = `${queue.length} na fila · PDFs ${withPdf}/${queue.length} · próxima: ${describe(queue[0] ?? { valueCents: 0 })}`;
    }
  }

  function setNotice(text) {
    notice = text;
    render();
  }

  async function onFill() {
    const cfg = await settings.load();
    const entry = cfg.queue[0];
    if (!entry) return render();
    fillBtn.disabled = true;
    notice = '';
    try {
      await fill(entry, cfg);
      const file = pdfFiles.get(entry.number);
      if (file) attachPdf(file);
      current = { ...entry, attached: !!file };
    } catch (err) {
      setNotice(`Não foi possível preencher: ${err.message}`);
    } finally {
      fillBtn.disabled = false;
    }
    render();
  }

  /**
   * Salva, uma a uma, as notas da fila que ainda não têm PDF na pasta
   * (impressão do próprio Firefox; a janela "Salvar como" aparece para cada).
   * Salve todas na mesma pasta e depois escolha essa pasta.
   */
  async function onSavePdfs() {
    const { queue } = await settings.load();
    const missing = queue.filter((e) => !pdfFiles.has(e.number));
    savePdfsBtn.disabled = true;
    let saved = 0;
    for (const [i, entry] of missing.entries()) {
      setNotice(`Salvando PDF ${i + 1}/${missing.length} (${pdfName(entry)})…`);
      const result = await browser.runtime.sendMessage({ action: 'printNote', url: entry.url, number: entry.number })
        .catch((err) => ({ status: 'error', message: err.message }));
      if (result.status === 'saved' || result.status === 'replaced') saved++;
      else if (result.status === 'canceled') break;
      else if (result.message) { setNotice(result.message); savePdfsBtn.disabled = false; return; }
    }
    savePdfsBtn.disabled = false;
    setNotice(`${saved} PDF(s) salvo(s). Clique em “Pasta dos PDFs” e escolha a pasta onde salvou.`);
  }

  async function onSkip() {
    const { queue } = await settings.load();
    const { attached, ...entry } = current;
    await settings.save({ queue: [...queue.filter((e) => e.url !== entry.url), entry] });
    current = null;
    render();
  }

  async function onDone() {
    const { queue } = await settings.load();
    await settings.save({ queue: queue.filter((e) => e.url !== current.url) });
    pdfFiles.delete(current.number);
    current = null;
    notice = '';
    render();
  }

  // ------------------------------------------------------------ startup

  document.body.append(host);
  render();
  browser.storage.onChanged.addListener(render);
  // SPA: o formulário aparece e some conforme a rota.
  let formWasVisible = false;
  new MutationObserver(() => {
    const visible = !!byId(FIELDS.number);
    if (visible !== formWasVisible) {
      formWasVisible = visible;
      if (!visible) current = null;
      render();
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
