# Clientes

## Visão Geral

A funcionalidade de clientes do **HelpHub** permite o cadastro, consulta e gerenciamento de clientes de forma moderna e eficiente.

---

## Estrutura de Arquivos

- **HTML**
  - `03-clientes-listagem.html` — Listagem e gerenciamento de clientes
  - `03-clientes-cadastro.html` — Cadastro de novos clientes
- **CSS**
  - `03-clientes.css` — Estilos específicos para clientes
- **JavaScript**
  - `03-clientes.js` — Lógica e funcionalidades

---

## Funcionalidades

### Listagem de Clientes

- Tabela responsiva
- Pesquisa em tempo real (nome, ID, e-mail)
- Paginação
- Seleção e ações (Visualizar, Excluir)
- Ordenação por colunas

### Cadastro de Clientes

- Formulário completo (dados e endereço)
- Busca automática de CEP (ViaCEP)
- Validação de campos obrigatórios
- Campos para dados pessoais e empresariais

---

## Principais Campos

- **Dados do Cliente:** Razão Social/Nome, Nome Fantasia, E-mail, Telefone, Status, Tipo, CNPJ/CPF, IE/RG, Contribuinte ICMS, nacionalidade, naturalidade etc.
- **Endereço:** CEP, Rua, Número, Complemento, Bairro, Cidade, Estado, País

---

## Estilos CSS

- Design moderno e responsivo
- Animações suaves
- Componentes reutilizáveis
- Tema consistente

Principais classes:
- `.modern-table`, `.modern-search`, `.modern-toolbar`, `.modern-pagination`, `.cliente-form-container`

---

## JavaScript

- Carregamento e renderização de clientes
- Pesquisa, filtragem e paginação
- Cadastro e exclusão
- Busca de CEP
- Validação de formulários

Funções importantes:
- `carregarClientesPage()`, `carregarClientes()`, `renderizarClientes()`, `configurarPesquisaClientes()`, `cadastrarCliente()`, `buscarCep()`

---

## Integração com o Sistema

- **APIs utilizadas:** ViaCEP (CEP), API interna (CRUD)
- **Endpoints:**
  - `GET /clientes`
  - `POST /clientes`
  - `GET /clientes/{id}`
  - `PUT /clientes/{id}`
  - `DELETE /clientes/{id}`

- **Dependências:** Bootstrap 5.3.0, Bootstrap Icons, Fetch API

---

## Manutenção

- Para modificar estilos: edite `03-clientes.css`
- Para modificar funcionalidades: edite `03-clientes.js`
- Para modificar estrutura: edite os arquivos HTML

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 