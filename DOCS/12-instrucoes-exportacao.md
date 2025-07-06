# Exportação de Dados

## Visão Geral

O HelpHub oferece funcionalidades de exportação para ordens de serviço e dados do banco, permitindo gerar documentos e extrair informações em diferentes formatos.

---

## Exportação de Ordens de Serviço

### Formatos Disponíveis

- **PDF**: Formato profissional para impressão (A4)
- **PNG/JPG**: Imagem de alta resolução para compartilhamento digital
- **Impressão Direta**: Via navegador

### Como Exportar

1. Acesse a página de **Chamados**
2. Selecione um chamado
3. Clique em **"Ordem de Serviço"**
4. Escolha o formato desejado no modal

### Conteúdo Incluído

- Cabeçalho da empresa
- Número do protocolo e data
- Dados do cliente
- Detalhes do chamado
- Histórico de atendimentos
- Dados do agendamento (se existir)
- Espaço para assinaturas

---

## Database Viewer (Administradores)

### Acesso

- Restrito a usuários com perfil **Admin**
- Acessível via menu "Database Viewer"
- Requer autenticação da sessão atual

### Exportação CSV

1. Acesse Database Viewer
2. Selecione uma tabela
3. (Opcional) Use filtros de pesquisa
4. Clique em **"Exportar CSV"**

### Configurações

- **Delimitador**: Vírgula ou ponto-e-vírgula
- **Codificação**: UTF-8 (padrão)
- **Cabeçalhos**: Incluir nomes das colunas
- **Pré-visualização**: Conferir formatação antes da exportação

---

## Limitações e Recomendações

### Limites Técnicos

- Máximo de **10.000 registros** por exportação
- Limite de arquivo: **10MB**
- Campos BLOB não são incluídos na exportação CSV

### Dicas de Uso

- Utilize filtros para exportações grandes
- Evite exportar tabelas inteiras
- Revise os dados exportados
- Mantenha backup antes de importar dados

### Resolução de Problemas

- **Arquivos grandes**: Use filtros de data e divida em partes
- **Caracteres especiais**: Verifique codificação UTF-8
- **Formato incorreto**: Confirme delimitador e cabeçalhos

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com.
