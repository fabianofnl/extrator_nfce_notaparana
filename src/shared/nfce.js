/**
 * Regras de negócio da NFCe: leitura da página da nota, classificação de
 * itens não alimentícios e cálculo do valor da diária.
 * Depende de: money.js
 */
(function (NS) {
  'use strict';

  const EXPENSE_TYPES = ['Mercado', 'Meal'];

  /** Palavras-chave casadas no início de uma palavra da descrição. */
  const DEFAULT_KEYWORDS = [
    '# Limpeza',
    'DETERG', 'AGUA SANIT', 'LIMPADOR', 'DESINF', 'AMACIANTE', 'SABAO',
    'LAVA ROUPA', 'ESPONJA', 'MULTIUSO', 'ALVEJANTE', 'VEJA', 'AJAX', 'PINHO SOL',
    '# Higiene',
    'PAPEL HIG', 'TOALHA DE PAPEL', 'GUARDANAPO', 'HASTES', 'SAB.', 'SABONETE',
    'GEL DENTAL', 'CREME DENTAL', 'ESCOVA', 'SHAMPOO', 'CONDICIONADOR',
    'DESODOR', 'ABSORVENTE', 'FRALDA',
    '# Bebidas alcoólicas',
    'CERV', 'CHOPP', 'VINHO', 'ESPUMANTE', 'VODKA', 'CACHACA', 'WHISKY', 'GIN ',
    'RUM ', 'LICOR', 'TEQUILA',
    '# Brinquedos e outros',
    'BRINQ', 'PILHA', 'LAMPADA', 'SACO LIXO', 'FILTRO DE PAPEL',
  ];

  function normalize(text) {
    return String(text ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase();
  }

  function parseKeywords(text) {
    return String(text ?? '')
      .split('\n')
      .map((line) => normalize(line).trimStart())
      .filter((line) => line.trim() && !line.startsWith('#'));
  }

  function isNonFood(description, keywords) {
    const padded = ' ' + normalize(description).replace(/[^A-Z0-9.]+/g, ' ') + ' ';
    return keywords.some((kw) => padded.includes(' ' + kw.replace(/[^A-Z0-9.]+/g, ' ')));
  }

  /** Exceção aprendida (por código do produto) vence a palavra-chave. */
  function isIncluded(item, keywords, overrides) {
    if (item.code && Object.prototype.hasOwnProperty.call(overrides, item.code)) {
      return overrides[item.code];
    }
    return !isNonFood(item.name, keywords);
  }

  /**
   * Valor da diária = itens mantidos − desconto total da nota.
   * O desconto é sempre aplicado inteiro (regra do menor valor).
   */
  function computeValue(items, discountCents, noCents) {
    const kept = items.reduce((sum, i) => sum + (i.included ? i.cents : 0), 0);
    const value = Math.max(0, kept - discountCents);
    return noCents ? NS.money.truncateCents(value) : value;
  }

  function cnpjKey(cnpj) {
    return String(cnpj ?? '').replace(/\D/g, '');
  }

  /** "mercado" | "refeição" | "Meal" → tipo de despesa do sistema interno, ou '' */
  function normalizeType(value) {
    const v = normalize(value).trim();
    if (v.startsWith('MERC')) return 'Mercado';
    if (v.startsWith('MEAL') || v.startsWith('REFEI')) return 'Meal';
    return '';
  }

  /** "01/10/2026 13:45" → "2026-10-01" */
  function parseDateBR(text) {
    const m = String(text ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  function formatDateBR(iso) {
    const [y, m, d] = String(iso ?? '').split('-');
    return d ? `${d}/${m}/${y}` : '';
  }

  /** Lê o documento de /nfprweb/NotaFiscalHtml. */
  function parseNote(doc) {
    const text = (root, sel) => root.querySelector(sel)?.textContent.trim() ?? '';

    const items = [...doc.querySelectorAll('#tabResult tr')]
      .map((tr) => ({
        name: text(tr, '.txtTit2'),
        code: (text(tr, '.RCod').match(/\d+/) || [''])[0],
        cents: NS.money.parseBRL(text(tr, '.valor')),
      }))
      .filter((item) => item.name);

    const totals = { gross: 0, discount: 0, net: 0 };
    // No HTML original as linhas usam id="linhaTotal" (repetido), não classe.
    doc.querySelectorAll('#totalNota > div').forEach((line) => {
      const label = normalize(text(line, 'label'));
      const value = NS.money.parseBRL(text(line, '.totalNumb'));
      if (label.startsWith('VALOR TOTAL')) totals.gross = value;
      else if (label.startsWith('DESCONTO')) totals.discount = value;
      else if (label.startsWith('VALOR A PAGAR')) totals.net = value;
    });

    return { items, ...totals };
  }

  NS.nfce = {
    EXPENSE_TYPES,
    DEFAULT_KEYWORDS,
    normalize,
    parseKeywords,
    isNonFood,
    isIncluded,
    computeValue,
    cnpjKey,
    normalizeType,
    parseDateBR,
    formatDateBR,
    parseNote,
  };
})((globalThis.NFCe = globalThis.NFCe || {}));
