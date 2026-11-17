# 🧾 Extrator NFCe Nota Paraná

Extensão para Firefox que transforma as NFC-e do portal Nota Paraná em lançamentos de diária no sistema interno: você seleciona as notas, a extensão remove os itens não alimentícios, calcula o valor, preenche o formulário e anexa o PDF da nota.

## 📋 Sobre o Projeto

Ferramenta de uso pessoal para automatizar o reembolso de diárias de alimentação. O fluxo começa na lista "Minhas notas" do Nota Paraná e termina no formulário **Reembolso de Diária** do sistema interno, com o mínimo de digitação manual.

Todo o processamento é local: os dados ficam no armazenamento da própria extensão no Firefox e não são enviados a nenhum servidor externo.

### 🎯 Funcionalidades

- ✅ Seleção de várias NFC-e direto na lista "Minhas notas", inclusive de meses diferentes
- ✅ Leitura dos itens de cada nota sem abrir abas
- ✅ Itens não alimentícios (limpeza, higiene, bebidas alcoólicas, brinquedos) desmarcados automaticamente, com palavras-chave configuráveis
- ✅ Ajustes manuais lembrados pelo código do produto
- ✅ Valor da diária = itens mantidos − desconto total da nota, com opção de retirar os centavos (truncando)
- ✅ Tipo de despesa (Mercado/Meal) por CNPJ, com cadastro em um clique
- ✅ Fila de diárias no popup da extensão
- ✅ Preenchimento automático do formulário no sistema interno
- ✅ PDF da nota gerado pela impressão do próprio Firefox (fiel ao "Imprimir") e anexado automaticamente
- ✅ Backup das configurações (exportar/importar)

## 📦 Instalação

### Pré-requisitos

