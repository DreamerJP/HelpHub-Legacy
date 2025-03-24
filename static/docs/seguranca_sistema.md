# Segurança do Sistema
___

Este documento explica como o sistema protege os dados e interações tanto no frontend quanto no backend.

## Autenticação e Sessão
- O sistema utiliza um mecanismo de autenticação com dois níveis de acesso:
  - **Admin:** Acesso completo, incluindo o Database Viewer e gerenciamento de backups.
  - **Guest:** Acesso limitado a funcionalidades essenciais.
- **Sessão Expirada:**  
  - Expira após **8 horas** de inatividade.
  - Aviso é disparado **30 minutos** antes da expiração, permitindo renovação automática.

___

## Permissões e Controle de Acesso
- **Admin:** Acesso a funcionalidades críticas e proteção de dados sensíveis.
- **Guest:** Opera apenas as funcionalidades básicas.
> **Dica:** Essa separação minimiza riscos, garantindo que operações sensíveis sejam restritas a usuários autorizados.

___

## Validações de Segurança
- **Sanitização de Inputs:**  
  - Funções de manipulação de dados aplicam *escape* para evitar injeção de código malicioso.
- **Escape de Outputs:**  
  - Garante que dados renderizados não permitam execução de scripts indesejados.
- **Validação de Formulários:**  
  - Previne o envio de dados em formatos inadequados, reduzindo a superfície de ataque.
> **Nota:** Embora o backend reforce essas práticas usando técnicas como *prepared statements*, o frontend já contribui para a proteção inicial.

___

## Funcionalidades de Segurança
- **Registro de Operações:**  
  - Logs das ações críticas para rastreamento e auditoria.
- **Monitoramento da Atividade:**  
  - Detecta inatividade e exibe avisos antes do encerramento automático da sessão.
> Estas medidas, juntamente com políticas de acesso, garantem um ambiente controlado e seguro.
