# Agenda

## Visão Geral

A funcionalidade de agenda do **HelpHub** permite o gerenciamento visual de agendamentos de visitas técnicas, integrando calendário, cadastro, edição, exclusão e visualização de detalhes.

---

## Estrutura de Arquivos

- **HTML**
  - `05-agenda.html` — Página principal da agenda com calendário e modais
- **CSS**
  - `05-agenda.css` — Estilos modernos para calendário, modais e botões
- **JavaScript**
  - `05-agenda.js` — Toda a lógica de exibição, cadastro, busca, integração e tooltips

---

## Funcionalidades

### Visualização de Agenda

- Calendário interativo (FullCalendar)
- Visualização mensal, semanal e diária
- Tooltips com detalhes do agendamento
- Cores diferentes para status (aberto/finalizado)

### Cadastro de Agendamento

- Modal para novo agendamento
- Busca dinâmica de chamados para vincular
- Seleção de datas e horários
- Campo de observações
- Validação de campos obrigatórios

### Detalhes e Edição

- Modal de detalhes do agendamento
- Visualização de todos os dados do agendamento
- Campo para relatório da visita
- Botão para exclusão do agendamento

### Exclusão de Agendamento

- Confirmação antes de excluir
- Atualização automática do calendário

---

## Estrutura do JavaScript

- Funções principais:
  - `configurarCalendario()`, `carregarAgendamentos()`, `abrirModalAgendamento()`, `salvarAgendamento()`
  - `abrirModalDetalhesAgendamento()`, `excluirAgendamentoModal()`, `configurarBuscaChamadosAgendamento()`
  - `formatarTooltipAgendamento()`, `exibirMensagem()`, `formatarData()`
- Variáveis globais:
  - `currentAgendamentoId` — ID do agendamento em edição/detalhe

---

## Integração com o Backend/API

- **Endpoints:**
  - `GET /agendamentos`
  - `POST /agendamentos`
  - `DELETE /agendamentos/{id}`
  - `GET /chamados/buscar`

---

## Estilos CSS

- Design moderno, responsivo, com gradientes e animações
- Integração visual com o restante do sistema
- Classes principais: `#calendario`, `.agenda-tooltip`, `.modal-content`, `.btn-primary`, etc.

---

## Manutenção

- Para alterar estilos: edite `05-agenda.css`
- Para alterar lógica: edite `05-agenda.js`
- Para alterar estrutura: edite `05-agenda.html`

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 