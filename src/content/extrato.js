/**
 * Página "Minhas notas" (/nfprweb/Extrato).
 *
 * 1. Adiciona um checkbox e o tipo (Mercado/Meal) a cada nota da tabela.
 * 2. "Preparar diárias" busca cada nota selecionada (fetch, mesma sessão),
 *    lista os itens, desmarca os não alimentícios e calcula o valor.
 * 3. "Adicionar à fila" grava as diárias para o lançamento no sistema interno.
 *
 * A interface flutuante vive num Shadow DOM para não herdar o CSS da página.
 */
(function () {
  'use strict';

  const { money, nfce, settings } = globalThis.NFCe;
  const TABLE_SELECTOR = '#notasId';

  /** url → dados da linha; sobrevive à troca de página da tabela. */
  const selected = new Map();
  /** linha da tabela → dados da nota (só NFC-e). */
  const rowNotes = new WeakMap();
  let stores = new Map();

  // ---------------------------------------------------------------- helpers

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

  const brl = (cents) => `R$ ${money.formatBRL(cents)}`;

  async function fetchNoteDocument(url) {
    // content.fetch (Firefox) faz a requisição como a página, com os cookies da sessão.
    const res = typeof content !== 'undefined' && content.fetch
      ? await content.fetch(url, { credentials: 'include' })
      : await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // O portal responde em ISO-8859-1; res.text() assumiria UTF-8.
    const charset = (res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1] || 'iso-8859-1';
    const html = new TextDecoder(charset).decode(await res.arrayBuffer());
    return new DOMParser().parseFromString(html, 'text/html');
  }

  // ------------------------------------------------------- tabela da página

  function readRow(tr) {
    const cells = tr.cells;
    const link = tr.querySelector('a[href*="NotaFiscalHtml"]');
    if (!link || cells.length < 5) return null;
    return {
      url: link.href,
      isNfce: new URL(link.href).searchParams.get('tpDoc') === '2',
      cnpj: cells[0].textContent.trim(),
      store: cells[1].textContent.trim(),
      number: cells[2].textContent.trim(),
      date: nfce.parseDateBR(cells[3].textContent),
      grossCents: money.parseBRL(cells[4].textContent),
    };
  }

  function renderRowBadge(tr, note) {
    tr.querySelector('.nfx-badge')?.remove();
    const type = stores.get(nfce.cnpjKey(note.cnpj));
    const badge = h('span', { class: `nfx-badge ${type ? 'nfx-badge--' + type.toLowerCase() : 'nfx-badge--unknown'}` },
      type || 'sem tipo');
    tr.cells[2]?.append(badge); // célula do estabelecimento (após o checkbox)
  }

  function enhanceTable(table) {
    // A paginação (AJAX) troca as linhas mantendo a tabela: processa só as novas.
    for (const tr of [...table.rows]) {
      if (tr.querySelector(':scope > .nfx-cell')) continue;
      const note = readRow(tr);
      const isHeader = !note && tr.querySelector('th');
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.className = 'nfx-cell';

      if (note && !note.isNfce) {
        // NF-e (modelo 55) tem outro layout; fora do escopo por enquanto.
        cell.append(h('input', { type: 'checkbox', class: 'nfx-check', disabled: true, title: 'NF-e (modelo 55) não é suportada' }));
      } else if (note) {
        rowNotes.set(tr, note);
        const checkbox = h('input', {
          type: 'checkbox',
          class: 'nfx-check',
          title: 'Selecionar para a diária',
          checked: selected.has(note.url),
          onchange: (e) => {
            if (e.target.checked) selected.set(note.url, note);
            else selected.delete(note.url);
            tr.classList.toggle('nfx-selected', e.target.checked);
            updateBar();
          },
        });
        tr.classList.toggle('nfx-selected', checkbox.checked);
        cell.append(checkbox);
      } else if (isHeader) {
        cell.append(h('input', {
          type: 'checkbox',
          class: 'nfx-check',
          title: 'Selecionar todas desta página',
          onchange: (e) => table.querySelectorAll('td.nfx-cell .nfx-check:not(:disabled)').forEach((cb) => {
            if (cb.checked !== e.target.checked) cb.click();
          }),
        }));
      }
      tr.insertBefore(cell, tr.firstChild);
      if (rowNotes.has(tr)) renderRowBadge(tr, note);
    }
  }

  function refreshBadges() {
    document.querySelectorAll(`${TABLE_SELECTOR} tr`).forEach((tr) => {
      if (rowNotes.has(tr)) renderRowBadge(tr, rowNotes.get(tr));
    });
  }

  // ---------------------------------------------------- interface flutuante

  const host = h('div', { id: 'nfx-root' });
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(h('link', { rel: 'stylesheet', href: browser.runtime.getURL('src/content/panel.css') }));

  const barLabel = h('span', { class: 'bar__label' });
  const bar = h('div', { class: 'bar', hidden: true },
    barLabel,
    h('button', { class: 'btn btn--ghost', onclick: clearSelection }, 'Limpar'),
    h('button', { class: 'btn btn--primary', onclick: openPanel }, 'Preparar diárias'));

  const cardList = h('div', { class: 'panel__body' });
  const footerTotal = h('strong');
  const footerInfo = h('span', { class: 'muted' });
  const noCentsBox = h('input', { type: 'checkbox', onchange: onNoCentsChange });
  const enqueueBtn = h('button', { class: 'btn btn--primary', onclick: onEnqueue }, 'Adicionar à fila');
  const feedback = h('div', { class: 'feedback', hidden: true });

  const panel = h('aside', { class: 'panel', hidden: true, role: 'dialog', 'aria-label': 'Preparar diárias' },
    h('header', { class: 'panel__header' },
      h('div', {},
        h('h2', { class: 'panel__title' }, 'Preparar diárias'),
        h('p', { class: 'muted' }, 'Confira os itens: os não alimentícios já vêm desmarcados.')),
      h('button', { class: 'icon-btn', title: 'Fechar', 'aria-label': 'Fechar', onclick: closePanel }, '×')),
    cardList,
    h('footer', { class: 'panel__footer' },
      feedback,
      h('div', { class: 'footer__row' },
        h('label', { class: 'switch' }, noCentsBox, h('span', {}, 'Sem centavos')),
        h('div', { class: 'footer__total' }, footerInfo, footerTotal)),
      h('div', { class: 'footer__row' },
        h('button', {
          class: 'btn btn--link',
          onclick: () => browser.runtime.sendMessage({ action: 'openOptions' }),
        }, 'Configurações'),
        enqueueBtn)));

  shadow.append(bar, panel);

  /** Estado do painel aberto. */
  let session = null;

  function updateBar() {
    const n = selected.size;
    bar.hidden = n === 0 || !panel.hidden;
    barLabel.textContent = n === 1 ? '1 nota selecionada' : `${n} notas selecionadas`;
  }

  function clearSelection() {
    selected.clear();
    document.querySelectorAll(`${TABLE_SELECTOR} .nfx-check`).forEach((cb) => { cb.checked = false; });
    document.querySelectorAll(`${TABLE_SELECTOR} .nfx-selected`).forEach((tr) => tr.classList.remove('nfx-selected'));
    updateBar();
  }

  async function openPanel() {
    const cfg = await settings.load();
    stores = settings.parseStores(cfg.storeDocuments);
    session = {
      cfg,
      keywords: nfce.parseKeywords(cfg.nonFoodKeywords),
      noCents: cfg.noCents,
      cards: [],
    };
    noCentsBox.checked = cfg.noCents;
    feedback.hidden = true;
    cardList.replaceChildren();

    const notes = [...selected.values()].sort((a, b) => a.date.localeCompare(b.date));
    for (const note of notes) {
      const card = createCard(note);
      session.cards.push(card);
      cardList.append(card.el);
    }
    panel.hidden = false;
    updateBar();
    updateFooter();
    // Uma por vez: são poucas notas e evita sobrecarregar o portal.
    for (const card of session.cards) await card.load();
  }

  function closePanel() {
    panel.hidden = true;
    session = null;
    updateBar();
  }

  async function onNoCentsChange() {
    session.noCents = noCentsBox.checked;
    await settings.save({ noCents: session.noCents });
    session.cards.forEach((card) => card.refresh());
  }

  function updateFooter() {
    if (!session) return;
    const ready = session.cards.filter((c) => c.status === 'ready');
    const pending = session.cards.length - ready.length - session.cards.filter((c) => c.status === 'error').length;
    const total = ready.reduce((sum, c) => sum + c.value(), 0);
    footerTotal.textContent = brl(total);
    footerInfo.textContent = pending ? `carregando ${pending}…` : `${ready.length} diária(s)`;
    const missingType = ready.some((c) => !c.type);
    enqueueBtn.disabled = pending > 0 || ready.length === 0 || missingType;
    enqueueBtn.title = missingType ? 'Defina o tipo de todas as notas' : '';
  }

  async function onEnqueue() {
    const entries = session.cards
      .filter((c) => c.status === 'ready')
      .map((c) => ({
        url: c.note.url,
        number: c.note.number,
        date: c.note.date,
        store: c.note.store,
        cnpj: c.note.cnpj,
        type: c.type,
        valueCents: c.value(),
        addedAt: new Date().toISOString(),
      }));
    const added = await settings.enqueue(entries);
    const skipped = entries.length - added;
    feedback.textContent = `${added} diária(s) adicionada(s) à fila.` +
      (skipped ? ` ${skipped} já estava(m) na fila.` : '');
    feedback.hidden = false;
  }

  // ------------------------------------------------------------ card da nota

  function createCard(note) {
    const key = nfce.cnpjKey(note.cnpj);
    const card = { note, status: 'loading', items: [], discount: 0, type: stores.get(key) || '' };

    const valueEl = h('strong', { class: 'card__value' }, '—');
    const breakdown = h('div', { class: 'card__breakdown muted' });
    const body = h('div', { class: 'card__items' }, h('p', { class: 'muted' }, 'Carregando itens…'));
    const saveStoreBtn = h('button', { class: 'btn btn--link btn--small', hidden: true, onclick: onSaveStore });

    const typeSelect = h('select', { class: 'select', onchange: (e) => { card.type = e.target.value; renderSaveStore(); updateFooter(); } },
      h('option', { value: '' }, 'Tipo…'),
      nfce.EXPENSE_TYPES.map((t) => h('option', { value: t, selected: t === card.type }, t)));

    card.el = h('section', { class: 'card' },
      h('div', { class: 'card__head' },
        h('div', {},
          h('div', { class: 'card__title' }, note.store),
          h('div', { class: 'muted' }, `Nº ${note.number} · ${nfce.formatDateBR(note.date)} · nota ${brl(note.grossCents)}`)),
        valueEl),
      h('div', { class: 'card__type' }, typeSelect, saveStoreBtn),
      breakdown,
      body);

    function renderSaveStore() {
      const known = stores.get(key);
      saveStoreBtn.hidden = !card.type || known === card.type;
      saveStoreBtn.textContent = known ? `Atualizar CNPJ para ${card.type}` : `Lembrar ${card.type} para este CNPJ`;
    }

    async function onSaveStore() {
      await settings.registerStore(note.cnpj, card.type, note.store);
      stores.set(key, card.type);
      renderSaveStore();
      refreshBadges();
    }

    async function rememberItem(item) {
      if (!item.code) return;
      const overrides = session.cfg.itemOverrides;
      const byKeyword = !nfce.isNonFood(item.name, session.keywords);
      if (item.included === byKeyword) delete overrides[item.code];
      else overrides[item.code] = item.included;
      await settings.save({ itemOverrides: overrides });
    }

    function renderItems() {
      const excluded = card.items.filter((i) => !i.included).length;
      const rows = card.items.map((item) => {
        const row = h('label', { class: `item ${item.included ? '' : 'item--excluded'}` },
          h('input', {
            type: 'checkbox',
            checked: item.included,
            onchange: (e) => {
              item.included = e.target.checked;
              row.classList.toggle('item--excluded', !item.included);
              summary.textContent = summaryText();
              rememberItem(item);
              card.refresh();
            },
          }),
          h('span', { class: 'item__name' }, item.name),
          h('span', { class: 'item__value' }, money.formatBRL(item.cents)));
        return row;
      });
      const summaryText = () => {
        const n = card.items.filter((i) => !i.included).length;
        return `${card.items.length} itens · ${n} excluído(s)`;
      };
      const summary = h('summary', {}, summaryText());
      body.replaceChildren(h('details', { open: excluded > 0 }, summary, h('div', { class: 'item-list' }, rows)));
    }

    card.value = () => nfce.computeValue(card.items, card.discount, session?.noCents);

    card.refresh = () => {
      if (card.status !== 'ready') return;
      const kept = card.items.reduce((s, i) => s + (i.included ? i.cents : 0), 0);
      valueEl.textContent = brl(card.value());
      breakdown.textContent = `Itens mantidos ${brl(kept)}` +
        (card.discount ? ` − desconto ${brl(card.discount)}` : '') +
        (session.noCents ? ' · sem centavos' : '');
      updateFooter();
    };

    card.load = async () => {
      try {
        const parsed = nfce.parseNote(await fetchNoteDocument(note.url));
        if (!parsed.items.length) throw new Error('nenhum item encontrado (sessão expirada?)');
        card.items = parsed.items.map((item) => ({
          ...item,
          included: nfce.isIncluded(item, session.keywords, session.cfg.itemOverrides),
        }));
        card.discount = parsed.discount;
        card.status = 'ready';
        renderItems();
        renderSaveStore();
        card.refresh();
      } catch (err) {
        card.status = 'error';
        card.el.classList.add('card--error');
        body.replaceChildren(h('p', { class: 'error' }, `Não foi possível ler a nota: ${err.message}`));
        updateFooter();
      }
    };

    return card;
  }

  // ---------------------------------------------------------------- startup

  async function init() {
    stores = settings.parseStores((await settings.load()).storeDocuments);
    document.body.append(host);

    const tryEnhance = () => {
      const table = document.querySelector(TABLE_SELECTOR);
      if (table) enhanceTable(table);
    };
    tryEnhance();
    // A paginação pode trocar a tabela sem recarregar a página.
    new MutationObserver(tryEnhance).observe(document.body, { childList: true, subtree: true });
  }

  init().catch((err) => console.error('[Extrator NFCe]', err));
})();
