```
HelpHub/
│
├── backend/
│   ├── requirements.txt    # Imports necessários para Python
│   ├── app.py              # Código do backend em Flask
│   ├── secret_key          # Chave secreta para assinar e validar sessões e cookies
│   ├── database.db         # Arquivo do banco de dados SQLite
│   ├── start_server.sh     # Comando para iniciar o server com o Gunicorn
│   ├── gunicorn_config.py  # Configuração do servidor Gunicorn
│   ├── dockerfile          # Arquivo para configuração do docker
│   └── static/
│       ├── client-notes.js # Script de notas dos clientes e funções auxiliares
│       ├── db-viewer.html  # Página de visualização/import/export do banco de dados
│       ├── favicon.ico     # Icone
│       ├── index.html      # Página principal
│       ├── login.html      # Página principal de login
│       ├── login-bg.webp   # Fundo da tela de login
│       ├── logo.png        # Favicon
│       ├── script.js       # JavaScript para interação com backend
│       ├── snake.html      # Página do Easter Egg
│       ├── snake.js        # JavaScript do Easter Egg
│       └── styles.css      # Estilos da página
│
└── README.md               # Instruções do projeto
```

Modos de iniciar o servidor:

__________________________
Linux via Gunicorn:

Navegar até o diretorio da aplicação ...\Site HelpHub Chamados\Versão\Front+Backend

#Para garantir que tem permissão de execução
chmod +x start_server.sh

#Inicia o server
./start_server.sh

__________________________
Windows via Flask:

Para windows via python apenas executar o app.py
(Necessário ter instalado os imports do requerimentos.txt)

__________________________
Para Docker offline: 

#Navegue até o diretorio da aplicação
cd "(...)Site HelpHub Chamados\v1.5 Testes\Front+Backend"

#Contrua a imagem
docker build -t helphub:v1.5 .

#Inicia a imagem
docker run -d -p 5000:5000 --name helphub_container helphub:v1.5

__________________________
Para DockerHub online:

Baixar a imagem direto do docker push

docker push dreamerjp/helphub:v1.5

Após iniciar o container, escolher a porta:
docker run -d -p 5000:5000 dreamerjp/helphub:v1.5

__________________________
