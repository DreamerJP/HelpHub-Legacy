# URLs Amigáveis (Friendly URLs)

## Visão Geral

O sistema HelpHub utiliza URLs amigáveis para navegação entre páginas, tornando os endereços mais limpos, profissionais e fáceis de lembrar. Isso melhora a experiência do usuário e facilita a manutenção do sistema.

---

## O que são URLs Amigáveis?

URLs amigáveis ocultam os nomes reais dos arquivos HTML e apresentam rotas curtas e descritivas, como `/p/home`, `/p/clientes`, `/p/chamados`, etc.

**Exemplo:**
- Antes: `/html/02-home.html`
- Agora: `/p/home`

---

## Mapeamento de URLs

| URL Amigável      | Página HTML Correspondente         | Descrição                       |
|-------------------|------------------------------------|----------------------------------|
| `/p/login`        | `01-login.html`                    | Tela de login                    |
| `/p/home`         | `02-home.html`                     | Página inicial (dashboard)       |
| `/p/clientes`     | `03-clientes-listagem.html`         | Listagem de clientes             |
| `/p/clientes-cadastro` | `03-clientes-cadastro.html`     | Cadastro de clientes             |
| `/p/clientes-detalhes` | `03-clientes-detalhes.html`     | Detalhes do cliente              |
| `/p/clientes-edicao`   | `03-clientes-edicao.html`       | Edição de cliente                |
| `/p/clientes-notas`    | `03-clientes-notas.html`        | Notas do cliente                 |
| `/p/chamados`     | `04-chamados-listagem.html`         | Listagem de chamados             |
| `/p/chamados-cadastro` | `04-chamados-cadastro.html`     | Cadastro de chamados             |
| `/p/agenda`       | `05-agenda.html`                   | Agenda                           |
| `/p/admin`        | `06-admin.html`                    | Administração de usuários        |
| `/p/backups`      | `07-backups.html`                  | Gerenciamento de backups         |
| `/p/db-viewer`    | `08-db-viewer.html`                | Visualizador de banco de dados   |
| `/p/help`         | `09-help.html`                     | Central de ajuda                 |
| `/p/snake`        | `10-snake.html`                    | Jogo Snake (easter egg)          |
| `/p/logs`         | `12-logs.html`                     | Visualização de logs             |

---

## Como funciona

- O backend Flask faz o mapeamento das rotas amigáveis para os arquivos HTML reais.
- O prefixo `/p/` diferencia as páginas HTML das rotas de API (ex: `/clientes` para API, `/p/clientes` para página).
- O frontend (navbar, botões, redirecionamentos) utiliza sempre as URLs amigáveis.

---

## Vantagens

- **URLs limpas:** Mais fáceis de digitar e compartilhar.
- **Segurança:** Não expõe a estrutura de arquivos do sistema.
- **Flexibilidade:** Mudanças nos nomes dos arquivos não afetam os links do sistema.
- **SEO e Profissionalismo:** Endereços mais amigáveis para usuários e buscadores.

---

## Dicas e Manutenção

- Para adicionar uma nova página amigável, basta:
  1. Criar o arquivo HTML correspondente em `HTML/`.
  2. Adicionar o mapeamento no dicionário `PAGE_MAPPING` do `app.py`.
  3. Atualizar os links do frontend, se necessário.
- URLs antigas (diretas para arquivos HTML) ainda funcionam, mas o recomendado é sempre usar as URLs amigáveis.

---

## Exemplos de Uso

- Acesse `/p/home` para ir ao dashboard.
- Use `/p/clientes` para ver a lista de clientes.
- Redirecionamentos automáticos (login/logout) já utilizam as URLs amigáveis.

---

Em caso de dúvidas, consulte a Central de Ajuda ou contate o administrador do sistema. 