- Firefox (desktop). A extensão usa o Manifest V2 e APIs exclusivas do Firefox (`browser.tabs.saveAsPDF`), portanto não funciona no Chrome/Edge
- Para gerar o pacote: [Node.js](https://nodejs.org/) e [web-ext](https://github.com/mozilla/web-ext) (`npm install -g web-ext`)

### Gerar o pacote

```bash
git clone https://github.com/fabianofnl/extrator_nfce_notaparana.git
cd extrator_nfce_notaparana
web-ext build --overwrite-dest --ignore-files 'test/**' README.md LICENSE
```

O pacote é criado em `web-ext-artifacts/extrator_nfce_nota_paran_-<versão>.zip`.

### Carregar no Firefox

1. Acesse `about:debugging` → **Este Firefox**
2. Clique em **Carregar extensão temporária…**
3. Selecione o **arquivo .zip** gerado

> **Firefox Snap (Ubuntu):** carregue sempre o `.zip`. Se escolher o `manifest.json`, o isolamento do Snap só dá acesso a esse arquivo, e a extensão fica sem ícone, com páginas em branco.

### Primeira configuração

No popup da extensão → **Configurações** → **Endereços**, informe o endereço do sistema interno de diárias e clique em **Salvar** (aceite a permissão pedida pelo Firefox). Sem esse endereço, a extensão só atua no Nota Paraná.

### Atualizar sem perder as configurações

- Gere o `.zip` novamente no mesmo caminho e clique em **Recarregar** no card da extensão em `about:debugging`
- **Remover** a extensão apaga as configurações. Antes de remover, use **Exportar configurações** (veja a seção Configurações)
- Extensões temporárias saem ao fechar o Firefox, mas as configurações permanecem: basta carregar o `.zip` de novo

## 🚀 Uso

### 1. Selecionar as notas (Nota Paraná)

1. Clique no ícone da extensão → **Abrir Minhas notas** e faça login, se necessário
2. Cada NFC-e da tabela ganha um checkbox e uma etiqueta com o tipo (Mercado, Meal ou "sem tipo"). NF-e (modelo 55) aparecem com o checkbox desativado
3. Marque as notas; a seleção continua ao trocar de mês
4. Clique em **Preparar diárias** na barra que aparece na parte de baixo da tela

### 2. Conferir e enfileirar

No painel lateral, para cada nota:

- Confira os itens: os não alimentícios já vêm desmarcados e riscados
- Escolha o tipo; para um CNPJ novo, clique em **Lembrar … para este CNPJ**
- Marque **Sem centavos**, se quiser o valor truncado (87,99 → 87)

Clique em **Adicionar à fila**. A fila fica visível no popup da extensão.

### 3. Lançar no sistema interno

Abra o formulário **Reembolso de Diária**. Uma barra flutuante mostra a fila:

1. **Salvar PDFs**: cada nota da fila é aberta numa aba e salva com a impressão do Firefox como `NFCe-<número>.pdf`. Salve todos na mesma pasta
2. **Pasta dos PDFs**: escolha essa pasta (uma vez por sessão). A barra mostra quantas notas têm PDF
3. **Preencher próxima**: preenche prioridade, descrição, data, número, tipo e valor, e anexa o PDF da nota
4. Confira, clique em **Salvar** no sistema e depois em **Concluída** na barra (ou **Pular** para deixar a diária para depois)

## ⚙️ Configurações

Acesse pelo popup → **Configurações**.

| Seção | O que define |
|-------|--------------|
| Endereços | Página "Minhas notas" do Nota Paraná (já preenchida) e endereço do sistema interno. Ao salvar um domínio novo, o Firefox pede permissão |
| Estabelecimentos | Lista `CNPJ=Mercado` ou `CNPJ=Meal`, uma por linha (`#` para comentários) |
| Itens não alimentícios | Palavras-chave casadas no início das palavras da descrição, com **Restaurar padrão**, e opção para esquecer os ajustes manuais |
| Valor | Retirar os centavos por padrão |
| Sistema interno | Prioridade usada no preenchimento |
| Backup | **Exportar** e **Importar** as configurações em JSON (a fila de diárias não entra) |

## 🔧 Estrutura do Projeto

```
extrator_nfce_notaparana/
├── manifest.json
├── icons/
├── src/
│   ├── background.js          # Ativa os scripts nos endereços configurados e salva o PDF da nota
│   ├── ui.css                 # Base visual do popup e das configurações
│   ├── shared/
│   │   ├── money.js           # Valores em centavos (parse, formatação, truncamento)
│   │   ├── nfce.js            # Regras: leitura da nota, itens não alimentícios, cálculo
│   │   └── settings.js        # storage.local: configurações, CNPJs e fila
│   ├── content/
│   │   ├── extrato.js         # Seleção na lista "Minhas notas" + painel de diárias
│   │   ├── sistema.js         # Preenchimento e anexo no formulário do sistema interno
│   │   ├── extrato-page.css   # Estilos injetados na tabela da página
│   │   └── panel.css          # Estilos do painel e das barras (Shadow DOM)
│   ├── popup/                 # Fila de diárias
│   └── options/               # Configurações e backup
└── test/
    └── rules.test.js          # Testes das regras de valor e classificação
```

### Testes

```bash
node test/rules.test.js
```

## 🛠️ Personalização

- **Itens não alimentícios:** ajuste as palavras-chave nas configurações; o padrão fica em `DEFAULT_KEYWORDS` (`src/shared/nfce.js`)
- **Leitura da nota:** os seletores do portal estão em `parseNote` (`src/shared/nfce.js`) e `readRow` (`src/content/extrato.js`)
- **Outro sistema de reembolso:** os campos do formulário estão em `FIELDS` (`src/content/sistema.js`); o endereço é definido nas configurações

Sinta-se à vontade para fazer fork do projeto e adaptá-lo às suas necessidades!

## 🤖 Desenvolvimento Assistido por IA

Este projeto foi desenvolvido com auxílio de Inteligência Artificial na estrutura, na implementação e na documentação, sempre com revisão, testes no uso real e decisões de negócio feitas por mim.

## 📄 Licença

Este projeto está licenciado sob a **Apache License 2.0** - consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

Você tem a liberdade de:
- ✅ Usar comercialmente
- ✅ Modificar o código
- ✅ Distribuir
- ✅ Uso privado
- ✅ Uso em patentes

Com as seguintes condições:
- 📋 Incluir uma cópia da licença e avisos de copyright
- 📋 Indicar mudanças significativas feitas no código
- 📋 Incluir um arquivo NOTICE se o projeto original contiver um

## ⚠️ Aviso Importante

### Segurança e Responsabilidade

Esta extensão foi desenvolvida como uma ferramenta de uso pessoal e educacional. Embora tenha sido criada com boas práticas em mente, **não passou por auditoria de segurança formal**.

**Recomendações:**
- Use por sua conta e risco
- Revise o código antes de instalar
- Sempre confira os dados preenchidos e o anexo antes de salvar a diária
- Verifique se a política da sua empresa permite extensões que automatizam formulários

**O autor não se responsabiliza por:**
- Problemas de segurança ou vulnerabilidades
- Perda ou corrupção de dados
- Lançamentos incorretos de reembolso
- Incompatibilidades com atualizações futuras do Nota Paraná ou do sistema interno
- Quaisquer danos diretos ou indiretos decorrentes do uso desta extensão

Dito isso, o código é simples, transparente e pode ser revisado por qualquer pessoa com conhecimentos básicos em JavaScript. Encorajamos que você examine o código-fonte antes de utilizar.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

- 🐛 Reportar bugs
- 💡 Sugerir novas funcionalidades
- 🔧 Enviar pull requests
- 📖 Melhorar a documentação

Para contribuir:
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 💬 Suporte

Este é um projeto pessoal e de código aberto. O suporte é fornecido em melhor esforço através da seção de [Issues](https://github.com/fabianofnl/extrator_nfce_notaparana/issues) no GitHub.

## 📌 Observação Importante

Este projeto não constitui meu foco principal no momento, portanto, as respostas a contribuições, dúvidas ou sugestões podem não ocorrer de forma imediata. Ainda assim, 🐛 issues, 💡 sugestões e 🔧 pull requests serão analisados com atenção e seriedade assim que possível. Agradeço pela compreensão, paciência e interesse em colaborar para a evolução deste repositório.

## 🙏 Agradecimentos

- **Comunidade Mozilla** - Pela excelente documentação de WebExtensions
- **Nota Paraná** - Sistema que inspirou a criação desta ferramenta

## 📚 Recursos Adicionais

- [Documentação Mozilla WebExtensions](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions)
- [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Portal Nota Paraná](http://www.notaparana.pr.gov.br/)
