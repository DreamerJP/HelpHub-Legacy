# Gerenciamento de Usuários

## Visão Geral

A funcionalidade de administração do **HelpHub** permite o gerenciamento completo dos usuários do sistema: cadastro, edição, exclusão, definição de permissões e visualização de informações. Apenas administradores têm acesso a esta área.

---

## Arquivos Relacionados

- **HTML:** `06-admin.html` — Página principal da administração de usuários
- **CSS:** `06-admin.css` — Estilos modernos e responsivos para a área de administração
- **JavaScript:** `06-admin.js` — Toda a lógica de gerenciamento de usuários

---

## Funcionalidades

- Listar todos os usuários do sistema
- Cadastrar novo usuário (username, senha, tipo)
- Editar dados de usuário existente
- Excluir usuário (exceto o admin principal)
- Modal para cadastro/edição
- Seleção visual de usuário na tabela
- Permissões: apenas administradores podem acessar e modificar usuários

---

## Estrutura do JavaScript

- Funções principais:
  - `carregarUsuarios()`, `abrirModalNovoUsuario()`, `salvarUsuario()`, `editarUsuarioSelecionado()`, `editarUsuario(id)`, `excluirUsuarioSelecionado()`, `excluirUsuario(id)`
  - Utilitários: `exibirMensagem()`, `showLoading()`, `hideLoading()`, `sanitizeInput()`
- Variáveis globais: `selectedUserId`, `selectedUsername`
- Eventos: inicialização automática ao carregar a página, botões com listeners inline

---

## Permissões e Segurança

- Apenas usuários com papel `admin` podem acessar a página e executar ações
- O usuário `admin` principal não pode ser excluído
- Todas as ações são validadas também no backend

---

## Integração com o Backend/API

- **Endpoints:**
  - `GET /usuarios`
  - `POST /usuarios`
  - `PUT /usuarios/{id}`
  - `DELETE /usuarios/{id}`
  - `GET /usuarios/{id}`

---

## Estilos CSS

- Visual moderno, responsivo, com destaque para seleção e ações
- Integração visual com o restante do sistema
- Classes principais: `.modern-table`, `.modern-toolbar`, `.modal-content`, `.btn-success`, `.btn-info`, `.btn-danger`, etc.

---

## Manutenção

- Para alterar estilos: edite `06-admin.css`
- Para alterar lógica: edite `06-admin.js`
- Para alterar estrutura: edite `06-admin.html`

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com.
