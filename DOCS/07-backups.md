# Funcionalidade de Backups

## Visão Geral

A funcionalidade de backups permite o gerenciamento seguro das cópias de segurança do banco de dados do sistema. Inclui backup automático diário, backup manual, configuração de diretório e listagem dos arquivos disponíveis. Apenas administradores têm acesso a esta área.

---

## Arquivos Relacionados

- **HTML:** `07-backups.html` — Página principal de gerenciamento de backups
- **CSS:** `07-backups.css` — Estilos modernos e responsivos para a área de backups
- **JavaScript:** `07-backups.js` — Toda a lógica de listagem, backup manual e configuração

---

## Funcionalidades Implementadas

- Backup automático diário do banco de dados
- Listagem de todos os backups disponíveis
- Backup manual sob demanda
- Configuração do diretório de armazenamento dos backups
- Exibição de informações: total, diretório, data, tamanho
- Mensagens de sucesso e erro
- Permissões: apenas administradores podem acessar e operar

---

## Como Usar

1. **Acesse** a página `07-backups.html` (apenas se for administrador)
2. **Visualize** as informações e a lista de backups disponíveis
3. **Clique em "Realizar Backup Agora"** para criar um backup manual
4. **Altere o diretório** de armazenamento preenchendo o campo e clicando em "Salvar Diretório"
5. **Confira mensagens** de sucesso ou erro na parte inferior da página

---

## Estrutura do JavaScript (`07-backups.js`)

### Funções Principais
- `carregarInfoBackups()` — Busca e exibe todos os backups disponíveis
- `realizarBackupManual()` — Solicita a criação de um novo backup
- `carregarConfiguracoesBackup()` — Busca o diretório atual de backups
- `salvarConfiguracaoBackup(diretorio)` — Salva novo diretório de backups
- Utilitários: `exibirMensagem()`, `showLoading()`, `hideLoading()`

### Eventos
- O JS inicializa automaticamente ao carregar a página
- Botões e formulários já possuem listeners no carregamento

---

## Permissões e Segurança
- Apenas usuários com papel `admin` podem acessar a página e executar ações
- Todas as ações são validadas também no backend
- Backups antigos são removidos automaticamente após 14 dias

---

## Integração com o Backend/API
- **GET `/system/backups`** — Listar backups
- **POST `/system/backup`** — Criar novo backup manual
- **GET `/system/backup-config`** — Buscar diretório atual
- **POST `/system/backup-config`** — Salvar novo diretório

---

## Estilos CSS
- Visual moderno, responsivo, com destaque para ações importantes
- Integração visual com o restante do sistema
- Classes principais: `.modern-table`, `.card`, `.btn-success`, `.btn-info`, etc.

---

## Como Testar

1. **Visualização:**
   - Abra `07-backups.html` e confira a lista de backups
2. **Backup Manual:**
   - Clique em "Realizar Backup Agora" e verifique se aparece na lista
3. **Configuração:**
   - Altere o diretório, salve e confira atualização
4. **Mensagens:**
   - Verifique mensagens de sucesso e erro ao realizar ações

---

## Manutenção
- Para alterar estilos, edite `07-backups.css`
- Para alterar lógica, edite `07-backups.js`
- Para alterar estrutura, edite `07-backups.html`

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com. 