(function () {
  'use strict';

  const { money, nfce, settings } = globalThis.NFCe;

  const $ = (id) => document.getElementById(id);

  function queueItem(entry, onRemove) {
    const li = document.createElement('li');
    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = entry.store;
    title.title = entry.store;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `${entry.type} · Nº ${entry.number} · ${nfce.formatDateBR(entry.date)}`;
    info.append(title, meta);

    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = `R$ ${money.formatBRL(entry.valueCents)}`;

    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = 'Remover da fila';
    remove.addEventListener('click', onRemove);

    li.append(info, value, remove);
    return li;
  }

  async function render() {
    const { queue } = await settings.load();
    const total = queue.reduce((sum, e) => sum + e.valueCents, 0);

    $('queue').replaceChildren(...queue.map((entry) => queueItem(entry, async () => {
      await settings.save({ queue: queue.filter((e) => e.url !== entry.url) });
      render();
    })));
    $('queueTotal').textContent = queue.length ? `${queue.length} · R$ ${money.formatBRL(total)}` : '';
    $('emptyQueue').hidden = queue.length > 0;
    $('clearQueue').hidden = queue.length === 0;
  }

  $('openExtrato').addEventListener('click', async () => {
    const { notaParanaUrl } = await settings.load();
    await browser.tabs.create({ url: notaParanaUrl });
    window.close();
  });

  $('openOptions').addEventListener('click', async () => {
    await browser.runtime.openOptionsPage();
    window.close();
  });

  $('clearQueue').addEventListener('click', async () => {
    await settings.save({ queue: [] });
    render();
  });

  render();
})();
