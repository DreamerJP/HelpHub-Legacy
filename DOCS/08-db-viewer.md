# Database Viewer (Visualizador do Banco de Dados)

## Visão Geral

O Database Viewer permite que administradores visualizem, filtrem, exportem e importem dados de todas as tabelas do banco de dados do sistema de forma segura e centralizada.

---

## Arquivos Relacionados

- **HTML:** `08-db-viewer.html` — Página principal do visualizador de banco de dados
- **CSS:** `08-db-viewer.css` — Estilos modernos e responsivos para a área do viewer
- **JavaScript:** `08-db-viewer.js` — Toda a lógica de listagem, visualização, exportação, importação e permissões

---

## Funcionalidades Implementadas

- Visualização de estatísticas gerais do banco (tamanho, tabelas, última atualização)
- Listagem e seleção de todas as tabelas do banco
- Visualização dos dados da tabela selecionada
- Filtro de registros em tempo real
- Exportação de dados (CSV)
- Importação de dados (CSV/Excel)
- Mensagens de sucesso e erro
- Permissões: apenas administradores podem acessar e operar
- As tabelas são exibidas na ordem recomendada de importação, com numeração, facilitando a importação correta dos dados.
- Ao exportar tabelas, o nome do arquivo inclui a numeração para facilitar a ordenação no Windows.
- A importação de CSV suporta campos com múltiplas linhas e HTML (ex: notas de clientes), graças ao uso do PapaParse.

---

## Como Usar

1. **Acesse** a página `08-db-viewer.html` (apenas se for administrador)
2. **Visualize** as estatísticas gerais do banco
3. **Selecione** uma tabela para visualizar seus dados
4. **Filtre** registros usando o campo de filtro
5. **Exporte** dados clicando em "Exportar"
6. **Importe** dados clicando em "Importar" e selecionando um arquivo
7. **Confira mensagens** de sucesso ou erro na parte inferior da página

---

## Estrutura do JavaScript (`08-db-viewer.js`)

### Funções Principais
- `checkAdminRole()` — Garante que apenas administradores acessem a página
- `carregarEstatisticasBanco()` — Busca e exibe estatísticas gerais do banco
- `carregarTabelas()` — Lista todas as tabelas disponíveis
- `carregarTabelaSelecionada()` — Busca e exibe dados da tabela selecionada
- `renderizarTabela(colunas, registros)` — Renderiza os dados na tabela
- `filtrarTabela()` — Filtra registros em tempo real
- `exportarTabela(formato)` — Exporta dados da tabela (CSV)
- `importarArquivo(e)` — Importa dados para a tabela selecionada
- Utilitários: `exibirMensagem()`, `showLoading()`, `hideLoading()`

### Eventos
- O JS inicializa automaticamente ao carregar a página
- Botões e campos já possuem listeners no carregamento

---

## Permissões e Segurança
- Apenas usuários com papel `admin` podem acessar a página e executar ações
- Todas as ações são validadas também no backend
- Importação pode substituir dados existentes (atenção ao modo de importação)

---

## Integração com o Backend/API
- **GET `/admin/database/stats`** — Estatísticas gerais do banco
- **GET `/admin/database/tables`** — Listar tabelas
- **GET `/admin/database/tables/{tabela}/data`** — Dados da tabela
- **GET `/admin/database/tables/{tabela}/export?formato=csv`** — Exportar dados
- **POST `/admin/database/tables/{tabela}/import`** — Importar dados

---

## Estilos CSS
- Visual moderno, responsivo, com destaque para ações importantes
- Integração visual com o restante do sistema
- Classes principais: `.database-stats`, `.card`, `.btn-info`, `.btn-success`, etc.

---

## Como Testar

1. **Visualização:**
   - Abra `08-db-viewer.html` e confira estatísticas e tabelas
2. **Seleção:**
   - Selecione uma tabela e visualize os dados
3. **Filtro:**
   - Use o campo de filtro para buscar registros
4. **Exportação:**
   - Clique em "Exportar" e baixe o arquivo CSV
5. **Importação:**
   - Clique em "Importar", selecione um arquivo e confira atualização
6. **Mensagens:**
   - Verifique mensagens de sucesso e erro ao realizar ações

---

## Manutenção
- Para alterar estilos, edite `08-db-viewer.css`
- Para alterar lógica, edite `08-db-viewer.js`
- Para alterar estrutura, edite `08-db-viewer.html`

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 