# CLAUDE.md

Extensão Firefox (Manifest V2) que lê NFC-e do Nota Paraná e lança diárias no sistema interno. Visão de uso e instalação: [README.md](README.md).

## Comandos

- Testes: `node test/rules.test.js` (asserts puros, sem framework; imprime `ok`)
- Pacote: `web-ext build --overwrite-dest --ignore-files 'test/**' README.md LICENSE`
- Carregar: `about:debugging` → Carregar extensão temporária → o `.zip` (no Firefox Snap, nunca o `manifest.json`)

## Arquitetura

- Sem build, sem dependências, sem módulos ES. Os arquivos de `src/shared/` são IIFEs que penduram em `globalThis.NFCe` (`money`, `nfce`, `settings`) e precisam ser carregados nessa ordem: money → nfce → settings.
- Content scripts **não** ficam no manifest: o `background.js` os registra com `browser.contentScripts.register` a partir das URLs salvas (`notaParanaUrl`, `systemUrl`) e refaz o registro quando o storage ou as permissões mudam. Script novo para uma página → adicionar em `SCRIPTS` no background.
- Acesso ao sistema interno usa a permissão opcional `*://*/*`, pedida nas opções ao salvar o endereço.
- Ações privilegiadas (abrir as opções, `tabs.saveAsPDF`) passam por `runtime.sendMessage` com `action` para o background.
- A UI injetada (painel e barras) vive em Shadow DOM, estilizada por `src/content/panel.css` (web_accessible_resource).
- Estado em `browser.storage.local`; os padrões e as chaves ficam em `DEFAULTS` (`settings.js`).

## Convenções

- Dinheiro sempre em **centavos inteiros**. Converter só na borda (`parseBRL`/`formatBRL`). "Sem centavos" trunca, nunca arredonda.
- Valor da diária = itens mantidos − desconto total da nota (desconto aplicado inteiro, mínimo 0).
- Classificação: a exceção manual por código do produto (`itemOverrides`) vence a palavra-chave. As palavras-chave casam no início de uma palavra, depois de `normalize` (sem acento, maiúsculas).
- Tipos de despesa: só `Mercado` e `Meal`.
- Firefox-only (`browser.*`, `tabs.saveAsPDF`); não adaptar para Chrome.
- Código, comentários, UI e commits em português.
- Lógica pura nova em `src/shared/` ganha um assert em `test/rules.test.js`.

## Pontos frágeis (dependem do HTML de terceiros)

- Seletores da nota: `parseNote` (`nfce.js`) e `readRow` (`extrato.js`).
- Campos do formulário (Angular Material, com cópias ocultas de mesmo id): `FIELDS` e `byId` (`sistema.js`).
