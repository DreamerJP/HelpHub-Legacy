import os
from logging.handlers import RotatingFileHandler
import logging

# Configuração do Gunicorn para o HelpHub

# Número de workers (normalmente 2-4 x número de cores da CPU)
workers = 4

# Tipo de worker - sync é suficiente para aplicações web comuns
worker_class = 'sync'

# Tempo limite para workers
timeout = 60

# Bind para interface de rede e porta
bind = '0.0.0.0:5000'

# Arquivos de log
accesslog = 'logs/gunicorn_access.log'
errorlog = 'logs/gunicorn_error.log'

# Nível de log
loglevel = 'info'

# Capturar saída do aplicativo
capture_output = True

# Executar como daemon (em segundo plano)
daemon = False

# Arquivo PID (Process ID)
pidfile = 'gunicorn.pid'

# Reiniciar automaticamente os workers quando o código da aplicação é alterado
reload = True

# Configuração de log com rotação
accesslog = 'logs/gunicorn_access.log'
errorlog = 'logs/gunicorn_error.log'
loglevel = 'info'

# Configuração dos handlers de log
logconfig_dict = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'generic': {
            'format': '%(asctime)s [%(process)d] [%(levelname)s] %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
            'class': 'logging.Formatter'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'generic',
            'stream': 'ext://sys.stdout'
        },
        'access': {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': 'generic',
            'filename': accesslog,
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 1,
            'encoding': 'utf-8'
        },
        'error': {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': 'generic',
            'filename': errorlog,
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 1,
            'encoding': 'utf-8'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'error']
    },
    'loggers': {
        'gunicorn.access': {
            'handlers': ['access'],
            'level': 'INFO',
            'propagate': False
        },
        'gunicorn.error': {
            'handlers': ['error'],
            'level': 'INFO',
            'propagate': False
        }
    }
}
