(function () {
  'use strict';

  const { nfce, settings } = globalThis.NFCe;
  const $ = (id) => document.getElementById(id);

  let statusTimer;
  function showStatus(text) {
    $('status').textContent = text;
    $('status').hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { $('status').hidden = true; }, 3000);
  }

  function renderOverrides(overrides) {
    const n = Object.keys(overrides).length;
    $('overridesInfo').textContent = n
      ? `${n} item(ns) ajustado(s) manualmente no painel (lembrados pelo código do produto).`
      : 'Nenhum ajuste manual salvo.';
    $('clearOverrides').hidden = n === 0;
  }

  async function load() {
    const cfg = await settings.load();
    $('storeDocuments').value = cfg.storeDocuments;
    $('nonFoodKeywords').value = cfg.nonFoodKeywords;
    $('noCents').checked = cfg.noCents;
    $('systemPriority').value = cfg.systemPriority;
    $('notaParanaUrl').value = cfg.notaParanaUrl;
    $('systemUrl').value = cfg.systemUrl;
    renderOverrides(cfg.itemOverrides);
  }

  /** Só aceita endereços http(s) válidos; '' é permitido para o sistema interno. */
  function readUrl(id) {
    const value = $(id).value.trim();
    if (!value) return '';
    const url = new URL(value); // lança se inválida
    if (!/^https?:$/.test(url.protocol)) throw new Error('use um endereço http(s)');
    return url.href;
  }

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let notaParanaUrl;
    let systemUrl;
    try {
      notaParanaUrl = readUrl('notaParanaUrl');
      systemUrl = readUrl('systemUrl');
    } catch (err) {
      showStatus(`Endereço inválido: ${err.message}`);
      return;
    }
    // Precisa ser a primeira chamada assíncrona: o Firefox só pede permissão
    // dentro do clique do usuário.
    const origins = [notaParanaUrl, systemUrl].filter(Boolean).map(settings.urlToOrigin);
    const granted = await browser.permissions.request({ origins });
    if (!granted) {
      showStatus('Sem permissão para os endereços; nada foi salvo.');
      return;
    }
    await settings.save({ notaParanaUrl, systemUrl });

    const stores = settings.parseStores($('storeDocuments').value);
    const lines = $('storeDocuments').value.split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('=')).length;
    await settings.save({
      storeDocuments: $('storeDocuments').value.trim(),
      nonFoodKeywords: $('nonFoodKeywords').value.trim(),
      noCents: $('noCents').checked,
      systemPriority: $('systemPriority').value,
    });
    const ignored = lines - stores.size;
    showStatus(ignored > 0
      ? `Salvo. ${ignored} linha(s) de CNPJ com tipo inválido foram ignoradas.`
      : 'Configurações salvas.');
  });

  $('restoreKeywords').addEventListener('click', () => {
    $('nonFoodKeywords').value = nfce.DEFAULT_KEYWORDS.join('\n');
  });

  $('clearOverrides').addEventListener('click', async () => {
    await settings.save({ itemOverrides: {} });
    renderOverrides({});
    showStatus('Ajustes manuais esquecidos.');
  });

  // ---------------------------------------------------------------- backup

  /** Chaves exportadas e o tipo esperado de cada uma (a fila fica de fora). */
  const BACKUP_KEYS = {
    storeDocuments: 'string',
    nonFoodKeywords: 'string',
    itemOverrides: 'object',
    noCents: 'boolean',
    systemPriority: 'string',
    notaParanaUrl: 'string',
    systemUrl: 'string',
  };

  $('exportBtn').addEventListener('click', async () => {
    const cfg = await settings.load();
    const data = Object.fromEntries(Object.keys(BACKUP_KEYS).map((k) => [k, cfg[k]]));
    const blob = new Blob([JSON.stringify({ app: 'extrator-nfce', version: 1, settings: data }, null, 2)],
      { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extrator-nfce-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  $('importBtn').addEventListener('click', () => $('importFile').click());

  $('importFile').addEventListener('change', async () => {
    const file = $('importFile').files[0];
    $('importFile').value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== 'extrator-nfce' || typeof parsed.settings !== 'object') {
        throw new Error('arquivo não é um backup do Extrator NFCe');
      }
      // Só aceita as chaves conhecidas, com o tipo certo.
      const data = {};
      for (const [key, type] of Object.entries(BACKUP_KEYS)) {
        const value = parsed.settings[key];
        if (value === undefined) continue;
        const ok = type === 'object' ? value && typeof value === 'object' && !Array.isArray(value) : typeof value === type;
        if (!ok) throw new Error(`campo "${key}" inválido`);
        data[key] = value;
      }
      await settings.save(data);
      await load();
      // Permissão de domínio só pode ser pedida num clique: o "Salvar" faz isso.
      showStatus('Configurações importadas. Clique em Salvar para liberar os endereços.');
    } catch (err) {
      showStatus(`Não foi possível importar: ${err.message}`);
    }
  });

  load();
})();
