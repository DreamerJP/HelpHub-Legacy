# Guia de Importação CSV - HelpHub

Este documento fornece instruções detalhadas sobre como importar dados para o sistema HelpHub usando arquivos CSV. A importação é uma maneira eficiente de adicionar grandes volumes de dados ao sistema sem precisar inserir cada registro manualmente.

## Índice

1. [Introdução](#introdução)
2. [Requisitos de Formato CSV](#requisitos-de-formato-csv)
3. [Validação do Arquivo CSV](#validação-do-arquivo-csv)
4. [Tabelas Suportadas](#tabelas-suportadas)
5. [Ordem de Importação](#ordem-de-importação)
6. [Instruções de Importação](#instruções-de-importação)
7. [Exemplos de Modelos](#exemplos-de-modelos)
8. [Resolução de Problemas](#resolução-de-problemas)

## Introdução

O sistema HelpHub permite importar dados em massa através de arquivos CSV (Comma-Separated Values) para várias tabelas do banco de dados. Esta funcionalidade está disponível apenas para administradores através da interface Database Viewer.

### Vantagens da importação por CSV

- Migração rápida de dados de outros sistemas
- Cadastro em massa de clientes, chamados ou usuários
- Atualização em lote de registros existentes
- Restauração de dados a partir de backups

___

## Requisitos de Formato CSV

Para garantir uma importação bem-sucedida, os arquivos CSV devem seguir estas diretrizes:

- Usar codificação UTF-8
- Usar vírgula (,) como separador de campos
- Primeira linha deve conter os cabeçalhos com nomes exatos das colunas
- Campos com vírgulas devem estar entre aspas duplas (" ")
- Datas devem estar no formato YYYY-MM-DD ou DD/MM/YYYY
- Campos vazios são permitidos para campos opcionais

Exemplo de formato válido:
```
id,nome,email,telefone
1,"Silva, João",joao@exemplo.com,(47) 99999-9999
2,Maria Souza,maria@exemplo.com,(11) 88888-8888
```

___

## Validação do Arquivo CSV

### ⚠️ Verificação Pré-Importação

Antes de importar qualquer arquivo CSV, é crucial realizar uma verificação minuciosa dos dados para evitar erros comuns:

1. **Estrutura do Arquivo**
   - Verifique se todas as linhas têm o mesmo número de colunas
   - Certifique-se de que os nomes das colunas correspondem exatamente aos esperados
   - Confirme se não há linhas vazias ou parcialmente preenchidas

2. **Qualidade dos Dados**
   - Procure por quebras de linha indesejadas dentro dos campos
   - Verifique se campos obrigatórios não estão vazios
   - Confirme se os formatos de data estão corretos
   - Certifique-se que textos longos não contêm caracteres especiais problemáticos

3. **Ferramentas Recomendadas para Análise**

Para facilitar a verificação dos arquivos CSV, recomendamos esta ferramentas gratuita:

https://editcsvonline.com/

4. **Lista de Verificação**

- ✅ O arquivo está em formato UTF-8?
- ✅ Todas as colunas obrigatórias estão presentes?
- ✅ Não há quebras de linha dentro dos campos?
- ✅ Os delimitadores (vírgulas) estão corretos?
- ✅ Campos com vírgulas estão entre aspas?
- ✅ Não há células vazias em campos obrigatórios?
- ✅ As datas estão no formato correto?
- ✅ Os IDs referenciados existem no sistema?

### Exemplo de Problemas Comuns

```
❌ CSV com Problemas:
nome,endereco,telefone
"João Silva","Rua das Flores
123, Centro","(11)99999-9999"
"Maria Santos",,"(21)88888-8888"

✅ CSV Correto:
nome,endereco,telefone
"João Silva","Rua das Flores 123, Centro","(11)99999-9999"
"Maria Santos","Não informado","(21)88888-8888"
```

### Recomendações para Correção

1. **Quebras de Linha**
   - Abra o arquivo em um editor de texto avançado
   - Procure e substitua quebras de linha dentro dos campos
   - Una linhas quebradas incorretamente

2. **Dados Vazios**
   - Preencha campos vazios com "Não informado" ou valor apropriado
   - Remova linhas completamente vazias
   - Verifique campos obrigatórios

3. **Formatação de Texto**
   - Remova formatações especiais (negrito, itálico, etc.)
   - Corrija caracteres especiais mal codificados
   - Normalize espaços em branco extras

___

## Tabelas Suportadas

### Clientes

A tabela de clientes é a principal para cadastro de informações de contato.

#### Colunas obrigatórias:
- `nome` - Nome completo ou razão social

#### Colunas opcionais:
- `id` - Identificador único (se não fornecido, será gerado automaticamente)
- `nome_fantasia` - Nome comercial ou fantasia
- `email` - Endereço de e-mail
- `telefone` - Número de telefone
- `ativo` - Status do cliente (Sim/Não)
- `tipo_cliente` - Pessoa Física ou Comercial
- `cnpj_cpf` - CNPJ ou CPF
- `ie_rg` - Inscrição Estadual ou RG
- `contribuinte_icms` - Se é contribuinte de ICMS (Sim/Não/Isento)
- `rg_orgao_emissor` - Órgão emissor do RG
- `nacionalidade` - Nacionalidade do cliente
- `naturalidade` - Naturalidade do cliente
- `estado_nascimento` - Estado de nascimento
- `data_nascimento` - Data de nascimento
- `sexo` - Gênero
- `profissao` - Profissão
- `estado_civil` - Estado civil
- `inscricao_municipal` - Número de inscrição municipal
- `cep` - CEP
- `rua` - Logradouro
- `numero` - Número do endereço
- `complemento` - Complemento do endereço
- `bairro` - Bairro
- `cidade` - Cidade
- `estado` - Estado (UF)
- `pais` - País
- `notas` - Observações adicionais sobre o cliente

### Chamados

A tabela de chamados permite importar registros de atendimento.

#### Colunas obrigatórias:
- `cliente_id` - ID do cliente já cadastrado no sistema
- `descricao` - Descrição do problema ou solicitação

#### Colunas opcionais:
- `id` - Identificador único (se não fornecido, será gerado automaticamente)
- `status` - Status do chamado (padrão: "Aberto")
- `data_abertura` - Data e hora de abertura (padrão: data/hora atual)
- `data_fechamento` - Data e hora de fechamento (apenas para chamados finalizados)
- `protocolo` - Número de protocolo (gerado automaticamente se não fornecido)
- `assunto` - Assunto ou título do chamado
- `telefone` - Telefone de contato para este chamado específico
- `solicitante` - Nome da pessoa que solicitou o chamado

### Andamentos de Chamados

Permite importar histórico de andamentos para chamados existentes.

#### Colunas obrigatórias:
- `chamado_id` - ID do chamado já cadastrado
- `texto` - Texto do andamento

#### Colunas opcionais:
- `id` - Identificador único (se não fornecido, será gerado automaticamente)
- `data_hora` - Data e hora do andamento (padrão: data/hora atual)

### Agendamentos

Permite importar visitas técnicas agendadas.

#### Colunas obrigatórias:
- `chamado_id` - ID do chamado existente
- `data_agendamento` - Data e hora inicial do agendamento

#### Colunas opcionais:
- `id` - Identificador único (se não fornecido, será gerado automaticamente)
- `data_final_agendamento` - Data e hora final (padrão: data inicial + 1h)
- `observacoes` - Observações sobre o agendamento
- `status` - Status do agendamento (padrão: "Aberto")

### Usuários

**Nota: A importação de usuários requer atenção especial às questões de segurança.**

#### Colunas obrigatórias:
- `username` - Nome de usuário único
- `password` - Senha (será automaticamente criptografada)

#### Colunas opcionais:
- `id` - Identificador único (se não fornecido, será gerado automaticamente)
- `role` - Papel do usuário no sistema (admin/guest, padrão: guest)

___

## Ordem de Importação

### ⚠️ IMPORTANTE: A ordem de importação dos dados é crítica para o funcionamento correto do sistema

O HelpHub utiliza um sistema de relacionamento entre tabelas, onde alguns registros dependem da existência prévia de outros. Por isso, é fundamental seguir a ordem correta de importação para evitar erros e inconsistências nos dados.

### Sequência Obrigatória de Importação

| Ordem | Tabela | Dependências | Motivo |
|-------|--------|--------------|---------|
| 1️⃣ | **clientes** | Nenhuma | Tabela base que contém os dados dos clientes. Deve ser importada primeiro pois outras tabelas dependem da existência dos clientes. |
| 2️⃣ | **notas_clientes** | clientes | Contém as anotações vinculadas aos clientes. Requer que os clientes já existam no sistema. |
| 3️⃣ | **chamados** | clientes | Registros de chamados que são vinculados aos clientes através do campo `cliente_id`. Os clientes referenciados precisam existir. |
| 4️⃣ | **chamados_andamentos** | chamados | Histórico de atualizações dos chamados. Requer que os chamados referenciados já existam no sistema. |
| 5️⃣ | **agendamentos** | chamados | Agendamentos de visitas técnicas vinculados aos chamados. Requer que os chamados existam. |

### Tabelas com Importação Flexível

As seguintes tabelas podem ser importadas em qualquer momento, pois não possuem dependências diretas com outras tabelas:

| Tabela | Descrição |
|--------|-----------|
| **usuarios** | Contas de acesso ao sistema |
| **configuracoes** | Parâmetros de configuração do sistema |

### Exemplo de Erro Comum

Se você tentar importar os dados na ordem incorreta, por exemplo:

❌ **Sequência Incorreta**:
1. Importar chamados primeiro
2. Depois importar os clientes

Você receberá erros porque o sistema não conseguirá vincular os chamados aos clientes que ainda não existem no banco de dados.

### Dicas para Importação

- 📋 Prepare seus arquivos CSV na ordem correta antes de iniciar o processo
- ✅ Faça um backup do banco de dados antes de iniciar as importações
- 🔍 Verifique se todos os IDs de referência existem antes de importar tabelas dependentes
- 📝 Mantenha um registro das importações realizadas

### Resolução de Problemas Comuns

1. **Erro de Chave Estrangeira**
   - Causa: Tentativa de importar registros que referenciam IDs inexistentes
   - Solução: Verifique se a tabela de dependência foi importada primeiro

2. **Dados Duplicados**
   - Causa: Importação repetida da mesma tabela
   - Solução: Use a opção "Substituir" ao invés de "Adicionar" para evitar duplicações

3. **Registros Ausentes**
   - Causa: Falha na importação de tabelas dependentes
   - Solução: Verifique se todos os registros das tabelas base foram importados corretamente

___

## Instruções de Importação

Siga estas etapas para importar dados via CSV:

1. Acesse o sistema como administrador
2. Navegue até "Database Viewer" no menu principal
3. Selecione a tabela desejada na lista de tabelas
4. Clique no botão "Importar CSV"
5. Na janela de importação:
   - Selecione o arquivo CSV
   - Escolha o modo de importação:
     - **Anexar**: adiciona novos registros sem modificar existentes
     - **Substituir**: limpa todos os registros existentes antes de importar
   - Selecione o mapeamento de colunas (CSV para banco de dados)
6. Clique em "Importar" para iniciar o processo
7. Aguarde a conclusão e verifique o relatório de importação

___

## Exemplos de Modelos

Abaixo estão exemplos de arquivos CSV para cada tabela suportada. Você pode usar estes modelos como base para suas importações.

### Exemplo: Clientes

```
id,nome,nome_fantasia,email,telefone,ativo,tipo_cliente,cnpj_cpf,ie_rg,contribuinte_icms,cep,rua,numero,complemento,bairro,cidade,estado,pais
1,Supermercado Bom Preço Ltda,Bom Preço,contato@bompreco.com.br,(11) 3456-7890,Sim,Comercial,12.345.678/0001-90,123.456.789.012,Sim,01234-567,Av. Brasil,1500,Bloco A,Centro,São Paulo,SP,Brasil
2,Maria Silva,,maria.silva@email.com,(21) 98765-4321,Sim,Pessoa Física,123.456.789-01,22.333.444-5,Não,22000-100,Rua das Flores,250,Apto 101,Copacabana,Rio de Janeiro,RJ,Brasil
```

### Exemplo: Chamados

```
cliente_id,descricao,status,data_abertura,assunto,telefone,solicitante
1,Sistema apresenta erro ao emitir relatórios.,Aberto,2023-05-10 14:30:00,Erro em relatórios,(11) 3456-7890,Carlos Andrade
2,Solicito treinamento para novos funcionários.,Aberto,2023-05-11 09:15:00,Treinamento,(21) 98765-4321,Maria Silva
```

### Exemplo: Andamentos de Chamados

```
chamado_id,data_hora,texto
1,2023-05-10 15:20:00,"Realizado primeiro atendimento por telefone. Cliente orientado a reiniciar o sistema."
1,2023-05-11 10:00:00,"Problema persistiu. Agendada visita técnica para amanhã."
2,2023-05-11 11:30:00,"Cliente informado que treinamento será oferecido na próxima semana."
```

### Exemplo: Agendamentos

```
chamado_id,data_agendamento,data_final_agendamento,observacoes,status
1,2023-05-12 14:00:00,2023-05-12 16:00:00,"Levar equipamento de teste",Aberto
2,2023-05-15 09:00:00,2023-05-15 12:00:00,"Treinamento para 5 pessoas",Aberto
```

### Exemplo: Usuários

```
username,password,role
joaosilva,senha123,guest
mariatecnica,senha456,guest
novogerente,gerente789,admin
```

___

## Resolução de Problemas

### Problemas Comuns

#### Erro: "Formato de arquivo inválido"
- **Causa**: O arquivo não está no formato CSV correto
- **Solução**: Verifique se o arquivo usa vírgulas como separadores e está salvo em UTF-8

#### Erro: "Coluna obrigatória ausente"
- **Causa**: Uma coluna necessária não foi incluída no CSV
- **Solução**: Adicione a coluna faltante de acordo com os requisitos da tabela

#### Erro: "Conflito de chave primária"
- **Causa**: Tentativa de importar um registro com ID já existente
- **Solução**: Remova a coluna ID para permitir geração automática ou use o modo "Substituir"

#### Erro: "Referência inválida"
- **Causa**: Referência a um registro que não existe (ex: cliente_id inexistente)
- **Solução**: Verifique se todos os IDs referenciados existem no sistema

#### Erro: "Limite de tamanho excedido"
- **Causa**: Um campo contém mais caracteres do que o permitido
- **Solução**: Reduza o tamanho do conteúdo do campo

### Dicas

1. **Faça backup antes de importar**: Sempre realize um backup do banco de dados antes de grandes importações
2. **Teste com poucos registros**: Importe primeiro um pequeno conjunto de registros para testar
3. **Verifique suas datas**: Certifique-se que as datas estão em formato compatível
4. **Remova formatação especial**: Remova formatações especiais como negrito, itálico, etc.
5. **Verifique após importação**: Sempre verifique alguns registros após a importação para confirmar que foram importados corretamente
