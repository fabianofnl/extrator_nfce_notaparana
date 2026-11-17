// Executar: node test/rules.test.js
const assert = require('node:assert/strict');
require('../src/shared/money.js');
require('../src/shared/nfce.js');
globalThis.browser = {}; // settings.js só usa browser.* dentro das funções
require('../src/shared/settings.js');

const { money, nfce, settings } = globalThis.NFCe;

// Valores
assert.equal(money.parseBRL('1.234,56'), 123456);
assert.equal(money.parseBRL('R$ 47,09'), 4709);
assert.equal(money.formatBRL(123456), '1.234,56');
assert.equal(money.truncateCents(8799), 8700);

// Classificação (descrições reais de uma nota do Condor)
const keywords = nfce.parseKeywords(nfce.DEFAULT_KEYWORDS.join('\n'));
const nonFood = [
  'PAPEL HIG.MILI FD 30M C24', 'HASTES FLEX.TOPZ C75', 'TOALHA DE PAPEL SORELLA 200F',
  'DETERG.YPE C.LIMAO 500ML', 'AGUA SANIT.QBOA 1L', 'LIMPADOR VEJA X14 T.LIMO 500ML GAT.',
  'GEL DENTAL SORRISO FRESH HORTELA 90G', 'SAB.ALMA DE FLORES LOTUS 130G',
  'LIMPADOR AJAX MENTAORQUIDEA 1L', 'CERVEJA HEINEKEN 350ML', 'VINHO TINTO SECO',
];
const food = [
  'ATUM SOLIDO COQUEIRO OLEO 170G', 'PAO DE QUEIJO DA NONNA GDE KG', 'SUCO CAMPO LARGO UVA TTO 1,5L GF',
  'MASSA NISSIN GALINHA CAIPIRA 85G', 'SORVETE NESTLE NAPOLITANO TRAD.1,5L', 'QUEIJO PRATO CRIOULO ZERO LAC.150G',
  'MARGARINA QUALY 500G', 'PEPINO OLIVEIRA 300G',
];
nonFood.forEach((d) => assert.ok(nfce.isNonFood(d, keywords), `deveria excluir: ${d}`));
food.forEach((d) => assert.ok(!nfce.isNonFood(d, keywords), `deveria manter: ${d}`));

// Exceção manual vence a palavra-chave
assert.equal(nfce.isIncluded({ name: 'DETERG.YPE', code: '1' }, keywords, { 1: true }), true);
assert.equal(nfce.isIncluded({ name: 'ATUM', code: '2' }, keywords, { 2: false }), false);

// Valor: itens mantidos − desconto inteiro; sem centavos trunca
const items = [
  { cents: 4047, included: true },
  { cents: 1000, included: true },
  { cents: 269, included: false },
];
assert.equal(nfce.computeValue(items, 700, false), 4347);
assert.equal(nfce.computeValue(items, 700, true), 4300);
assert.equal(nfce.computeValue(items, 99999, false), 0);

// Cadastro de CNPJ: aceita formato antigo (mercado/refeicao)
const stores = settings.parseStores('# comentário\n76.189.406/0026-84=mercado\n11.222.333/0001-81 = refeicao\nlixo');
assert.equal(stores.get('76189406002684'), 'Mercado');
assert.equal(stores.get('11222333000181'), 'Meal');
assert.equal(stores.size, 2);

assert.equal(nfce.parseDateBR('01/10/2026 13:45'), '2026-10-01');
assert.equal(nfce.formatDateBR('2026-10-01'), '01/10/2026');

// Endereços configuráveis → padrões do Firefox
assert.equal(settings.urlToMatch('https://notaparana.pr.gov.br/nfprweb/Extrato'), 'https://notaparana.pr.gov.br/nfprweb/Extrato*');
assert.equal(settings.urlToMatch('https://sistema.exemplo.com:8443/app/#/x?y=1'), 'https://sistema.exemplo.com/app/*');
assert.equal(settings.urlToOrigin('https://sistema.exemplo.com/app/'), 'https://sistema.exemplo.com/*');

console.log('ok');
