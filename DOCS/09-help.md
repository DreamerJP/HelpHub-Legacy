# Central de Ajuda (Help)

## Visão Geral

A Central de Ajuda oferece uma navegação fácil por tópicos de documentação do sistema, com busca, exibição de markdown e destaque de código. É acessível a todos os usuários e serve como referência rápida para dúvidas e instruções.

---

## Arquivos Relacionados

- **HTML:** `09-help.html` — Página principal da central de ajuda
- **CSS:** `09-help.css` — Estilos modernos e responsivos para a central
- **JavaScript:** `09-help.js` — Lógica de busca, navegação, renderização de markdown e mensagens
- **Markdown:** Arquivos em `DOCS/` (um para cada tópico)

---

## Funcionalidades Implementadas

- Lista de tópicos de ajuda (sidebar)
- Busca/filtro de tópicos em tempo real
- Navegação e seleção de tópicos
- Carregamento e renderização de arquivos markdown
- Destaque automático de código (Highlight.js)
- Mensagens de erro e feedback
- Totalmente responsivo

---

## Como Usar

1. **Acesse** a página `09-help.html`
2. **Busque** um tópico usando o campo de busca
3. **Clique** em um tópico para visualizar o conteúdo
4. **Leia** o conteúdo renderizado em markdown, com exemplos e código destacados
5. **Confira mensagens** de erro ou sucesso na parte inferior da página

---

## Estrutura do JavaScript (`09-help.js`)

### Funções Principais
- `carregarTopicos()` — Carrega a lista de tópicos na sidebar
- `filtrarTopicos()` — Filtra tópicos conforme busca
- `selecionarTopico(idx)` — Seleciona e carrega um tópico
- `carregarMarkdown(file)` — Busca e renderiza markdown
- Utilitários: `exibirMensagem()`, `showLoading()`, `hideLoading()`

### Eventos
- O JS inicializa automaticamente ao carregar a página
- Busca e navegação já possuem listeners no carregamento

---

## Integração e Dicas
- Os arquivos markdown devem estar na pasta `DOCS/` e serem referenciados em `09-help.js`
- Para adicionar novos tópicos, basta criar o arquivo `.md` e adicionar à lista `TOPICOS_AJUDA`
- O carregamento de arquivos markdown usa `fetch`, que **só funciona via servidor web** (http/https)

### Importante: Evite erro "Failed to fetch"
- **Não abra o HTML diretamente pelo navegador** (file://)
- Sempre acesse via `http://localhost:...` rodando um servidor web local
- Exemplos de servidores: Python (`python -m http.server`), Node.js (`http-server`), backend próprio

---

## Estilos CSS
- Visual moderno, responsivo, sidebar fixa, destaque de busca
- Integração visual com o restante do sistema
- Classes principais: `.help-container`, `.sidebar`, `.topic-list`, `.markdown-content`, etc.

---

## Como Testar

1. **Visualização:**
   - Abra `09-help.html` via servidor web e confira a lista de tópicos
2. **Busca:**
   - Digite no campo de busca e veja o filtro em tempo real
3. **Navegação:**
   - Clique em diferentes tópicos e confira o conteúdo
4. **Markdown:**
   - Verifique renderização correta e destaque de código
5. **Mensagens:**
   - Veja mensagens de erro ao tentar acessar arquivos inexistentes

---

## Manutenção
- Para alterar estilos, edite `09-help.css`
- Para alterar lógica, edite `09-help.js`
- Para alterar estrutura, edite `09-help.html`
- Para adicionar tópicos, edite a lista em `09-help.js` e crie o markdown correspondente

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 