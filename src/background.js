/**
 * Background (persistente):
 * - registra os content scripts nos endereços configurados (Nota Paraná e
 *   sistema interno), já que eles não ficam fixos no manifest;
 * - executa ações que os content scripts não podem fazer sozinhos.
 * Depende de: money.js, nfce.js, settings.js
 */
const { settings } = globalThis.NFCe;

const SHARED = ['src/shared/money.js', 'src/shared/nfce.js', 'src/shared/settings.js'];
const SCRIPTS = {
  notaParanaUrl: {
    js: [...SHARED, 'src/content/extrato.js'],
    css: ['src/content/extrato-page.css'],
  },
  systemUrl: {
    js: [...SHARED, 'src/content/sistema.js'],
    css: [],
  },
};

/** Registros ativos; são desfeitos se o background for descarregado. */
const registered = {};

async function registerScripts() {
  const cfg = await settings.load();
  for (const [key, files] of Object.entries(SCRIPTS)) {
    await registered[key]?.unregister();
    delete registered[key];
    if (!cfg[key]) continue;
    try {
      registered[key] = await browser.contentScripts.register({
        matches: [settings.urlToMatch(cfg[key])],
        js: files.js.map((file) => ({ file })),
        css: files.css.map((file) => ({ file })),
        runAt: 'document_idle',
      });
    } catch (err) {
      console.error(`[Extrator NFCe] não foi possível registrar ${key}:`, err);
    }
  }
}

browser.storage.onChanged.addListener((changes) => {
  if (Object.keys(SCRIPTS).some((key) => key in changes)) registerScripts();
});
browser.permissions.onAdded.addListener(registerScripts);
registerScripts();

// ------------------------------------------------------------------ ações

/** Espera a aba terminar de carregar. */
function waitForLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info, tab) => {
      if (id === tabId && info.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    };
    browser.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Abre a nota numa aba, salva com a impressão do próprio Firefox
 * (tabs.saveAsPDF, igual a Imprimir → Salvar como PDF) e volta para a aba
 * de origem. O Firefox mostra a janela "Salvar como"; o arquivo vai para
 * o disco e é anexado no sistema interno.
 * saveAsPDF imprime a aba ativa, por isso a aba da nota precisa ficar ativa.
 */
async function printNote({ url, number }, origin) {
  const tab = await browser.tabs.create({ url, active: true, windowId: origin.windowId });
  try {
    const loaded = await waitForLoad(tab.id);
    if (!loaded.url?.includes('NotaFiscalHtml')) {
      return { status: 'login', message: 'Faça login no Nota Paraná e tente de novo.' };
    }
    const status = await browser.tabs.saveAsPDF({ toFileName: `NFCe-${number}.pdf` });
    return { status, fileName: `NFCe-${number}.pdf` };
  } finally {
    await browser.tabs.remove(tab.id).catch(() => {});
    await browser.tabs.update(origin.id, { active: true }).catch(() => {});
  }
}

browser.runtime.onMessage.addListener((message, sender) => {
  switch (message?.action) {
    case 'openOptions':
      return browser.runtime.openOptionsPage();
    case 'printNote':
      return printNote(message, sender.tab);
    default:
      return undefined;
  }
});
