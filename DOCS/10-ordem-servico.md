# Ordem de Serviço

## Visão Geral

A funcionalidade de Ordem de Serviço do HelpHub permite visualizar, imprimir e exportar documentos completos de atendimento técnico, reunindo informações do chamado, cliente, histórico e agendamento. Disponível para usuários autorizados na área de chamados.

---

## Funcionalidades

- Visualização detalhada em modal responsivo
- Impressão direta do documento
- Exportação em PDF e imagem (PNG)
- Exibição de dados completos: chamado, cliente, agendamento, histórico e relatório técnico

---

## Como Utilizar

1. Acesse a página de **Chamados**
2. Selecione um chamado na lista
3. Clique em **"Ordem de Serviço"** na barra de ferramentas
4. O modal será aberto com todas as informações
5. Use os botões para imprimir, exportar PDF ou imagem

---

## Design e Usabilidade

- Layout moderno, limpo e responsivo
- Timeline visual dos andamentos
- Otimizado para desktop, tablet e mobile
- Estilos específicos para impressão

---

## Requisitos Técnicos

- Backend: Python Flask
  - Endpoints: 
    - `GET /chamados/<id>/ordem-servico`
    - `GET /chamados/<id>/ordem-servico/pdf`
    - `GET /chamados/<id>/ordem-servico/imagem`
  - Dependências: `reportlab`, `Pillow`, `selenium`
- Frontend: HTML, CSS, JavaScript
  - Arquivos: `04-chamados-listagem.html`, `04-chamados.js`, `04-chamados.css`

---

## Segurança

- Apenas usuários autenticados podem acessar
- Permissões controladas por perfil (admin/guest)
- Dados validados e protegidos contra XSS

---

## Manutenção e Suporte

- Para alterar estilos: edite `04-chamados.css`
- Para lógica: edite `04-chamados.js`
- Para estrutura: edite `04-chamados-listagem.html`
- Consulte os logs em caso de erro: `HelpHub/LOGS/error.log`
- Teste endpoints conforme necessário

---

## Resolução de Problemas

- **PDF não gera**: Verifique dependências e logs
- **Imagem não captura**: Confirme instalação do Chrome e driver Selenium
- **Modal não abre**: Verifique erros de JavaScript e compatibilidade do Bootstrap

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 