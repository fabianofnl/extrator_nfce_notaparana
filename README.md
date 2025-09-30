# 🧾 Extrator NFCe Nota Paraná

Extensão para Firefox que facilita a extração de dados específicos do extrato de NFCe (Nota Fiscal do Consumidor Eletrônica) do sistema Nota Paraná.

## 📋 Sobre o Projeto

Esta extensão foi desenvolvida como uma ferramenta de uso pessoal para automatizar a extração de informações específicas do extrato da NFCe disponível no portal Nota Paraná. A extensão identifica e extrai 4 campos determinados da página HTML do extrato, apresentando-os de forma organizada através de um popup interativo.

### 🎯 Funcionalidades

- ✅ Extração automática de dados específicos da NFCe
- ✅ Interface intuitiva com popup customizado
- ✅ Processamento local dos dados (sem envio para servidores externos)
- ✅ Campos de extração pré-definidos e otimizados para o Nota Paraná

## 🤖 Desenvolvimento Assistido por IA

Este projeto foi desenvolvido com auxílio significativo de Inteligência Artificial. A estrutura base, arquitetura da extensão e componentes principais foram gerados pelo assistente Claude (Anthropic), sendo posteriormente adaptados e customizados para atender às necessidades específicas de extração de dados da NFCe do Nota Paraná.

### 📊 Análise de Contribuição de Código

Após análise detalhada dos arquivos do projeto, a distribuição de código é:

**Código Gerado por IA (Base):** ~70-75%
- Estrutura completa da extensão (manifest, background, popup base)
- Sistema de storage e comunicação entre componentes
- Interface HTML/CSS do popup e opções
- Arquitetura de mensagens e listeners
- Sistema de estatísticas e configurações

**Código Customizado (Humano):** ~25-30%
- Lógica específica de extração de dados da NFCe (`content.js`)
- Processamento e parsing do DOM da página Nota Paraná
- Validação de configurações (baseUrl, CNPJs)
- Funções de formatação (datas, números, CNPJ)
- Sistema de formulário editável no popup
- Funcionalidade de cópia para clipboard
- Mapeamento de CNPJs para tipos de documento
- Ajustes de interface e mensagens

### 🎯 Detalhamento por Arquivo

| Arquivo | IA Base | Customização | Descrição |
|---------|---------|--------------|-----------|
| **manifest.json** | ~95% | ~5% | Estrutura base, ajustes mínimos |
| **background.js** | ~98% | ~2% | Praticamente inalterado |
| **popup.html** | ~90% | ~10% | Base mantida, ajustes visuais |
| **popup.js** | ~95% | ~5% | Lógica base preservada |
| **options.html** | ~85% | ~15% | Campos customizados |
| **options.js** | ~90% | ~10% | Settings específicos |
| **content.js** | ~40% | ~60% | ⭐ Maior customização |

**Destaque:** O arquivo `content.js` contém a maior parte da lógica personalizada (~60%), incluindo toda a inteligência de extração de dados específicos da NFCe do sistema Nota Paraná.

### 💡 Abordagem Híbrida

Esta abordagem híbrida de desenvolvimento (IA + customização humana) demonstra como ferramentas de IA podem:
- ✅ Acelerar significativamente o desenvolvimento inicial
- ✅ Fornecer uma arquitetura sólida e bem estruturada
- ✅ Implementar boas práticas desde o início
- ✅ Permitir foco total na lógica de negócio específica

O resultado é um código profissional, bem documentado e funcional, com a inteligência de negócio desenvolvida especificamente para o caso de uso real.

## 📦 Instalação

### Pré-requisitos
- Firefox (versão mais recente recomendada)
- Sistema operacional: Linux, Windows ou macOS

### Instalação para Desenvolvimento

1. Clone o repositório:
   ```bash
   git clone https://github.com/fabianofnl/extrator_nfce_notaparana.git
   cd extrator_nfce_notaparana
   ```

2. Abra o Firefox e acesse: `about:debugging`

3. Clique em "Este Firefox"

4. Clique em "Carregar extensão temporária..."

5. Selecione o arquivo `manifest.json` do diretório clonado

### Uso

1. Acesse a página do extrato da NFCe no portal Nota Paraná
2. Clique no ícone da extensão na barra de ferramentas do Firefox
3. Os dados serão extraídos e exibidos no popup automaticamente

## 🔧 Estrutura do Projeto

```
extrator_nfce_notaparana/
├── manifest.json          # Configuração da extensão
├── popup.html             # Interface do popup
├── popup.js               # Lógica do popup
├── content.js             # Script de extração de dados
├── background.js          # Script de background
├── options.html           # Página de configurações
├── options.js             # Lógica das configurações
└── icons/                 # Ícones da extensão
```

## 🛠️ Personalização

A extensão foi projetada para extrair campos específicos da NFCe. Se você deseja adaptá-la para outros campos ou sistemas:

1. **Modifique `content.js`**: Altere os seletores e lógica de extração
2. **Ajuste `popup.html`**: Adapte a interface para exibir seus dados
3. **Atualize `manifest.json`**: Configure permissões conforme necessário

Sinta-se à vontade para fazer fork do projeto e adaptá-lo às suas necessidades!

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
- Não use em ambientes de produção críticos sem validação adequada
- Teste em ambiente controlado antes do uso regular

**O autor não se responsabiliza por:**
- Problemas de segurança ou vulnerabilidades
- Perda ou corrupção de dados
- Problemas de desempenho
- Incompatibilidades com atualizações futuras do sistema Nota Paraná
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

- **Claude (Anthropic)** - Pela assistência na geração da estrutura base e grande parte do código
- **Comunidade Mozilla** - Pela excelente documentação de WebExtensions
- **Nota Paraná** - Sistema que inspirou a criação desta ferramenta

## 📚 Recursos Adicionais

- [Documentação Mozilla WebExtensions](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Portal Nota Paraná](http://www.notaparana.pr.gov.br/)

---

**Desenvolvido com 🤖 IA + 👨‍💻 Customização Humana**

*Este projeto é um exemplo de como ferramentas de IA podem acelerar o desenvolvimento de software, mantendo espaço para personalização e criatividade humana.*