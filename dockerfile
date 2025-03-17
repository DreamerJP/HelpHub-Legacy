FROM python:alpine

WORKDIR /app

# Instala as dependências necessárias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cria os diretórios necessários
RUN mkdir -p /app/logs /app/backups

# Copia os arquivos do projeto para o container
COPY . .

# Torna o script de inicialização executável
RUN chmod +x start_server.sh

# Expõe a porta 5000 que é usada pelo Gunicorn
EXPOSE 5000

# Comando para iniciar a aplicação usando Gunicorn
CMD ["gunicorn", "-c", "gunicorn_config.py", "app:app"]
