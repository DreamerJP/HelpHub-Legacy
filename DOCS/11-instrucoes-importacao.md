# Importação de Dados via CSV

## Visão Geral

A importação via CSV permite adicionar grandes volumes de dados ao HelpHub de forma rápida e segura, disponível apenas para administradores na interface Database Viewer.

---

## Requisitos do Arquivo CSV

- Codificação UTF-8
- Separador de campos: vírgula (,)
- Primeira linha: cabeçalhos exatos das colunas
- Campos com vírgula: entre aspas duplas (" ")
- Datas: YYYY-MM-DD ou DD/MM/YYYY
- Campos opcionais podem ficar vazios

---

## Validação e Qualidade dos Dados

Antes de importar, verifique:

- Todas as linhas têm o mesmo número de colunas
- Nomes das colunas corretos
- Sem linhas vazias ou parcialmente preenchidas
- Sem quebras de linha indesejadas em campos
- Campos obrigatórios preenchidos
- Datas no formato correto

Ferramenta recomendada: [editcsvonline.com](https://editcsvonline.com/)

---

## Tabelas Suportadas e Colunas

### Clientes
- Obrigatório: `nome`
- Opcionais: id, nome_fantasia, email, telefone, ativo, tipo_cliente, cnpj_cpf, ie_rg, contribuinte_icms, rg_orgao_emissor, nacionalidade, naturalidade, estado_nascimento, data_nascimento, sexo, profissao, estado_civil, inscricao_municipal, cep, rua, numero, complemento, bairro, cidade, estado, pais, notas

### Chamados
- Obrigatórios: `cliente_id`, `descricao`
- Opcionais: id, status, data_abertura, data_fechamento, protocolo, assunto, telefone, solicitante

### Andamentos de Chamados
- Obrigatórios: `chamado_id`, `texto`
- Opcionais: id, data_hora, usuario_id

### Agendamentos
- Obrigatórios: `chamado_id`, `data_agendamento`
- Opcionais: id, data_final_agendamento, observacoes, status

### Usuários
- Obrigatórios: `username`, `password`
- Opcionais: id, role

### Departamentos
- Obrigatório: `nome`
- Opcionais: id, descricao

### Vínculos Usuário-Departamento
- Obrigatórios: `usuario_id`, `departamento_id`

---

## Ordem de Importação Recomendada

A ordem de importação das tabelas agora é numerada e deve ser seguida para evitar erros de integridade. Os arquivos exportados já vêm numerados para facilitar a ordem correta.

Exemplo de campo multiline (notas com quebras de linha e HTML):
```
id,cliente_id,notas
1,2,"<p>Cliente importante.<br />\n<strong>Supervisor Ricardo.</strong></p>"
```

O sistema suporta importação robusta de campos complexos, inclusive multiline e HTML, graças ao uso do PapaParse.

1. clientes
2. notas_clientes
3. chamados
4. chamados_andamentos
5. agendamentos
6. usuarios
7. departamentos
8. usuario_departamento (vínculos)

Tabelas flexíveis: usuarios, configuracoes

---

## Passo a Passo para Importar

1. Acesse como administrador
2. Vá em "Database Viewer"
3. Selecione a tabela desejada
4. Clique em "Importar CSV"
5. Selecione o arquivo e o modo (Anexar/Substituir)
6. Mapeie as colunas e confirme

---

## Exemplos de Modelos CSV

**Clientes**
```
id,nome,email,telefone
1,Empresa X,contato@x.com,(11) 99999-9999
```

**Chamados**
```
cliente_id,descricao,status
1,Erro no sistema,Aberto
```

**Usuários**
```
username,password,role
admin,senha123,admin
```

**Departamentos**
```
id,nome,descricao
1,TI,Tecnologia da Informação
2,Financeiro,Gestão Financeira
```

**Vínculos Usuário-Departamento**
```
usuario_id,departamento_id
1,1
1,2
2,1
```

---

## Resolução de Problemas

- **Formato inválido**: Verifique separador e codificação
- **Coluna ausente**: Adicione conforme requisitos
- **Chave primária duplicada**: Remova coluna id ou use modo Substituir
- **Referência inválida**: Confirme IDs existentes
- **Limite de tamanho**: Reduza o conteúdo do campo

Dicas:
- Faça backup antes de importar
- Teste com poucos registros
- Verifique datas e formatação
- Revise registros após importação

---

Em caso de dúvidas, contate o administrador do sistema ou envie um e-mail para dreamerJPMG@gmail.com.
