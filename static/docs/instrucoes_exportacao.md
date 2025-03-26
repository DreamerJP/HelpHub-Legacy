# Guia de Exportação do Sistema
___

## Exportação de Ordens de Serviço

### Formatos Disponíveis
1. **PDF**  
   - *Formato profissional para impressão*  
   - Configurações de página **A4**  
   - Marca d'água com **logo da empresa**
2. **PNG/JPG**  
   - Alta resolução para visualização digital  
   - Compressão otimizada para compartilhamento  
   - Ideal para envio por email ou mensagem

___

### Como Exportar uma Ordem de Serviço
1. Abra o chamado desejado  
2. Clique em **"Gerar Ordem de Serviço"**  
3. No modal que abrir, escolha uma das opções:
   - **Exportar como PDF**
   - **Exportar como PNG**
   - **Exportar como JPG**
   - **Imprimir** (impressão direta via `window.print()`)

___

### Conteúdo da Ordem de Serviço
- **Cabeçalho da empresa:** nome, endereço, contatos  
- **Número do protocolo e data atual**
- **Dados do cliente:** (quando disponível)
- **Detalhes do chamado**
- **Histórico de atendimentos:** em ordem cronológica  
- **Dados do agendamento:** (quando existir)
- **Espaço para assinaturas**

___

## Database Viewer (Administradores)

### Acesso
- Restrito a usuários com perfil **Admin**  
- Acessível via menu "Database Viewer"  
- Requer autenticação da sessão atual

### Recursos do Exportador
1. **Exportação CSV**
   - Seleção de tabelas individuais  
   - Filtros por campo  
   - Ordenação personalizada

### Como Exportar do Database Viewer
1. Acesse Database Viewer  
2. Selecione uma tabela  
3. (Opcional) Use filtros de pesquisa  
4. Clique em **"Exportar CSV"**

___

### Configurações Disponíveis
| Configuração            | Detalhes                                                                                     |
|-------------------------|----------------------------------------------------------------------------------------------|
| **Delimitador**         | Vírgula ou ponto-e-vírgula. Selecione conforme a configuração do seu CSV.                   |
| **Codificação**         | UTF-8 (padrão) – garante a correta exibição de caracteres especiais.                         |
| **Cabeçalhos**          | Se ativado, a primeira linha do arquivo contém os nomes das colunas.                         |
| **Pré-visualização**    | Exibe as primeiras linhas para conferir a formatação antes da exportação.                    |

> **Observação:** Certifique-se de revisar as configurações antes de proceder com a exportação para evitar inconsistências.

___

## Limitações Técnicas

**Limites Implementados:**
- Máximo de **10.000 registros** por exportação.
- Limite de arquivo: **10MB**.
- Campos *BLOB* não são incluídos na exportação CSV.

**Recomendações de Uso:**
- Utilize filtros para exportações grandes.
- Evite exportar tabelas inteiras.
- Revise os dados exportados.
- Mantenha um backup antes de importar dados.

**Problemas Comuns:**
1. **Arquivos Grandes:**  
   - Use filtros de data, divida em partes e exporte apenas as colunas necessárias.
