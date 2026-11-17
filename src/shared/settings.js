/**
 * Persistência em browser.storage.local: configurações, cadastro de CNPJ
 * e a fila de diárias.
 * Depende de: nfce.js
 */
(function (NS) {
  'use strict';

  const DEFAULTS = {
    storeDocuments: '', // linhas "CNPJ=Tipo"
    nonFoodKeywords: NS.nfce.DEFAULT_KEYWORDS.join('\n'),
    itemOverrides: {}, // código do produto → incluído (bool)
    noCents: false,
    systemPriority: 'Média', // '' = não preencher
    notaParanaUrl: 'https://notaparana.pr.gov.br/nfprweb/Extrato', // página "Minhas notas"
    systemUrl: '', // endereço do sistema interno (formulário de diária)
    queue: [], // diárias prontas para lançar
  };

  function load() {
    return browser.storage.local.get(DEFAULTS);
  }

  /**
   * URL configurada → padrão de correspondência do Firefox.
   * "https://host/app/#/x" → "https://host/app/*" (hash e query são ignorados).
   */
  function urlToMatch(url) {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname}*`;
  }

  /** URL → permissão de acesso ao domínio inteiro. */
  function urlToOrigin(url) {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/*`;
  }

  function save(partial) {
    return browser.storage.local.set(partial);
  }

  /** Texto "CNPJ=Tipo" → Map(cnpjSóDígitos → Tipo) */
  function parseStores(text) {
    const map = new Map();
    for (const raw of String(text ?? '').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [cnpj, type] = line.split('=');
      const key = NS.nfce.cnpjKey(cnpj);
      const normalized = NS.nfce.normalizeType(type);
      if (key && normalized) map.set(key, normalized);
    }
    return map;
  }

  function formatCnpj(key) {
    return key.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /** Grava (ou atualiza) a linha do CNPJ, preservando comentários. */
  async function registerStore(cnpj, type, label = '') {
    const { storeDocuments } = await load();
    const key = NS.nfce.cnpjKey(cnpj);
    const lines = String(storeDocuments).split('\n').filter((line) => {
      const [c] = line.split('=');
      return !(line.includes('=') && NS.nfce.cnpjKey(c) === key);
    });
    if (label) lines.push(`# ${label}`);
    lines.push(`${formatCnpj(key)}=${type}`);
    await save({ storeDocuments: lines.filter((l, i) => l.trim() || i > 0).join('\n') });
  }

  /** Adiciona diárias à fila, ignorando notas já enfileiradas. */
  async function enqueue(entries) {
    const { queue } = await load();
    const known = new Set(queue.map((e) => e.url));
    const fresh = entries.filter((e) => !known.has(e.url));
    await save({ queue: [...queue, ...fresh] });
    return fresh.length;
  }

  NS.settings = {
    DEFAULTS, load, save, parseStores, registerStore, enqueue, urlToMatch, urlToOrigin,
  };
})((globalThis.NFCe = globalThis.NFCe || {}));
