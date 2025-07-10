# Chamados

## Visão Geral

A funcionalidade de chamados do **HelpHub** permite o cadastro, consulta, finalização e gerenciamento de tickets de forma moderna e eficiente.

---

## Estrutura de Arquivos

- **HTML**
  - `04-chamados-listagem.html` — Listagem de chamados abertos e finalizados
  - `04-chamados-cadastro.html` — Cadastro de novos chamados
- **CSS**
  - `04-chamados.css` — Estilos específicos para chamados
- **JavaScript**
  - `04-chamados.js` — Lógica e funcionalidades

---

## Funcionalidades

### Listagem de Chamados

- Tabela para chamados abertos e finalizados
- Coluna "Departamento" presente na listagem
- Paginação
- Pesquisa em tempo real (cliente, protocolo, assunto)
- Filtro visual customizado de departamentos (dropdown com checkboxes) para filtrar chamados abertos e finalizados
- Seleção e ações (Visualizar, Finalizar, Excluir, Reabrir)
- Ordenação por colunas

### Cadastro de Chamado

- Formulário completo para abertura de chamado
- Busca dinâmica de cliente (autocomplete)
- Seleção obrigatória do departamento responsável
- Validação de campos obrigatórios
- Mensagens de feedback
- Visual padronizado com o formulário de clientes

### Ações sobre Chamados

- Visualizar detalhes (incluindo edição do departamento)
- Finalizar chamado (com confirmação)
- Excluir chamado (com confirmação)
- Reabrir chamado finalizado (com confirmação)

### Ordem de Serviço

- Exibe corretamente os campos "Solicitante" e "Departamento" nos detalhes

---

## Estrutura do JavaScript

- Variáveis globais para controle de paginação, seleção e ordenação
- Funções principais:
  - `carregarChamados(status)`, `renderizarChamadosAbertos`, `renderizarChamadosFinalizados`
  - `proximaPaginaChamados`, `paginaAnteriorChamados`, `sortChamados`
  - `abrirDetalhesChamado`, `finalizarChamado`, `excluirChamado`, `reabrirChamado`
  - `configurarPesquisaChamados`, `buscarChamadosPorTermo`, `renderizarResultadosBusca`
  - `configurarFormularioChamado`, `configurarBuscaClienteChamado`, `selecionarClienteChamado`
  - `exibirMensagem`, `formatarData`

---

## Integração com o Backend/API

- **Endpoints:**
  - `GET /chamados`
  - `POST /chamados`
  - `PUT /chamados/{id}/finalizar`
  - `PUT /chamados/{id}`
  - `DELETE /chamados/{id}`
  - `GET /chamados/buscar`
  - `GET /clientes/buscar`

---

## Estilos CSS

- Design moderno e responsivo
- Classes principais: `.modern-table`, `.modern-search`, `.modern-toolbar`, `.modern-pagination`, `.status-badge`

---

## Manutenção

- Para alterar estilos: edite `04-chamados.css`
- Para alterar lógica: edite `04-chamados.js`
- Para alterar estrutura: edite os arquivos HTML

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 