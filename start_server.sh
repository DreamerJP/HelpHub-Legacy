#!/bin/bash

echo "=== HelpHub Server Startup ==="

# Cria diretório de logs se não existir
mkdir -p logs

# Verifica se o pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "Erro: pip3 não está instalado. Por favor, instale-o primeiro."
    echo "Tente: sudo apt install python3-pip"
    exit 1
fi

# Instala as dependências do arquivo requirements.txt
echo "Instalando dependências..."
pip3 install -r requirements.txt

# Verifica se o Gunicorn está instalado
if ! command -v gunicorn &> /dev/null; then
    echo "Gunicorn não está instalado. Tentando instalar..."
    pip3 install gunicorn
    if [ $? -ne 0 ]; then
        echo "Erro ao instalar Gunicorn. Verifique sua conexão e permissões."
        exit 1
    fi
fi

echo "==========================================="
echo "Iniciando servidor HelpHub com Gunicorn..."
echo "==========================================="
echo "Server logs: logs/gunicorn_access.log e logs/gunicorn_error.log"
echo ""

# Garante que o diretório de logs existe antes de iniciar o Gunicorn
mkdir -p logs

# Inicia o Gunicorn
gunicorn -c gunicorn_config.py app:app
