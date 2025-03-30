import os
import math
from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for, g, render_template, abort, send_file
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
import logging
from logging.handlers import RotatingFileHandler
from contextlib import contextmanager
import time
from time import sleep
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
import secrets
import threading
import re
import html
from html import escape
from openpyxl import Workbook
from io import BytesIO

# ========================================================
# INICIALIZAÇÃO E CONFIGURAÇÃO BÁSICA
# ========================================================

# Define diretórios base para o funcionamento da aplicação
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
DATABASE = os.path.join(BASE_DIR, 'database.db')

# Configuração de fallback para logs críticos
# Esta função estabelece um logger básico que será usado em caso de falha na configuração principal
def setup_critical_logger():
    critical_logger = logging.getLogger('critical')
    critical_handler = logging.StreamHandler()
    critical_handler.setLevel(logging.CRITICAL)
    critical_formatter = logging.Formatter('CRITICAL - %(asctime)s - %(message)s')
    critical_handler.setFormatter(critical_formatter)
    critical_logger.addHandler(critical_handler)
    return critical_logger

# Sanitiza o texto HTML para evitar ataques XSS
def sanitize_html(text):
    if text is None:
        return ""
    return html.escape(str(text))

# Inicializa logger crítico para erros de setup que possam ocorrer antes da inicialização completa
critical_logger = setup_critical_logger()

try:
    # Garante que o diretório de logs existe e tem permissões corretas
    if not os.path.exists(LOGS_DIR):
        os.makedirs(LOGS_DIR)
    
    # Testa permissões de escrita para evitar problemas futuros de acesso
    test_file = os.path.join(LOGS_DIR, 'test.log')
    try:
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
    except (IOError, OSError) as e:
        raise RuntimeError(f"Sem permissão de escrita em {LOGS_DIR}: {e}")

except Exception as e:
    critical_logger.critical(f"Erro fatal ao configurar diretório de logs: {e}")
    raise SystemExit(1)

# Inicializa o aplicativo Flask com suporte a CORS (Cross-Origin Resource Sharing)
app = Flask(__name__)
CORS(app, allow_private_network=False)  # Desativa explicitamente o cabeçalho Access-Control-Allow-Private-Network

# ========================================================
# CONFIGURAÇÃO DE LOGGING
# ========================================================

# Classe de filtro personalizado para logs de autenticação
class AuthFilter(logging.Filter):
    def filter(self, record):
        # Verifica se o registro vem do logger 'auth'
        return record.name == 'auth'

# Configuração avançada dos handlers de log com rotação de arquivos e formatação personalizada
def setup_logging():
    try:
        # Formatadores para diferentes destinos de log
        file_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - [%(name)s:%(funcName)s:%(lineno)d] - %(message)s'
        )
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )

        # Handler para erros - mantém 2 arquivos de 5MB cada
        error_handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'error.log'),
            maxBytes=5*1024*1024,  # 5MB por arquivo
            backupCount=1,  # Mantém 1 arquivo de backup (total de 2 arquivos)
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)

        # Handler para segurança - mantém 2 arquivos de 5MB cada
        security_handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'security.log'),
            maxBytes=5*1024*1024,
            backupCount=1,
            encoding='utf-8'
        )
        security_handler.setLevel(logging.INFO)
        security_handler.setFormatter(file_formatter)
        security_handler.addFilter(AuthFilter())

        # Handler para acesso - mantém 2 arquivos de 5MB cada
        access_handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'access.log'),
            maxBytes=5*1024*1024,
            backupCount=1,
            encoding='utf-8'
        )
        access_handler.setLevel(logging.INFO)
        access_handler.setFormatter(file_formatter)

        # Handler para console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG if app.debug else logging.INFO)
        console_handler.setFormatter(console_formatter)

        # Configura logger root
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG if app.debug else logging.INFO)

        # Remove handlers existentes para evitar duplicação
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # Adiciona handlers no root logger (EXCETO o security_handler)
        root_logger.addHandler(error_handler)
        root_logger.addHandler(access_handler)
        root_logger.addHandler(console_handler)

        return {
            'error': error_handler,
            'security': security_handler,
            'access': access_handler,
            'console': console_handler
        }

    except Exception as e:
        critical_logger.critical(f"Erro fatal na configuração de logging: {e}")
        raise SystemExit(1)

# Inicializa os loggers específicos para diferentes áreas da aplicação
try:
    handlers = setup_logging()

    # Logger para autenticação e autorização
    auth_logger = logging.getLogger('auth')
    auth_logger.setLevel(logging.INFO)
    auth_logger.addHandler(handlers['security'])
    # Adiciona handler de erro para capturar também erros de autenticação
    auth_logger.addHandler(handlers['error'])
    auth_logger.propagate = False  # Evita duplicação de logs

    # Logger para operações de banco de dados
    db_logger = logging.getLogger('database')
    db_logger.setLevel(logging.ERROR)
    db_logger.addHandler(handlers['error'])
    db_logger.propagate = False

    # Logger para operações gerais da aplicação
    app_logger = logging.getLogger('app')
    app_logger.setLevel(logging.INFO)
    app_logger.addHandler(handlers['error'])
    app_logger.addHandler(handlers['access'])
    if app.debug:
        app_logger.addHandler(handlers['console'])
    app_logger.propagate = False

except Exception as e:
    critical_logger.critical(f"Erro fatal ao inicializar loggers: {e}")
    raise SystemExit(1)

# Função para verificar se os loggers estão funcionando corretamente
def test_loggers():
    try:
        app_logger.info("Teste de log da aplicação")
        db_logger.error("Teste de log do banco de dados")
        auth_logger.warning("Teste de log de autenticação")
        return True
    except Exception as e:
        critical_logger.critical(f"Falha no teste dos loggers: {e}")
        return False

# Testa os loggers durante a inicialização
if not test_loggers():
    critical_logger.critical("Falha na verificação dos loggers")
    raise SystemExit(1)

# ========================================================
# SEGURANÇA E CONFIGURAÇÃO DA SESSÃO
# ========================================================

# Caminho para o arquivo que armazena a chave secreta da aplicação
SECRET_KEY_FILE = os.path.join(BASE_DIR, 'secret_key')

# Função para obter o IP real do cliente
def get_real_ip():
    """
    Obtém o endereço IP real do cliente, considerando headers de proxy
    """
    if request.headers.get('X-Forwarded-For'):
        # Pega o primeiro IP da cadeia X-Forwarded-For (endereço original do cliente)
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        # Alguns proxies usam X-Real-IP
        return request.headers.get('X-Real-IP')
    else:
        # Fallback para o endereço remoto padrão
        return request.remote_addr

# Obtém uma chave secreta existente ou gera uma nova com alta entropia
def get_or_generate_secret_key():
    try:
        # Tenta ler a chave existente do arquivo
        if os.path.exists(SECRET_KEY_FILE):
            with open(SECRET_KEY_FILE, 'r') as f:
                return f.read().strip()
    except:
        pass
    
    # Gera uma nova chave se não existir ou houver erro na leitura
    new_key = secrets.token_hex(32)  # Gera 256 bits (32 bytes) de dados aleatórios hexadecimais
    
    # Salva a nova chave em arquivo com permissões restritas
    try:
        with open(SECRET_KEY_FILE, 'w') as f:
            f.write(new_key)
        # Restringe permissões do arquivo para leitura/escrita apenas pelo proprietário
        os.chmod(SECRET_KEY_FILE, 0o600)
    except Exception as e:
        app_logger.error(f"Erro ao salvar chave secreta: {e}")
    
    return new_key

# Define a chave secreta para o Flask, usada para sessões e tokens CSRF
app.secret_key = get_or_generate_secret_key()

# Configuração do tempo da sessão
app.permanent_session_lifetime = timedelta(minutes=480)  # Sessão dura 8 horas

# Hook executado antes de cada requisição para manter a sessão ativa
@app.before_request
def before_request():
    # Renova a sessão se o usuário estiver ativo
    if 'user_id' in session:
        session.modified = True  # Atualiza o timestamp da sessão

# ========================================================
# AUTENTICAÇÃO E AUTORIZAÇÃO
# ========================================================

# Decorador para proteger rotas que requerem autenticação
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Autenticação necessária'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

# Rota para login de usuários
@app.route('/auth/login', methods=['POST'])
def auth_login():
    try:
        dados = request.json
        username = dados.get('username', '')
        password = dados.get('password', '')
        
        # Obtém o IP real do cliente
        client_ip = get_real_ip()
        
        if not username or not password:
            auth_logger.warning(f"Tentativa de login sem usuário ou senha - IP: {client_ip}")
            return jsonify({'success': False, 'error': 'Usuário e senha são obrigatórios'}), 400
        
        # Busca o usuário no banco de dados
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, password, role, senha_inicial_definida 
                FROM usuarios 
                WHERE username = ?
            ''', (username,))
            usuario = cursor.fetchone()
            
            if not usuario:
                auth_logger.warning(f"Usuário não encontrado: {username} - IP: {client_ip}")
                return jsonify({'success': False, 'error': 'Credenciais inválidas'}), 401

            # Se senha não estiver definida, verifica se é o primeiro acesso
            if usuario[2] is None and not usuario[4]:
                # Primeiro acesso do admin - verifica se a senha corresponde à padrão "admin"
                if username == "admin" and password == "admin":
                    session['user_id'] = usuario[0]
                    session['username'] = usuario[1]
                    session['role'] = usuario[3]
                    auth_logger.info(f"Primeiro acesso do admin - IP: {client_ip}")
                    return jsonify({
                        'success': False, 
                        'initial_password_required': True
                    })
                return jsonify({'success': False, 'error': 'Credenciais inválidas'}), 401

            # Verifica se a senha está correta
            if usuario[2] and check_password_hash(usuario[2], password):
                session['user_id'] = usuario[0]
                session['username'] = usuario[1]
                session['role'] = usuario[3]
                session.permanent = True

                auth_logger.info(f"Login bem-sucedido para o usuário {username} - IP: {client_ip}")
                
                # Verifica se é necessário fazer backup
                backup_info = None
                hoje = datetime.now().strftime('%Y-%m-%d')
                
                # Verifica se já foi feito backup hoje
                arquivos_hoje = glob.glob(os.path.join(BACKUP_DIR, f'backup_{hoje}_*.db'))
                
                if not arquivos_hoje:
                    # Nenhum backup feito hoje, então realiza o backup
                    sucesso, mensagem = realizar_backup_diario()
                    backup_info = {
                        'realizado': sucesso,
                        'mensagem': mensagem
                    }
                    app_logger.info(f"Verificação de backup após login: {mensagem}")
                else:
                    backup_info = {
                        'realizado': False,
                        'mensagem': f"Backup já realizado hoje ({len(arquivos_hoje)} arquivo(s))"
                    }
                    app_logger.info(f"Verificação de backup após login: já realizado hoje")
                
                return jsonify({
                    'success': True, 
                    'user': {
                        'username': usuario[1],
                        'role': usuario[3]
                    },
                    'backup': backup_info
                })
            else:
                auth_logger.warning(f"Senha incorreta para usuário {username} - IP: {client_ip}")
                return jsonify({'success': False, 'error': 'Credenciais inválidas'}), 401

    except Exception as e:
        auth_logger.error(f"Erro no login: {e} - IP: {client_ip}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ========================================================
# FUNÇÃO PARA SANITIZAR ENTRADAS DE DADOS
# ========================================================

def sanitize_input(data):
    """
    Sanitiza entradas de dados para evitar injeção de código malicioso.
    Aceita strings, listas e dicionários.
    """
    if isinstance(data, str):
        return escape(data.strip())
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    elif isinstance(data, dict):
        return {key: sanitize_input(value) for key, value in data.items()}
    return data


# ========================================================
# ACESSO AO BANCO DE DADOS
# ========================================================

# Define o número máximo de tentativas para operações no banco de dados
MAX_RETRIES = 3

# Context manager para gerenciar a conexão com o banco de dados SQLite
# Garante que a conexão seja fechada após o uso, mesmo em caso de exceção
@contextmanager
def get_db_connection():
    conn = None
    try:
        # Estabelece uma conexão com o banco de dados SQLite
        conn = sqlite3.connect(DATABASE)
        # Habilita o suporte a chaves estrangeiras no SQLite para integridade referencial
        conn.execute('PRAGMA foreign_keys = ON')
        # Retorna a conexão para ser usada no bloco 'with'
        yield conn
    except sqlite3.Error as e:
        # Registra erros de banco de dados no log especializado
        app_logger.error(f"Erro no banco de dados: {e}")
        # Propaga a exceção para tratamento no chamador
        raise
    finally:
        # Garante que a conexão seja fechada, mesmo em caso de exceção
        if conn:
            conn.close()

# Decorador para executar novamente operações no banco de dados em caso de falha
# Útil para lidar com condições de concorrência ou problemas transitórios
def retry_db_operation(func):
    def wrapper(*args, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                # Tenta executar a função decorada
                return func(*args, **kwargs)
            except sqlite3.Error as e:
                # Se atingir o número máximo de tentativas, propaga a exceção
                if attempt == MAX_RETRIES - 1:
                    raise
                # Registra um aviso sobre a falha e a nova tentativa
                app_logger.warning(f"Operação no banco de dados falhou, tentando novamente... ({attempt + 1}/{MAX_RETRIES})")
                # Aguarda um curto período antes de tentar novamente para resolver condições transitórias
                sleep(1)
    return wrapper

# ========================================================
# INICIALIZAÇÃO DO ESQUEMA DO BANCO DE DADOS
# ========================================================

# Cria as tabelas no banco de dados se elas não existirem
def criar_tabelas():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Tabela clientes - armazena informações detalhadas sobre os clientes
        cursor.execute('''CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            nome_fantasia TEXT,
            email TEXT,
            telefone TEXT,
            ativo TEXT,
            tipo_cliente TEXT,
            cnpj_cpf TEXT,
            ie_rg TEXT,
            contribuinte_icms TEXT,
            rg_orgao_emissor TEXT,
            nacionalidade TEXT,
            naturalidade TEXT,
            estado_nascimento TEXT,
            data_nascimento TEXT,
            sexo TEXT,
            profissao TEXT,
            estado_civil TEXT,
            inscricao_municipal TEXT,
            cep TEXT,
            rua TEXT,
            numero TEXT,
            complemento TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            pais TEXT
        )''')
        
        # Tabela chamados - armazena os chamados de suporte com relação aos clientes
        # cliente_id pode ser NULL quando um cliente é removido
        cursor.execute('''CREATE TABLE IF NOT EXISTS chamados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            descricao TEXT NOT NULL,
            status TEXT DEFAULT 'Aberto',
            data_abertura TEXT NOT NULL,
            data_fechamento TEXT,
            protocolo TEXT NOT NULL,
            assunto TEXT,
            telefone TEXT,
            solicitante TEXT,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
        )''')
        
        # Tabela chamado_andamentos - histórico de atualizações de cada chamado
        cursor.execute('''CREATE TABLE IF NOT EXISTS chamado_andamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chamado_id INTEGER NOT NULL,
            data_hora DATETIME NOT NULL,
            texto TEXT NOT NULL,
            FOREIGN KEY(chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
        )''')
        
        # Tabela agendamentos - agenda de visitas técnicas para atendimento aos chamados
        cursor.execute('''CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chamado_id INTEGER NOT NULL,
            data_agendamento TEXT NOT NULL,
            data_final_agendamento TEXT NOT NULL,
            observacoes TEXT,
            status TEXT DEFAULT 'Aberto',
            FOREIGN KEY (chamado_id) REFERENCES chamados(id)
        )''')
        
        # Tabela usuarios - autenticação e controle de acesso ao sistema
        cursor.execute('''CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT,
            role TEXT NOT NULL DEFAULT 'guest',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            senha_inicial_definida BOOLEAN DEFAULT FALSE
        )''')
        
        # Tabela configurações - armazena parâmetros globais do sistema
        cursor.execute('''CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            descricao TEXT,
            data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Verifica se já existe configuração para o diretório de backup
        cursor.execute('SELECT valor FROM configuracoes WHERE chave = "backup_dir"')
        if not cursor.fetchone():
            # Se não existir, insere o valor padrão
            caminho_padrao = os.path.join(BASE_DIR, 'backups')
            cursor.execute('INSERT INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)',
                        ('backup_dir', caminho_padrao, 'Diretório para armazenar backups do sistema'))
        
        # Verifica se já existe um usuário admin e cria se necessário
        cursor.execute('SELECT COUNT(*) FROM usuarios WHERE username = "admin"')
        if cursor.fetchone()[0] == 0:
            # Cria o usuário admin sem senha definida
            cursor.execute('INSERT INTO usuarios (username, password, role, senha_inicial_definida) VALUES (?, NULL, ?, ?)',
                        ('admin', 'admin', False))
        
        # Adiciona a coluna 'notas' à tabela clientes se ela não existir
        cursor.execute('''
            SELECT COUNT(*) FROM pragma_table_info('clientes') WHERE name='notas'
        ''')
        if cursor.fetchone()[0] == 0:
            cursor.execute('ALTER TABLE clientes ADD COLUMN notas TEXT')
            
        # Tabela notas_clientes - armazena as notas dos clientes
        cursor.execute('''CREATE TABLE IF NOT EXISTS notas_clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            notas TEXT,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
        )''')
        
        # Adiciona a coluna senha_inicial_definida se não existir
        cursor.execute('''
            SELECT COUNT(*) FROM pragma_table_info('usuarios') 
            WHERE name='senha_inicial_definida'
        ''')
        if cursor.fetchone()[0] == 0:
            cursor.execute('ALTER TABLE usuarios ADD COLUMN senha_inicial_definida BOOLEAN DEFAULT TRUE')
            # Define como TRUE para usuários existentes
            cursor.execute('UPDATE usuarios SET senha_inicial_definida = TRUE WHERE password IS NOT NULL')
            
        conn.commit()

# Executa a criação das tabelas ao iniciar o aplicativo
criar_tabelas()

# Atualiza os chamados existentes que não possuem protocolo definido
# Formato do protocolo: ddmmyyyyHHMM + ID do cliente
def atualizar_chamados_sem_protocolo():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Seleciona os chamados sem protocolo
        cursor.execute('SELECT id, cliente_id, data_abertura FROM chamados WHERE protocolo IS NULL OR protocolo = ""')
        chamados = cursor.fetchall()
        
        # Itera sobre os chamados selecionados
        for chamado in chamados:
            id, cliente_id, data_abertura = chamado
            try:
                # Tenta converter a data de abertura para formato datetime
                data_abertura_dt = datetime.strptime(data_abertura, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    # Tenta formato alternativo se o primeiro falhar
                    data_abertura_dt = datetime.strptime(data_abertura, '%d/%m/%Y %H:%M')
                except ValueError:
                    # Registra erro se ambos os formatos falharem
                    app_logger.error(f"Formato de data inválido para o chamado ID {id}: {data_abertura}")
                    continue
                    
            # Gera o protocolo baseado na data e ID do cliente
            protocolo = data_abertura_dt.strftime('%d%m%Y%H%M') + str(cliente_id)
            # Atualiza o chamado
            cursor.execute('UPDATE chamados SET protocolo = ? WHERE id = ?', (protocolo, id))
            
        # Salva todas as alterações
        conn.commit()

# Executa a atualização dos protocolos de chamados ao iniciar o aplicativo
atualizar_chamados_sem_protocolo()

# ========================================================
# SISTEMA DE BACKUP DE BANCO DE DADOS
# ========================================================

import shutil
import glob
import os
from datetime import datetime, timedelta

# Define o diretório para os backups
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')

# Garante que o diretório de backups existe
if not os.path.exists(BACKUP_DIR):
    try:
        os.makedirs(BACKUP_DIR)
        app_logger.info(f"Diretório de backups criado em {BACKUP_DIR}")
    except Exception as e:
        app_logger.error(f"Erro ao criar diretório de backups: {e}")

def normalize_path(path):
    """
    Normaliza o caminho para ser compatível com o sistema operacional atual.
    Converte caminhos relativos para absolutos com base no diretório base.
    """
    # Se o caminho for relativo, converte para absoluto com base no BASE_DIR
    if not os.path.isabs(path):
        path = os.path.join(BASE_DIR, path)
    # Normaliza o caminho para o formato correto do sistema operacional
    return os.path.normpath(path)

def obter_diretorio_backup():
    """
    Obtém o diretório de backup das configurações do sistema e normaliza o caminho.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT valor FROM configuracoes WHERE chave = "backup_dir"')
            resultado = cursor.fetchone()
            
            backup_dir = resultado[0] if resultado else os.path.join(BASE_DIR, 'backups')
            
            # Normaliza o caminho para o sistema atual
            backup_dir = normalize_path(backup_dir)
            
            # Verifica se o diretório existe, se não, tenta criá-lo
            if not os.path.exists(backup_dir):
                try:
                    os.makedirs(backup_dir)
                    app_logger.info(f"Diretório de backups criado em {backup_dir}")
                except Exception as e:
                    app_logger.error(f"Erro ao criar diretório de backups: {e}")
                    # Se falhar ao criar, usa o diretório padrão
                    backup_dir = normalize_path(os.path.join(BASE_DIR, 'backups'))
                    if not os.path.exists(backup_dir):
                        os.makedirs(backup_dir)
            
            return backup_dir
    except Exception as e:
        app_logger.error(f"Erro ao obter diretório de backup: {e}")
        # Em caso de erro, retorna o diretório padrão
        return normalize_path(os.path.join(BASE_DIR, 'backups'))

# Modifique a definição do diretório de backup para usar a função
BACKUP_DIR = obter_diretorio_backup()

def realizar_backup_diario():
    """
    Realiza um backup do banco de dados e mantém apenas os últimos 14 backups
    Retorna: (bool, str) - (sucesso, mensagem)
    """
    try:
        # Obtém o diretório de backup atual
        BACKUP_DIR = obter_diretorio_backup()
        
        # Verifica se o diretório de backups existe, se não, cria
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
            app_logger.info(f"Diretório de backups criado em {BACKUP_DIR}")
        
        # Cria o nome do arquivo de backup com timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        backup_file = os.path.join(BACKUP_DIR, f'backup_{timestamp}.db')
        
        # Realiza o backup (cópia do arquivo)
        shutil.copy2(DATABASE, backup_file)
        
        app_logger.info(f"Backup realizado com sucesso: {backup_file}")
        
        # Lista e ordena todos os backups existentes por data de criação (mais antigo primeiro)
        todos_backups = sorted(
            glob.glob(os.path.join(BACKUP_DIR, 'backup_*.db')),
            key=lambda x: os.path.getctime(x)
        )
        
        # Se houver mais de 14 backups, remove os mais antigos
        if len(todos_backups) > 14:
            backups_para_remover = todos_backups[:-14]  # Pega todos exceto os 14 mais recentes
            for arquivo in backups_para_remover:
                try:
                    os.remove(arquivo)
                    app_logger.info(f"Backup antigo removido: {arquivo}")
                except Exception as e:
                    app_logger.error(f"Erro ao remover backup antigo {arquivo}: {e}")
                
        return True, f"Backup realizado com sucesso em {timestamp}"
    except Exception as e:
        erro_msg = f"Erro ao realizar backup: {str(e)}"
        app_logger.error(erro_msg)
        return False, erro_msg

# ========================================================
# ROTAS ESTÁTICAS - INTERFACE DO USUÁRIO
# ========================================================

# Rota para servir a página inicial com verificação de autenticação
@app.route('/')
def index():
    app_logger.info("Acessando a página inicial")
    # Redireciona para a página de login se o usuário não estiver autenticado
    if 'user_id' not in session:
        return redirect('/login.html')
    # Serve a interface principal para usuários autenticados
    return send_from_directory('static', 'index.html')

# Rota para servir arquivos estáticos (CSS, JS, imagens, etc.)
@app.route('/<path:path>')
def static_files(path):
    app_logger.info(f"Acessando arquivo estático: {path}")
    return send_from_directory('static', path)

@app.route('/help')
@login_required
def help_page():
    return send_from_directory('static', 'help.html')

@app.route('/static/docs/<topic>')
@login_required
def serve_markdown(topic):
    # Adiciona a extensão .md ao nome do arquivo
    file_path = f"{topic}.md"
    try:
        return send_from_directory('static/docs', file_path)
    except FileNotFoundError:
        abort(404)

# ========================================================
# ROTA PARA O EASTER EGG (JOGO SNAKE)
# ========================================================

@app.route('/snake.html')
@login_required
def snake_game():
    app_logger.info("Easter Egg Acessado: Jogo Snake")
    return send_from_directory('static', 'snake.html')

# ========================================================
# API DE CLIENTES
# ========================================================

# Rota para listar clientes com paginação e ordenação
@app.route('/clientes', methods=['GET'])
@login_required
def listar_clientes():
    try:
        # Parâmetros de paginação e ordenação
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        offset = (pagina - 1) * limite
        
        # Parâmetros de ordenação com validação para prevenir SQL injection
        order_field = request.args.get('order_field', default='id', type=str)
        order_order = request.args.get('order_order', default='asc', type=str)
        
        # Valida os campos de ordenação permitidos
        if order_field not in ['id', 'nome', 'nome_fantasia', 'email', 'telefone']:
            order_field = 'id'
        if order_order.lower() not in ['asc', 'desc']:
            order_order = 'asc'
            
        # Constrói a cláusula ORDER BY de forma segura
        order_clause = f"ORDER BY {order_field} {order_order.upper()}"
        
        # Query SQL para selecionar clientes com paginação
        query = f"""
        SELECT id, nome, nome_fantasia, email, telefone, ativo,
                tipo_cliente, cnpj_cpf, ie_rg, contribuinte_icms, rg_orgao_emissor,
                nacionalidade, naturalidade, estado_nascimento, data_nascimento,
                sexo, profissao, estado_civil, inscricao_municipal,
                cep, rua, numero, complemento, bairro, cidade, estado, pais
        FROM clientes
        {order_clause} LIMIT ? OFFSET ?
        """
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Conta o total de clientes para cálculo de paginação
            cursor.execute("SELECT COUNT(*) FROM clientes")
            total = cursor.fetchone()[0]
            
            # Executa a consulta principal
            cursor.execute(query, (limite, offset))
            clientes = cursor.fetchall()
            
            # Calcula o total de páginas
            total_pages = math.ceil(total / limite)
            
            # Registra operação no log
            app_logger.info(f"Listando clientes - Página: {pagina}, Limite: {limite}, Total: {total}")
            
            # Retorna os resultados paginados
            return jsonify({
                'clientes': clientes,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite,
                'totalPages': total_pages
            })
    except Exception as e:
        app_logger.error(f"Erro ao listar clientes: {e}")
        return jsonify({'erro': 'Erro ao listar clientes'}), 500

# Rota para cadastrar um novo cliente
@app.route('/clientes', methods=['POST'])
@login_required
def cadastrar_cliente():
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Validação básica dos dados recebidos
        if not dados or not dados.get('nome') or len(dados['nome'].strip()) == 0:
            app_logger.warning("Tentativa de cadastrar cliente sem nome")
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        # Processa os dados e insere no banco
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Prepara a query SQL com todos os campos do cliente, incluindo endereço
            cursor.execute('''
                INSERT INTO clientes (
                    nome, nome_fantasia, email, telefone, ativo, tipo_cliente, cnpj_cpf,
                    ie_rg, contribuinte_icms, rg_orgao_emissor, nacionalidade, naturalidade,
                    estado_nascimento, data_nascimento, sexo, profissao, estado_civil,
                    inscricao_municipal, cep, rua, numero, complemento, bairro, cidade,
                    estado, pais
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                dados['nome'].strip(),
                dados.get('nome_fantasia', '').strip(),
                dados.get('email', '').strip(),
                dados.get('telefone', '').strip(),
                dados.get('ativo', '').strip(),
                dados.get('tipo_cliente', '').strip(),
                dados.get('cnpj_cpf', '').strip(),
                dados.get('ie_rg', '').strip(),
                dados.get('contribuinte_icms', '').strip(),
                dados.get('rg_orgao_emissor', '').strip(),
                dados.get('nacionalidade', '').strip(),
                dados.get('naturalidade', '').strip(),
                dados.get('estado_nascimento', '').strip(),
                dados.get('data_nascimento', '').strip(),
                dados.get('sexo', '').strip(),
                dados.get('profissao', '').strip(),
                dados.get('estado_civil', '').strip(),
                dados.get('inscricao_municipal', '').strip(),
                dados.get('cep', '').strip(),
                dados.get('rua', '').strip(),
                dados.get('numero', '').strip(),
                dados.get('complemento', '').strip(),
                dados.get('bairro', '').strip(),
                dados.get('cidade', '').strip(),
                dados.get('estado', '').strip(),
                dados.get('pais', '').strip()
            ))
            
            # Confirma a transação
            conn.commit()
            
            # Recupera o ID gerado
            cliente_id = cursor.lastrowid
            
            # Registra sucesso no log
            app_logger.info(f"Cliente cadastrado com sucesso! ID: {cliente_id}")
            
            # Retorna confirmação com o ID gerado
            return jsonify({
                'mensagem': 'Cliente cadastrado com sucesso!',
                'id': cliente_id
            }), 201
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao cadastrar cliente: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao cadastrar cliente'}), 500

# Rota para editar um cliente existente
@app.route('/clientes/<int:id>', methods=['PUT'])
@login_required
def editar_cliente(id):
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Validação básica dos dados recebidos
        if not dados or 'nome' not in dados:
            app_logger.warning(f"Tentativa de editar cliente {id} com dados inválidos")
            return jsonify({'erro': 'Dados inválidos'}), 400

        # Atualiza o cliente no banco
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Prepara a query SQL para atualizar todos os campos do cliente
            cursor.execute('''
                UPDATE clientes
                SET nome = ?,
                    nome_fantasia = ?,
                    email = ?,
                    telefone = ?,
                    ativo = ?,
                    tipo_cliente = ?,
                    cnpj_cpf = ?,
                    ie_rg = ?,
                    contribuinte_icms = ?,
                    rg_orgao_emissor = ?,
                    nacionalidade = ?,
                    naturalidade = ?,
                    estado_nascimento = ?,
                    data_nascimento = ?,
                    sexo = ?,
                    profissao = ?,
                    estado_civil = ?,
                    inscricao_municipal = ?
                WHERE id = ?
            ''', (
                dados['nome'],
                dados.get('nome_fantasia'),
                dados.get('email'),
                dados.get('telefone'),
                dados.get('ativo'),
                dados.get('tipo_cliente'),
                dados.get('cnpj_cpf'),
                dados.get('ie_rg'),
                dados.get('contribuinte_icms'),
                dados.get('rg_orgao_emissor'),
                dados.get('nacionalidade'),
                dados.get('naturalidade'),
                dados.get('estado_nascimento'),
                dados.get('data_nascimento'),
                dados.get('sexo'),
                dados.get('profissao'),
                dados.get('estado_civil'),
                dados.get('inscricao_municipal'),
                id
            ))
            
            # Verifica se o cliente foi encontrado
            if cursor.rowcount == 0:
                app_logger.warning(f"Cliente não encontrado para edição: {id}")
                return jsonify({'erro': 'Cliente não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Cliente atualizado com sucesso! ID: {id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Cliente atualizado com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao editar cliente: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao editar cliente'}), 500

# Rota para excluir um cliente existente
@app.route('/clientes/<int:id>', methods=['DELETE'])
@login_required
def excluir_cliente(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Primeiro, finaliza todos os chamados associados a este cliente
            # Isso é necessário para manter a integridade dos dados históricos
            data_fechamento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute("""
                UPDATE chamados 
                SET status = 'Finalizado', data_fechamento = ?, cliente_id = NULL
                WHERE cliente_id = ?
            """, (data_fechamento, id))
            
            # Excluir as notas associadas ao cliente
            cursor.execute('DELETE FROM notas_clientes WHERE cliente_id = ?', (id,))
            
            # Em seguida, exclui o cliente
            cursor.execute("DELETE FROM clientes WHERE id=?", (id,))
            
            # Verifica se o cliente foi encontrado
            if cursor.rowcount == 0:
                app_logger.warning(f"Cliente não encontrado para exclusão: {id}")
                return jsonify({'erro': 'Cliente não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Cliente excluído com sucesso! ID: {id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Cliente excluído com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao excluir cliente: {e}")
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao excluir cliente'}), 500

# Rota para buscar clientes com base em um termo de pesquisa
@app.route('/clientes/buscar', methods=['GET'])
@login_required
def buscar_clientes():
    try:
        # Obtém o termo de pesquisa da query string
        termo = request.args.get('termo', '')
        
        # Query SQL para buscar clientes com base no termo de pesquisa
        query = """
        SELECT id, nome, nome_fantasia, email, telefone, ativo,
                tipo_cliente, cnpj_cpf, ie_rg, contribuinte_icms, rg_orgao_emissor,
                nacionalidade, naturalidade, estado_nascimento, data_nascimento,
                sexo, profissao, estado_civil, inscricao_municipal
        FROM clientes
        WHERE id LIKE ? OR nome LIKE ? OR email LIKE ?
        COLLATE NOCASE
        """
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Define o termo de pesquisa com curingas para busca parcial
            search_term = f'%{termo}%'
            
            # Executa a query para buscar os clientes
            cursor.execute(query, (search_term, search_term, search_term))
            clientes = cursor.fetchall()
            
            # Registra operação no log
            app_logger.info(f"Busca de clientes realizada com o termo: {termo}")
            
            # Retorna os clientes encontrados
            return jsonify(clientes)
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro na busca de clientes: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro na busca'}), 500

# Novos endpoints para gerenciar notas dos clientes
@app.route('/clientes/<int:id>/notas', methods=['GET'])
@login_required
def obter_notas_cliente(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT notas FROM notas_clientes WHERE cliente_id = ?', (id,))
            resultado = cursor.fetchone()
            
            if not resultado:
                return jsonify({'notas': ''})
            
            return jsonify({'notas': resultado[0] or ''})
            
    except Exception as e:
        app_logger.error(f"Erro ao obter notas do cliente: {e}")
        return jsonify({'erro': 'Erro ao obter notas do cliente'}), 500

@app.route('/clientes/<int:id>/notas', methods=['POST'])
@login_required
def salvar_notas_cliente(id):
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        notas = dados.get('notas', '')
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verifica se o cliente existe
            cursor.execute('SELECT id FROM clientes WHERE id = ?', (id,))
            if not cursor.fetchone():
                return jsonify({'success': False, 'error': 'Cliente não encontrado'}), 404
            
            # Verifica se já existe nota para este cliente
            cursor.execute('SELECT id FROM notas_clientes WHERE cliente_id = ?', (id,))
            nota_existente = cursor.fetchone()
            
            if nota_existente:
                # Se as notas estiverem vazias, exclui o registro para economizar espaço
                if not notas.strip():
                    cursor.execute('DELETE FROM notas_clientes WHERE cliente_id = ?', (id,))
                    app_logger.info(f'Notas excluídas para o cliente {id}')
                else:
                    # Atualiza as notas existentes
                    cursor.execute('UPDATE notas_clientes SET notas = ? WHERE cliente_id = ?', (notas, id))
                    app_logger.info(f'Notas atualizadas para o cliente {id}')
            else:
                # Só insere se as notas não estiverem vazias
                if notas.strip():
                    cursor.execute('INSERT INTO notas_clientes (cliente_id, notas) VALUES (?, ?)', (id, notas))
                    app_logger.info(f'Notas adicionadas para o cliente {id}')
            
            conn.commit()
            return jsonify({'success': True, 'message': 'Notas atualizadas com sucesso'})
            
    except Exception as e:
        app_logger.error(f"Erro ao salvar notas do cliente: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ========================================================
# API DE CHAMADOS
# ========================================================

# Rota para abrir um novo chamado
@app.route('/chamados', methods=['POST'])
@login_required
def abrir_chamado():
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Validação básica dos dados recebidos
        if not dados or 'cliente_id' not in dados or 'descricao' not in dados:
            app_logger.warning("Tentativa de abrir chamado com dados inválidos")
            return jsonify({'erro': 'Dados inválidos'}), 400

        # Validar tamanho do campo assunto (máximo 70 caracteres)
        if 'assunto' in dados and dados['assunto'] and len(dados['assunto']) > 70:
            return jsonify({'erro': 'O assunto deve ter no máximo 70 caracteres'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Verifica se o cliente existe
            cursor.execute('SELECT id FROM clientes WHERE id = ?', (dados['cliente_id'],))
            if not cursor.fetchone():
                app_logger.warning(f"Cliente não encontrado ao abrir chamado: {dados['cliente_id']}")
                return jsonify({'erro': 'Cliente não encontrado'}), 404

            # Gerar protocolo automaticamente: ddmmyyyyHHMM + id do cliente
            now = datetime.now()
            protocolo = now.strftime('%d%m%Y%H%M') + str(dados['cliente_id'])

            # Insere o chamado com os campos adicionais
            data_abertura = now.strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('''
                INSERT INTO chamados (
                    cliente_id, descricao, data_abertura, protocolo,
                    assunto, telefone, solicitante
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                dados['cliente_id'], 
                dados['descricao'], 
                data_abertura, 
                protocolo,
                dados.get('assunto', ''),
                dados.get('telefone', ''),
                dados.get('solicitante', '')
            ))
            
            # Salva as alterações no banco de dados
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Chamado aberto com sucesso! Protocolo: {protocolo}")
            
            # Retorna confirmação com o protocolo gerado
            return jsonify({'mensagem': 'Chamado aberto com sucesso!', 'protocolo': protocolo}), 201
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao abrir chamado: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao abrir chamado'}), 500

# Rota para listar chamados com paginação e filtro por status
@app.route('/chamados', methods=['GET'])
@login_required
def listar_chamados():
    try:
        # Parâmetros de paginação e filtro
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        status = request.args.get('status', default='Aberto', type=str)
        offset = (pagina - 1) * limite

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Conta o total de chamados com o status especificado
            cursor.execute('SELECT COUNT(*) FROM chamados WHERE status = ?', (status,))
            total = cursor.fetchone()[0]
            
            # Query SQL para selecionar chamados com paginação e filtro por status
            query = '''
                SELECT 
                    c.id,
                    c.cliente_id,
                    c.descricao,
                    c.status,
                    c.data_abertura,
                    c.data_fechamento,
                    c.protocolo,
                    c.assunto,
                    c.telefone,
                    c.solicitante,
                    cl.nome as cliente_nome
                FROM chamados c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                WHERE c.status = ?
                ORDER BY c.data_abertura DESC
                LIMIT ? OFFSET ?
            '''
            
            cursor.execute(query, (status, limite, offset))
            chamados = cursor.fetchall()

            # Processa os resultados para incluir o nome do cliente
            chamados_processados = []
            for chamado in chamados:
                chamado_dict = list(chamado)  # Converte a tupla em lista para poder modificar
                if chamado[10]:  # Se tem nome do cliente
                    chamado_dict[10] = chamado[10]  # Usa o nome do cliente
                else:
                    chamado_dict[10] = "Cliente removido"  # Caso o cliente tenha sido excluído
                chamados_processados.append(chamado_dict)

            # Registra operação no log
            app_logger.info(f"Listando chamados - Status: {status}, Página: {pagina}, Limite: {limite}, Total: {total}")
            
            # Retorna os resultados paginados
            return jsonify({
                'chamados': chamados_processados,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite
            })

    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao listar chamados: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao listar chamados'}), 500

# Rota para editar um chamado existente
@app.route('/chamados/<int:id>', methods=['PUT'])
@login_required
def editar_chamado(id):
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        app_logger.debug(f"Dados recebidos para edição do chamado {id}: {dados}")  # Log dos dados recebidos
        
        # Validação do tamanho do assunto
        if 'assunto' in dados and dados['assunto'] and len(dados['assunto']) > 70:
            return jsonify({'erro': 'O assunto deve ter no máximo 70 caracteres'}), 400

        # Validação básica dos dados recebidos
        if not dados:
            app_logger.warning(f"Tentativa de editar chamado {id} com dados inválidos")
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Lista para armazenar os campos e valores a serem atualizados
            campos_atualizacao = []
            valores = []
            
            # Mapeia todos os campos que podem ser atualizados
            campos_permitidos = {
                'descricao': 'descricao',
                'assunto': 'assunto',
                'telefone': 'telefone',
                'solicitante': 'solicitante',
                'status': 'status'
            }
            
            # Processa cada campo permitido
            for campo, coluna in campos_permitidos.items():
                if campo in dados:
                    campos_atualizacao.append(f'{coluna}=?')
                    valores.append(dados[campo])
                    app_logger.debug(f"Campo {campo} será atualizado para: {dados[campo]}")
            
            # Se estiver alterando o status para 'Aberto', limpa a data de fechamento
            if dados.get('status') == 'Aberto':
                campos_atualizacao.append('data_fechamento=NULL')
            
            # Se não houver campos para atualizar, retorna erro
            if not campos_atualizacao:
                app_logger.warning(f"Nenhum campo válido para atualização no chamado {id}")
                return jsonify({'erro': 'Nenhum campo válido para atualização'}), 400
            
            # Adiciona o ID do chamado aos valores
            valores.append(id)
            
            # Monta e executa a query
            query = f"UPDATE chamados SET {', '.join(campos_atualizacao)} WHERE id=?"

            # Log da query para depuração
            app_logger.debug(f"Query de atualização: {query}")
            app_logger.debug(f"Valores: {valores}")
            
            cursor.execute(query, valores)
            
            if cursor.rowcount == 0:
                app_logger.warning(f"Chamado não encontrado para edição: {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            
            conn.commit()
            
            # Consulta os dados atualizados para confirmar
            cursor.execute('SELECT * FROM chamados WHERE id = ?', (id,))
            chamado_atualizado = cursor.fetchone()
            app_logger.debug(f"Dados após atualização: {chamado_atualizado}")
            
            app_logger.info(f"Chamado {id} atualizado com sucesso")
            return jsonify({'mensagem': 'Chamado atualizado com sucesso!'})
            
    except Exception as e:
        app_logger.error(f"Erro ao editar chamado: {str(e)}", exc_info=True)
        return jsonify({'erro': f'Erro ao editar chamado: {str(e)}'}), 500

# Rota para finalizar um chamado existente
@app.route('/chamados/<int:id>/finalizar', methods=['PUT'])
@login_required
def finalizar_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Define a data de fechamento como a data e hora atuais
            data_fechamento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Query SQL para finalizar um chamado existente
            cursor.execute('''
                UPDATE chamados
                SET status=?, data_fechamento=?
                WHERE id=?
            ''', ('Finalizado', data_fechamento, id))
            
            # Verifica se o chamado foi encontrado
            if cursor.rowcount == 0:
                app_logger.error(f"Chamado não encontrado: ID {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Chamado finalizado com sucesso: ID {id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Chamado finalizado com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao finalizar chamado: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao finalizar chamado'}), 500

# Rota para excluir um chamado existente
@app.route('/chamados/<int:id>', methods=['DELETE'])
@login_required
def excluir_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Primeiro, verifica se existem agendamentos relacionados a este chamado
            cursor.execute('SELECT COUNT(*) FROM agendamentos WHERE chamado_id = ?', (id,))
            agendamentos_count = cursor.fetchone()[0]
            
            if agendamentos_count > 0:
                app_logger.warning(f"Tentativa de excluir chamado {id} com agendamentos associados")
                return jsonify({
                    'erro': 'Não é possível excluir o chamado porque existem visitas agendadas.',
                    'detalhes': 'Por favor, cancele os agendamentos relacionados antes de excluir o chamado.'
                }), 400
            
            # Query SQL para excluir um chamado existente
            cursor.execute('DELETE FROM chamados WHERE id=?', (id,))
            
            # Verifica se o chamado foi encontrado
            if cursor.rowcount == 0:
                app_logger.warning(f"Chamado não encontrado para exclusão: {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Chamado excluído com sucesso! ID: {id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Chamado excluído com sucesso!'})
    except sqlite3.IntegrityError as e:
        # Captura especificamente erros de integridade (restrições de chave estrangeira)
        app_logger.error(f"Erro de integridade ao excluir chamado: {e}")
        # Retorna mensagem mais explicativa
        return jsonify({
            'erro': 'Não é possível excluir o chamado porque existem registros relacionados.',
            'detalhes': 'Por favor, cancele os agendamentos relacionados antes de excluir o chamado.'
        }), 400
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao excluir chamado: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao excluir chamado'}), 500

# Rota da API para adicionar uma entrada de progresso a um chamado
@app.route('/chamados/<int:chamado_id>/andamentos', methods=['POST'])
@login_required
def adicionar_andamento(chamado_id):
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Loga os dados recebidos para fins de depuração
        app_logger.debug(f"Recebendo dados para novo andamento: {dados}")
        
        # Validação básica dos dados recebidos
        if not dados or 'texto' not in dados or not dados['texto'].strip():
            app_logger.warning("Tentativa de adicionar andamento sem texto")
            return jsonify({'erro': 'Texto do andamento é obrigatório'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verifica se o chamado existe
            cursor.execute('SELECT id FROM chamados WHERE id = ?', (chamado_id,))
            if not cursor.fetchone():
                app_logger.warning(f"Chamado não encontrado ao adicionar andamento: {chamado_id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404

            # Obtém a data e hora atuais
            data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Loga os dados da entrada de progresso antes da inserção
            app_logger.debug(f"Inserindo andamento: chamado_id={chamado_id}, data_hora={data_hora}, texto={dados['texto']}")
            
            # Query SQL para inserir uma nova entrada de progresso
            cursor.execute('''
                INSERT INTO chamado_andamentos (chamado_id, data_hora, texto)
                VALUES (?, ?, ?)
            ''', (chamado_id, data_hora, dados['texto'].strip()))
            
            # Obtém o ID da nova entrada de progresso
            novo_id = cursor.lastrowid
            
            # Confirma a transação
            conn.commit()
            
            # Confirma que o andamento foi salvo
            cursor.execute('SELECT id, data_hora, texto FROM chamado_andamentos WHERE id = ?', (novo_id,))
            andamento = cursor.fetchone()
            
            # Registra sucesso no log
            app_logger.info(f"Andamento criado com sucesso: ID={novo_id}")
            
            # Retorna confirmação com os dados da nova entrada de progresso
            return jsonify({
                'mensagem': 'Andamento adicionado com sucesso!',
                'andamento': {
                    'id': andamento[0],
                    'data_hora': andamento[1],
                    'texto': andamento[2]
                }
            }), 201
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao adicionar andamento: {str(e)}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': f'Erro ao adicionar andamento: {str(e)}'}), 500

# Rota da API para excluir uma entrada de progresso de um chamado
@app.route('/chamados/andamentos/<int:andamento_id>', methods=['DELETE'])
@login_required
def excluir_andamento(andamento_id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para excluir uma entrada de progresso
            cursor.execute('DELETE FROM chamado_andamentos WHERE id=?', (andamento_id,))
            
            # Verifica se a entrada de progresso foi encontrada
            if cursor.rowcount == 0:
                app_logger.warning(f"Andamento não encontrado para exclusão: {andamento_id}")
                return jsonify({'erro': 'Andamento não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Andamento excluído com sucesso! ID: {andamento_id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Andamento excluído com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao excluir andamento: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao excluir andamento'}), 500

# Modifica o endpoint /chamados/<int:id> para incluir as entradas de progresso
@app.route('/chamados/<int:id>', methods=['GET'])
@login_required
def obter_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Seleciona os dados do chamado, incluindo o nome do cliente através de um JOIN
            cursor.execute('''
                SELECT ch.id, ch.cliente_id, ch.descricao, ch.status, ch.data_abertura, 
                    ch.data_fechamento, ch.protocolo, ch.assunto, ch.telefone, ch.solicitante,
                    cl.nome as cliente_nome, cl.telefone as cliente_telefone
                FROM chamados ch
                LEFT JOIN clientes cl ON ch.cliente_id = cl.id
                WHERE ch.id = ?
            ''', (id,))
            
            # Obtém o resultado da consulta
            chamado = cursor.fetchone()
            
            # Verifica se o chamado foi encontrado
            if not chamado:
                app_logger.warning(f"Chamado não encontrado: {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404

            # Seleciona as entradas de progresso (andamentos) para o chamado, ordenadas por data e hora
            cursor.execute('SELECT id, data_hora, texto FROM chamado_andamentos WHERE chamado_id = ? ORDER BY data_hora', (id,))
            
            # Obtém os dados dos andamentos
            andamentos_data = cursor.fetchall()
            
            # Converte os dados dos andamentos em uma lista de dicionários
            andamentos_list = [
                {'id': row[0], 'data_hora': row[1], 'texto': row[2]}
                for row in andamentos_data
            ]

            # Busca os agendamentos relacionados ao chamado
            cursor.execute('''
                SELECT data_agendamento, data_final_agendamento, observacoes
                FROM agendamentos
                WHERE chamado_id = ?
            ''', (id,))
            
            # Obtém os dados do agendamento
            agendamento = cursor.fetchone()
            
            # Converte os dados do agendamento em um dicionário, se existir
            agendamento_data = dict(zip(['data_agendamento', 'data_final_agendamento', 'observacoes'], agendamento)) if agendamento else None

            # Registra sucesso no log
            app_logger.info(f"Detalhes do chamado obtidos com sucesso: {id}")
            
            # Retorna os dados do chamado, a lista de andamentos e o agendamento (se existir)
            return jsonify({
                'id': chamado[0],
                'cliente_id': chamado[1],
                'descricao': sanitize_html(chamado[2]),
                'status': chamado[3],
                'data_abertura': chamado[4],
                'data_fechamento': chamado[5],
                'protocolo': chamado[6],
                'assunto': sanitize_html(chamado[7]),
                'telefone': chamado[8],
                'solicitante': sanitize_html(chamado[9]),
                'cliente_nome': chamado[10],
                'cliente_telefone': chamado[11],
                'andamentos': [
                    {
                        'id': a['id'],
                        'data_hora': a['data_hora'],
                        'texto': sanitize_html(a['texto'])
                    }
                    for a in andamentos_list
                ],
                'agendamento': agendamento_data
            })
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao obter detalhes do chamado: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao obter detalhes do chamado'}), 500

# Rota para buscar chamados com base em um termo de pesquisa e status
@app.route('/chamados/buscar', methods=['GET'])
@login_required
def buscar_chamados():
    try:
        # Obtém o termo de pesquisa e o status da query string
        termo = request.args.get('termo', '')
        status = request.args.get('status', 'Aberto')
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para buscar chamados com base no termo de pesquisa e status
            # Busca em vários campos: protocolo, assunto, nome do cliente
            query = '''
                SELECT 
                    c.id,
                    c.cliente_id,
                    c.descricao,
                    c.status,
                    c.data_abertura,
                    c.data_fechamento,
                    c.protocolo,
                    c.assunto,
                    c.telefone,
                    c.solicitante,
                    cl.nome as cliente_nome
                FROM chamados c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                WHERE c.status = ? AND (
                    c.protocolo LIKE ? OR
                    c.assunto LIKE ? OR
                    cl.nome LIKE ? OR
                    c.descricao LIKE ?
                )
                ORDER BY c.data_abertura DESC
            '''
            
            # Define o termo de pesquisa com curingas para busca parcial
            search_term = f'%{termo}%'
            
            # Executa a query para buscar os chamados que correspondem ao termo
            cursor.execute(query, (status, search_term, search_term, search_term, search_term))
            chamados = cursor.fetchall()
            
            # Registra operação no log
            app_logger.info(f"Busca de chamados realizada - Status: {status}, Termo: {termo}")
            
            # Retorna os chamados encontrados
            return jsonify({
                'chamados': chamados,
                'total': len(chamados)
            })
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro na busca de chamados: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro na busca de chamados'}), 500

# ========================================================
# API DE ESTATÍSTICAS
# ========================================================

# Rota para obter estatísticas gerais do sistema
@app.route('/estatisticas', methods=['GET'])
@login_required
@retry_db_operation
def obter_estatisticas():
    try:
        periodo = request.args.get('periodo', 'total')

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Contar total de clientes (não filtrado por período)
            cursor.execute("SELECT COUNT(*) FROM clientes")
            total_clientes = cursor.fetchone()[0]

            if periodo == 'total':
                # Para período total, não usar filtro de data
                cursor.execute("SELECT COUNT(*) FROM chamados WHERE status = 'Aberto'")
                chamados_abertos = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM chamados WHERE status = 'Finalizado'")
                chamados_fechados = cursor.fetchone()[0]

                # Calcular média diária sobre todo o período
                cursor.execute("SELECT MIN(date(data_abertura)), MAX(date(data_abertura)) FROM chamados")
                data_min, data_max = cursor.fetchone()

                if data_min and data_max:
                    data_min = datetime.strptime(data_min, '%Y-%m-%d')
                    data_max = datetime.strptime(data_max, '%Y-%m-%d')
                    dias = max(1, (data_max - data_min).days + 1)

                    cursor.execute("SELECT COUNT(*) FROM chamados")
                    total_chamados = cursor.fetchone()[0]
                    media_diaria = round(total_chamados / dias, 1)
                else:
                    media_diaria = 0
            else:
                # Define o filtro de período com base no parâmetro recebido
                query_filtro = ''
                params = []

                if periodo == 'diario':
                    today = datetime.now().strftime('%Y-%m-%d')
                    query_filtro = "WHERE date(data_abertura) = ?"
                    params.append(today)
                elif periodo == 'semanal':
                    today = datetime.now()
                    week_ago = (today - timedelta(days=7)).strftime('%Y-%m-%d')
                    today_str = today.strftime('%Y-%m-%d')
                    query_filtro = "WHERE date(data_abertura) BETWEEN ? AND ?"
                    params.extend([week_ago, today_str])
                elif periodo == 'mensal':
                    today = datetime.now()
                    first_day = today.replace(day=1).strftime('%Y-%m-%d')
                    today_str = today.strftime('%Y-%m-%d')
                    query_filtro = "WHERE date(data_abertura) BETWEEN ? AND ?"
                    params.extend([first_day, today_str])

                # Contar chamados abertos com o filtro de período
                cursor.execute(f"SELECT COUNT(*) FROM chamados {query_filtro} AND status = 'Aberto'", params)
                chamados_abertos = cursor.fetchone()[0]

                # Contar chamados fechados com o filtro de período
                cursor.execute(f"SELECT COUNT(*) FROM chamados {query_filtro} AND status = 'Finalizado'", params)
                chamados_fechados = cursor.fetchone()[0]

                # Cálculo da média diária para períodos específicos
                cursor.execute(f"SELECT COUNT(*) FROM chamados {query_filtro}", params)
                total_chamados_periodo = cursor.fetchone()[0]

                if periodo == 'diario':
                    dias = 1
                elif periodo == 'semanal':
                    dias = 7
                else:  # mensal
                    today = datetime.now()
                    first_day = today.replace(day=1)
                    dias = (today - first_day).days + 1

                media_diaria = round(total_chamados_periodo / dias, 1)

            # Obter os últimos 5 chamados (sem filtro de período)
            cursor.execute("""
                SELECT c.id, c.assunto, c.data_abertura, c.status, cl.nome 
                FROM chamados c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                ORDER BY c.data_abertura DESC
                LIMIT 5
            """)
            ultimos_chamados = [
                {
                    'id': row[0],
                    'assunto': row[1],
                    'data_abertura': row[2],
                    'status': row[3],
                    'cliente_nome': row[4] or 'Cliente não encontrado'
                }
                for row in cursor.fetchall()
            ]

            return jsonify({
                'total_clientes': total_clientes,
                'chamados_abertos': chamados_abertos,
                'chamados_fechados': chamados_fechados,
                'media_diaria_chamados': media_diaria,
                'ultimos_chamados': ultimos_chamados
            })
    except Exception as e:
        app_logger.error(f"Erro ao obter estatísticas: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/auth/set_initial_password', methods=['POST'])
@login_required
def set_initial_password():
    try:
        if session.get('username') != 'admin':
            auth_logger.warning(f"Usuário não autorizado tentou definir senha inicial")
            return jsonify({'success': False, 'error': 'Não autorizado'}), 403

        dados = request.json
        nova_senha = dados.get('password')
        
        if not nova_senha or len(nova_senha) < 8:
            return jsonify({'success': False, 'error': 'Senha deve ter pelo menos 8 caracteres'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verifica se o usuário ainda não definiu a senha inicial
            cursor.execute('''
                SELECT senha_inicial_definida 
                FROM usuarios 
                WHERE username = 'admin'
            ''')
            result = cursor.fetchone()
            
            if not result or result[0]:
                auth_logger.warning("Tentativa de redefinir senha inicial já definida")
                return jsonify({'success': False, 'error': 'Senha inicial já foi definida'}), 403

            # Gera o hash da nova senha e atualiza o registro
            hashed_password = generate_password_hash(nova_senha)
            cursor.execute('''
                UPDATE usuarios 
                SET password = ?, senha_inicial_definida = TRUE 
                WHERE username = 'admin'
            ''', (hashed_password,))
            
            conn.commit()
            
            auth_logger.info("Senha inicial do admin definida com sucesso")
            return jsonify({'success': True, 'message': 'Senha definida com sucesso'})

    except Exception as e:
        auth_logger.error(f"Erro ao definir senha inicial: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Rota para logout de usuários
@app.route('/auth/logout')
def auth_logout():
    app_logger.info(f"Usuário {session.get('username', 'desconhecido')} deslogado.")
    session.clear()
    return redirect('/login.html')

# Rota para verificar o papel do usuário atual
@app.route('/auth/check-role')
def check_role():
    if 'role' not in session:
        app_logger.warning("Tentativa de verificar papel sem sessão ativa.")
        return jsonify({'role': None, 'username': None}), 401
    app_logger.info(f"Verificando papel do usuário: {session.get('username', 'desconhecido')}, papel: {session.get('role', 'desconhecido')}")
    return jsonify({
        'role': session['role'],
        'username': session['username']
    })

# Rota para renovar a sessão do usuário
@app.route('/auth/renew-session', methods=['POST'])
def renew_session():
    if 'user_id' in session:
        # Renova a sessão
        session.modified = True
        app_logger.info(f"Sessão renovada para o usuário: {session.get('username', 'desconhecido')}")
        return jsonify({'success': True})
    app_logger.warning("Tentativa de renovar sessão sem user_id na sessão.")
    return jsonify({'success': False}), 401

@app.route('/auth/check-first-access', methods=['GET'])
def check_first_access():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT senha_inicial_definida 
                FROM usuarios 
                WHERE username = 'admin'
            ''')
            result = cursor.fetchone()
            
            # Se result[0] for False ou NULL, é primeiro acesso
            is_first_access = not result[0] if result else True
            
            return jsonify({
                'is_first_access': is_first_access
            })
            
    except Exception as e:
        app_logger.error(f"Erro ao verificar primeiro acesso: {e}")
        return jsonify({'error': str(e)}), 500

# Rota para obter informações sobre os backups
@app.route('/system/backups', methods=['GET'])
@login_required
def obter_info_backups():
    try:
        # Apenas administradores podem ver informações detalhadas dos backups
        if session.get('role') != 'admin':
            return jsonify({
                'success': False,
                'error': 'Acesso não autorizado'
            }), 403
            
        # Obtém o diretório atual de backups
        BACKUP_DIR = obter_diretorio_backup()
            
        # Lista todos os arquivos de backup
        todos_backups = sorted(glob.glob(os.path.join(BACKUP_DIR, 'backup_*.db')))
        
        # Obtém informações detalhadas de cada backup
        backups_info = []
        for arquivo in todos_backups:
            nome_arquivo = os.path.basename(arquivo)
            tamanho = os.path.getsize(arquivo) / (1024 * 1024)  # Tamanho em MB
            data_criacao = datetime.fromtimestamp(os.path.getctime(arquivo)).strftime('%Y-%m-%d %H:%M:%S')
            
            backups_info.append({
                'nome': nome_arquivo,
                'tamanho': f"{tamanho:.2f} MB",
                'data_criacao': data_criacao
            })
            
        return jsonify({
            'success': True,
            'total_backups': len(backups_info),
            'backups': backups_info,
            'diretorio': BACKUP_DIR
        })
        
    except Exception as e:
        app_logger.error(f"Erro ao obter informações de backup: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Erro ao obter informações de backup: {str(e)}"
        }), 500

# Adicionar rota para configuração do diretório de backup
@app.route('/system/backup-config', methods=['GET', 'POST'])
@login_required
def configurar_backup():
    # Verifica se o usuário é administrador
    if session.get('role') != 'admin':
        return jsonify({
            'success': False,
            'error': 'Acesso não autorizado'
        }), 403
    
    # Se for método GET, retorna a configuração atual
    if request.method == 'GET':
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT valor FROM configuracoes WHERE chave = "backup_dir"')
                resultado = cursor.fetchone()
                
                return jsonify({
                    'success': True,
                    'diretorio_atual': resultado[0] if resultado else os.path.join(BASE_DIR, 'backups')
                })
        except Exception as e:
            app_logger.error(f"Erro ao obter configuração de backup: {e}")
            return jsonify({
                'success': False,
                'error': f"Erro ao obter configuração: {str(e)}"
            }), 500
    
    # Se for método POST, atualiza a configuração
    try:
        dados = request.json
        novo_diretorio = dados.get('diretorio')
        
        if not novo_diretorio or not isinstance(novo_diretorio, str):
            return jsonify({
                'success': False,
                'error': 'Diretório inválido'
            }), 400
        
        # Verifica se o diretório é válido
        try:
            # Normaliza o caminho para o sistema atual
            novo_diretorio = os.path.normpath(novo_diretorio)
            
            # Testa se é possível criar o diretório se não existir
            if not os.path.exists(novo_diretorio):
                os.makedirs(novo_diretorio)
                app_logger.info(f"Novo diretório de backup criado: {novo_diretorio}")
            
            # Testa permissões de escrita
            test_file = os.path.join(novo_diretorio, 'test_permissions.tmp')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f"Diretório inválido ou sem permissões: {str(e)}"
            }), 400
        
        # Atualiza a configuração no banco de dados
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE configuracoes 
                SET valor = ?, data_modificacao = CURRENT_TIMESTAMP
                WHERE chave = "backup_dir"
            ''', (novo_diretorio,))
            
            if cursor.rowcount == 0:
                cursor.execute('''
                    INSERT INTO configuracoes (chave, valor, descricao)
                    VALUES (?, ?, ?)
                ''', ('backup_dir', novo_diretorio, 'Diretório para armazenar backups do sistema'))
            
            conn.commit()
        
        # Atualiza a variável global para o novo diretório
        global BACKUP_DIR
        BACKUP_DIR = novo_diretorio
        
        app_logger.info(f"Diretório de backup atualizado para: {novo_diretorio}")
        
        return jsonify({
            'success': True,
            'diretorio_atual': novo_diretorio,
            'mensagem': 'Configuração atualizada com sucesso!'
        })
    except Exception as e:
        app_logger.error(f"Erro ao configurar diretório de backup: {e}")
        return jsonify({
            'success': False,
            'error': f"Erro ao atualizar configuração: {str(e)}"
        }), 500

# Rota para realizar backup manual
@app.route('/system/backup/manual', methods=['POST'])
@login_required
def realizar_backup_manual():
    """
    Endpoint para realizar um backup manual do banco de dados
    """
    try:
        # Verifica se o usuário é administrador
        if session.get('role') != 'admin':
            return jsonify({
                'success': False,
                'error': 'Acesso não autorizado'
            }), 403
        
        # Realiza o backup
        sucesso, mensagem = realizar_backup_diario()
        
        # Retorna o resultado
        return jsonify({
            'success': sucesso,
            'mensagem': mensagem
        })
    except Exception as e:
        app_logger.error(f"Erro ao realizar backup manual: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Erro ao realizar backup manual: {str(e)}"
        }), 500

# ========================================================
# GERENCIAMENTO DE USUÁRIOS
# ========================================================

# Rota para listar usuários
@app.route('/usuarios', methods=['GET'])
@login_required
def listar_usuarios():
    try:
        if session.get('role') != 'admin':
            app_logger.warning(f"Usuário {session.get('username', 'desconhecido')} tentou listar usuários sem permissão.")
            return jsonify({'error': 'Acesso não autorizado'}), 403
            
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, role, created_at 
                FROM usuarios 
                ORDER BY created_at DESC
            ''')
            usuarios = cursor.fetchall()
            
            # Registra sucesso no log
            app_logger.info(f"Usuário {session.get('username', 'desconhecido')} listou usuários com sucesso.")
            
            # Retorna a lista de usuários
            return jsonify([{
                'id': u[0],
                'username': u[1],
                'role': u[2],
                'created_at': u[3]
            } for u in usuarios])
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao listar usuários: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'error': str(e)}), 500

# Rota para criar um novo usuário
@app.route('/usuarios', methods=['POST'])
@login_required
def criar_usuario():
    if session.get('role') != 'admin':
        app_logger.warning(f"Usuário {session.get('username', 'desconhecido')} tentou criar usuário sem permissão.")
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Obtém os dados do novo usuário do corpo da requisição
        data = request.json
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'guest')

        # Validação básica dos dados recebidos
        if not username or not password:
            app_logger.warning("Tentativa de criar usuário sem username ou password.")
            return jsonify({'error': 'Username e password são obrigatórios'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Gera o hash da senha
            hashed_password = generate_password_hash(password)
            
            # Insere o novo usuário no banco de dados
            cursor.execute(
                'INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)',
                (username, hashed_password, role)
            )
            
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Usuário {session.get('username', 'desconhecido')} criou usuário {username} com papel {role}.")
            
            # Retorna confirmação
            return jsonify({'message': 'User created successfully'}), 201
    except sqlite3.IntegrityError:
        # Registra falha no log
        app_logger.warning(f"Tentativa de criar usuário com username já existente: {username}")
        
        # Retorna mensagem de erro específica
        return jsonify({'error': 'Username already exists'}), 409
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao criar usuário: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'error': 'Error creating user'}), 500

# Rota para atualizar um usuário existente
@app.route('/usuarios/<int:id>', methods=['PUT'])
@login_required
def atualizar_usuario(id):
    if session.get('role') != 'admin':
        app_logger.warning(f"Usuário {session.get('username', 'desconhecido')} tentou atualizar usuário sem permissão.")
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Obtém os dados do usuário do corpo da requisição
        data = request.json
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Primeiro verifica se é uma tentativa de editar o admin
            cursor.execute('SELECT username FROM usuarios WHERE id = ?', (id,))
            current_user = cursor.fetchone()
            
            if not current_user:
                app_logger.warning(f"Tentativa de atualizar usuário com ID inexistente: {id}")
                return jsonify({'error': 'User not found'}), 404

            # Verifica se é o usuário admin
            if current_user[0] == 'admin':
                # Se for o admin, só permite alterar a senha
                if username != 'admin' or role != 'admin':
                    app_logger.warning("Tentativa de modificar username ou role do admin.")
                    return jsonify({'error': 'Cannot modify admin username or role'}), 403
                
                if not password:
                    app_logger.warning("Tentativa de alterar senha do admin sem fornecer nova senha.")
                    return jsonify({'error': 'Password is required for admin'}), 400

                hashed_password = generate_password_hash(password)
                cursor.execute(
                    'UPDATE usuarios SET password=? WHERE id=?',
                    (hashed_password, id)
                )
                app_logger.info(f"Senha do admin alterada por {session.get('username', 'desconhecido')}.")
            else:
                # Se não for o admin, verifica se não está tentando usar o username 'admin'
                if username == 'admin':
                    app_logger.warning("Tentativa de usar username reservado 'admin'.")
                    return jsonify({'error': 'Cannot use reserved username'}), 403

                if password:
                    hashed_password = generate_password_hash(password)
                    cursor.execute(
                        'UPDATE usuarios SET username=?, password=?, role=? WHERE id=?',
                        (username, hashed_password, role, id)
                    )
                else:
                    cursor.execute(
                        'UPDATE usuarios SET username=?, role=? WHERE id=?',
                        (username, role, id)
                    )
                app_logger.info(f"Usuário {username} atualizado por {session.get('username', 'desconhecido')}.")
            
            # Confirma a transação
            conn.commit()
            
            # Retorna confirmação
            return jsonify({'message': 'User updated successfully'})
            
    except sqlite3.IntegrityError:
        # Registra falha no log
        app_logger.warning(f"Tentativa de atualizar usuário para username já existente: {username}")
        
        # Retorna mensagem de erro específica
        return jsonify({'error': 'Username already exists'}), 409
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao atualizar usuário: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'error': 'Error updating user'}), 500

# Rota para excluir um usuário existente
@app.route('/usuarios/<int:id>', methods=['DELETE'])
@login_required
def excluir_usuario(id):
    if session.get('role') != 'admin':
        app_logger.warning(f"Usuário {session.get('username', 'desconhecido')} tentou excluir usuário sem permissão.")
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Não permite excluir o próprio usuário
            if id == session.get('user_id'):
                app_logger.warning(f"Usuário {session.get('username', 'desconhecido')} tentou se autoexcluir.")
                return jsonify({'error': 'Cannot delete your own user'}), 400
                
            # Exclui o usuário
            cursor.execute('DELETE FROM usuarios WHERE id=?', (id,))
            
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Usuário {id} excluído por {session.get('username', 'desconhecido')}.")
            
            # Retorna confirmação
            return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao excluir usuário: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'error': 'Error deleting user'}), 500

# Rota para obter detalhes de um usuário específico
@app.route('/usuarios/<int:id>', methods=['GET'])
@login_required
def obter_usuario(id):
    if session.get('role') != 'admin':
        app_logger.warning(f"Usuário {session.get('username', 'desconhecido')} tentou obter detalhes de usuário sem permissão.")
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Seleciona os dados do usuário
            cursor.execute('SELECT id, username, role, created_at FROM usuarios WHERE id = ?', (id,))
            usuario = cursor.fetchone()
            
            # Verifica se o usuário foi encontrado
            if not usuario:
                app_logger.warning(f"Usuário não encontrado com ID: {id}")
                return jsonify({'error': 'User not found'}), 404
                
            # Retorna os dados do usuário
            return jsonify({
                'id': usuario[0],
                'username': usuario[1],
                'role': usuario[2],
                'created_at': usuario[3]
            })
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao obter usuário: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'error': 'Error getting user'}), 500

# ========================================================
# API DE AGENDAMENTOS
# ========================================================

# Rota para criar um novo agendamento
@app.route('/agendamentos', methods=['POST'])
@login_required
def criar_agendamento():
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Obtém os dados do agendamento do corpo da requisição
        dados = request.json
        chamado_id = dados.get('chamado_id')
        data_agendamento = dados.get('data_agendamento')
        data_final_agendamento = dados.get('data_final_agendamento')
        observacoes = dados.get('observacoes', '')

        # Validação básica dos dados recebidos
        if not chamado_id or not data_agendamento or not data_final_agendamento:
            app_logger.warning("Tentativa de criar agendamento sem dados completos")
            return jsonify({'erro': 'Chamado e data são obrigatórios'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verifica se já existe agendamento para este chamado
            cursor.execute('''
                SELECT a.data_agendamento, a.data_final_agendamento, c.protocolo
                FROM agendamentos a
                JOIN chamados c ON a.chamado_id = c.id
                WHERE a.chamado_id = ?
            ''', (chamado_id,))
            
            agendamento_existente = cursor.fetchone()
            
            if agendamento_existente:
                app_logger.warning(f"Agendamento conflitante encontrado para o chamado {chamado_id}")
                return jsonify({
                    'erro': 'Protocolo já agendado',
                    'detalhes': {
                        'data_inicio': agendamento_existente[0],
                        'data_fim': agendamento_existente[1],
                        'protocolo': agendamento_existente[2]
                    }
                }), 409

            # Insere o novo agendamento no banco de dados
            cursor.execute('''
                INSERT INTO agendamentos (chamado_id, data_agendamento, data_final_agendamento, observacoes)
                VALUES (?, ?, ?, ?)
            ''', (chamado_id, data_agendamento, data_final_agendamento, observacoes))
            
            # Obtém o ID do novo agendamento
            agendamento_id = cursor.lastrowid
            
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Agendamento criado com sucesso para o chamado {chamado_id}")
            
            # Retorna confirmação com o ID gerado
            return jsonify({
                'mensagem': 'Agendamento criado com sucesso!',
                'id': agendamento_id
            }), 201
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao criar agendamento: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao criar agendamento'}), 500

# Rota para listar os agendamentos
@app.route('/agendamentos', methods=['GET'])
@login_required
def listar_agendamentos():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para selecionar agendamentos com dados adicionais
            cursor.execute('''
                SELECT 
                    ag.id, 
                    ag.chamado_id, 
                    ag.data_agendamento, 
                    ag.data_final_agendamento, 
                    ch.status AS chamado_status,
                    ag.observacoes,
                    ch.protocolo,
                    ch.assunto,
                    cl.nome AS cliente_nome,
                    cl.telefone AS cliente_telefone,
                    cl.rua || ', ' || cl.numero || 
                        CASE WHEN cl.complemento IS NOT NULL AND cl.complemento != '' 
                            THEN ' - ' || cl.complemento ELSE '' END || 
                        ' - ' || cl.bairro || ' - ' || cl.cidade || '/' || cl.estado AS endereco_completo
                FROM agendamentos ag
                JOIN chamados ch ON ag.chamado_id = ch.id
                LEFT JOIN clientes cl ON ch.cliente_id = cl.id
            ''')
            agendamentos = cursor.fetchall()
            
            # Converte os resultados em uma lista de dicionários
            agendamentos_list = []
            for agendamento in agendamentos:
                agendamentos_list.append({
                    'id': agendamento[0],
                    'chamado_id': agendamento[1],
                    'data_agendamento': agendamento[2],
                    'data_final_agendamento': agendamento[3],
                    'chamado_status': agendamento[4],
                    'observacoes': agendamento[5],
                    'protocolo': agendamento[6],
                    'assunto': agendamento[7],
                    'cliente_nome': agendamento[8] or 'Cliente removido',
                    'cliente_telefone': agendamento[9] or 'N/A',
                    'endereco': agendamento[10] or 'Endereço não disponível'
                })
            
            # Registra sucesso no log
            app_logger.info("Agendamentos listados com sucesso")
            
            # Retorna a lista de agendamentos
            return jsonify(agendamentos_list), 200
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao listar agendamentos: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao listar agendamentos'}), 500

# Rota para excluir um agendamento existente
@app.route('/agendamentos/<int:id>', methods=['DELETE'])
@login_required
def excluir_agendamento(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para excluir um agendamento existente
            cursor.execute('DELETE FROM agendamentos WHERE id=?', (id,))
            
            # Verifica se o agendamento foi encontrado
            if cursor.rowcount == 0:
                app_logger.warning(f"Tentativa de excluir agendamento inexistente com ID: {id}")
                return jsonify({'erro': 'Agendamento não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Agendamento excluído com sucesso. ID: {id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Agendamento excluído com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao excluir agendamento: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao excluir agendamento'}), 500

# Rota para atualizar um agendamento existente
@app.route('/agendamentos/<int:id>', methods=['PUT'])
@login_required
def atualizar_agendamento(id):
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Obtém os dados do agendamento do corpo da requisição
        dados = request.json
        data_agendamento = dados.get('data_agendamento')
        data_final_agendamento = dados.get('data_final_agendamento')
        observacoes = dados.get('observacoes')
        status = dados.get('status')

        # Validação básica dos dados recebidos
        if not data_agendamento:
            app_logger.warning("Tentativa de atualizar agendamento sem data")
            return jsonify({'erro': 'Data de agendamento é obrigatória'}), 400

        # Se não receber a data final, usa a data inicial + 1 hora
        if not data_final_agendamento:
            try:
                # Tenta analisar a data com diferentes formatos
                data_inicial = datetime.fromisoformat(data_agendamento.replace('Z', '+00:00'))
                data_final = data_inicial + timedelta(hours=1)
                data_final_agendamento = data_final.isoformat()
            except ValueError as e:
                try:
                    # Tenta analisar a data com um formato diferente
                    data_inicial = datetime.strptime(data_agendamento, '%Y-%m-%dT%H:%M:%S%z')
                    data_final = data_inicial + timedelta(hours=1)
                    data_final_agendamento = data_final.isoformat()
                except ValueError as e2:
                    app_logger.error(f"Erro ao processar data: {e2}")
                    return jsonify({'erro': 'Formato de data inválido'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Constrói a query dinamicamente baseado nos campos recebidos
            campos_atualizacao = []
            valores = []
            
            campos_atualizacao.append('data_agendamento=?')
            valores.append(data_agendamento)
            
            campos_atualizacao.append('data_final_agendamento=?')
            valores.append(data_final_agendamento)
            
            if observacoes is not None:
                campos_atualizacao.append('observacoes=?')
                valores.append(observacoes)
                
            if status:
                campos_atualizacao.append('status=?')
                valores.append(status)
                
            # Adiciona o ID do agendamento aos valores
            valores.append(id)
            
            # Monta e executa a query
            query = f"UPDATE agendamentos SET {', '.join(campos_atualizacao)} WHERE id=?"
            cursor.execute(query, valores)
            
            # Verifica se o agendamento foi encontrado
            if cursor.rowcount == 0:
                app_logger.warning(f"Tentativa de atualizar agendamento inexistente com ID: {id}")
                return jsonify({'erro': 'Agendamento não encontrado'}), 404
                
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Agendamento atualizado com sucesso. ID: {id}")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Agendamento atualizado com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao atualizar agendamento: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': f'Erro ao atualizar agendamento: {str(e)}'}), 500

# Rota para obter detalhes de um agendamento específico
@app.route('/agendamentos/<int:id>', methods=['GET'])
@login_required
def obter_agendamento(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para selecionar os dados do agendamento com informações adicionais
            cursor.execute('''
                SELECT 
                    ag.id, 
                    ag.chamado_id, 
                    ag.data_agendamento, 
                    ag.data_final_agendamento, 
                    ch.status AS chamado_status,
                    ag.observacoes,
                    ch.protocolo,
                    ch.assunto,
                    ch.descricao,
                    cl.nome AS cliente_nome,
                    cl.telefone AS cliente_telefone,
                    cl.rua || ', ' || cl.numero || 
                        CASE WHEN cl.complemento IS NOT NULL AND cl.complemento != '' 
                            THEN ' - ' || cl.complemento ELSE '' END || 
                        ' - ' || cl.bairro || ' - ' || cl.cidade || '/' || cl.estado AS endereco_completo
                FROM agendamentos ag
                JOIN chamados ch ON ag.chamado_id = ch.id
                LEFT JOIN clientes cl ON ch.cliente_id = cl.id
                WHERE ag.id = ?
            ''', (id,))
            
            agendamento = cursor.fetchone()
            
            # Verifica se o agendamento foi encontrado
            if not agendamento:
                app_logger.warning(f"Agendamento não encontrado: {id}")
                return jsonify({'erro': 'Agendamento não encontrado'}), 404
                
            # Converte os resultados em um dicionário
            resultado = {
                'id': agendamento[0],
                'chamado_id': agendamento[1],
                'data_agendamento': agendamento[2],
                'data_final_agendamento': agendamento[3],
                'chamado_status': agendamento[4],
                'observacoes': agendamento[5],
                'protocolo': agendamento[6],
                'assunto': agendamento[7],
                'descricao': agendamento[8],
                'cliente_nome': agendamento[9] or 'Cliente removido',
                'cliente_telefone': agendamento[10] or 'N/A',
                'endereco': agendamento[11] or 'Endereço não disponível'
            }
            
            # Registra sucesso no log
            app_logger.info(f"Detalhes do agendamento obtidos com sucesso: {id}")
            
            # Retorna os dados do agendamento
            return jsonify(resultado)
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao obter detalhes do agendamento: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao obter detalhes do agendamento'}), 500

# Rota para finalizar a ordem de serviço (adicionar andamento e finalizar chamado)
@app.route('/chamados/<int:chamado_id>/finalizar-ordem-servico', methods=['POST'])
@login_required
def finalizar_ordem_servico(chamado_id):
    try:
        # Log dos dados recebidos para depuração
        dados = request.json
        app_logger.info(f"Dados recebidos para finalizar ordem: {dados}")
        
        # Validação mais robusta para o relatório
        relatorio_visita = None
        if dados and 'relatorio_visita' in dados:
            relatorio_visita = dados.get('relatorio_visita', '').strip()
        
        agendamento_id = dados.get('agendamento_id') if dados else None
        
        # Log do relatório para depuração
        app_logger.info(f"Relatório extraído: '{relatorio_visita}', comprimento: {len(relatorio_visita) if relatorio_visita else 0}")

        # Verificação mais detalhada
        if not relatorio_visita:
            app_logger.warning(f"Relatório vazio ou ausente para chamado {chamado_id}")
            return jsonify({'erro': 'O relatório da visita é obrigatório'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Verificar se o chamado existe
            cursor.execute('SELECT id FROM chamados WHERE id = ?', (chamado_id,))
            if not cursor.fetchone():
                app_logger.warning(f"Chamado não encontrado ao finalizar ordem: {chamado_id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404

            # Adicionar andamento
            data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('''
                INSERT INTO chamado_andamentos (chamado_id, data_hora, texto)
                VALUES (?, ?, ?)
            ''', (chamado_id, data_hora, relatorio_visita))
            
            novo_andamento_id = cursor.lastrowid
            app_logger.info(f"Andamento {novo_andamento_id} criado com sucesso para chamado {chamado_id}")

            # Finalizar chamado
            data_fechamento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('''
                UPDATE chamados
                SET status = ?, data_fechamento = ?
                WHERE id = ?
            ''', ('Finalizado', data_fechamento, chamado_id))
            
            app_logger.info(f"Chamado {chamado_id} marcado como finalizado")

            # Atualizar status do agendamento
            if agendamento_id:
                cursor.execute('''
                    UPDATE agendamentos
                    SET status = 'Finalizado'
                    WHERE id = ?
                ''', (agendamento_id,))
                app_logger.info(f"Agendamento {agendamento_id} marcado como finalizado")

            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Ordem de serviço finalizada com sucesso para o chamado {chamado_id}")
            
            # Retorna confirmação
            return jsonify({
                'mensagem': 'Ordem de serviço finalizada com sucesso!',
                'status': 'Finalizado',
                'data_fechamento': data_fechamento
            })
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao finalizar ordem de serviço: {str(e)}", exc_info=True)
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': f'Erro ao finalizar ordem de serviço: {str(e)}'}), 500

# Rota para buscar chamados abertos com base em um termo de pesquisa
@app.route('/chamados/buscar-abertos', methods=['GET'])
@login_required
def buscar_chamados_abertos():
    try:
        # Obtém o termo de pesquisa da query string
        termo = request.args.get('termo', '')
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para buscar chamados abertos com base no termo de pesquisa
            cursor.execute('''
                SELECT 
                    c.id,
                    c.protocolo,
                    c.assunto,
                    cl.nome as cliente_nome
                FROM chamados c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                WHERE c.status = 'Aberto'
                AND (
                    c.protocolo LIKE ? 
                    OR c.assunto LIKE ? 
                    OR cl.nome LIKE ?
                    OR c.id LIKE ?
                )
                ORDER BY c.data_abertura DESC
                LIMIT 10
            ''', ('%' + termo + '%', '%' + termo + '%', '%' + termo + '%', '%' + termo + '%'))
            
            chamados = cursor.fetchall()
            
            # Registra operação no log
            app_logger.info(f"Chamados abertos buscados com o termo: {termo}")
            
            # Retorna os chamados encontrados
            return jsonify([{
                'id': c[0],
                'protocolo': c[1],
                'assunto': c[2],
                'cliente_nome': c[3] or 'Cliente removido'
            } for c in chamados])
            
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao buscar chamados abertos: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao buscar chamados'}), 500

# ========================================================
# ROTA PARA ATUALIZAR ENDEREÇO DE CLIENTE
# ========================================================

# Rota para atualizar o endereço de um cliente existente
@app.route('/clientes/<int:id>/endereco', methods=['PUT'])
@login_required
def atualizar_endereco(id):
    try:
        dados = sanitize_input(request.json)  # Sanitiza os dados recebidos
        
        # Obtém os dados do endereço do corpo da requisição
        dados = request.json
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para atualizar o endereço do cliente
            cursor.execute('''
                UPDATE clientes SET
                    cep = ?,
                    rua = ?,
                    numero = ?,
                    complemento = ?,
                    bairro = ?,
                    cidade = ?,
                    estado = ?,
                    pais = ?
                WHERE id = ?
            ''', (
                dados.get('cep'),
                dados.get('rua'),
                dados.get('numero'),
                dados.get('complemento'),
                dados.get('bairro'),
                dados.get('cidade'),
                dados.get('estado'),
                dados.get('pais'),
                id
            ))
            
            # Confirma a transação
            conn.commit()
            
            # Registra sucesso no log
            app_logger.info(f"Endereço do cliente {id} atualizado com sucesso.")
            
            # Retorna confirmação
            return jsonify({'mensagem': 'Endereço atualizado com sucesso!'})
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao atualizar endereço: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao atualizar endereço'}), 500

# Rota para obter detalhes de um cliente específico
@app.route('/clientes/<int:id>', methods=['GET'])
@login_required
def obter_cliente(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Query SQL para selecionar os dados do cliente
            cursor.execute("""
                SELECT id, nome, nome_fantasia, email, telefone, ativo,
                    tipo_cliente, cnpj_cpf, ie_rg, contribuinte_icms,
                    rg_orgao_emissor, nacionalidade, naturalidade,
                    estado_nascimento, data_nascimento, sexo, profissao,
                    estado_civil, inscricao_municipal, cep, rua, numero,
                    complemento, bairro, cidade, estado, pais
                FROM clientes 
                WHERE id = ?
            """, (id,))
            
            cliente = cursor.fetchone()
            
            # Verifica se o cliente foi encontrado
            if not cliente:
                app_logger.warning(f"Cliente não encontrado: {id}")
                return jsonify({'erro': 'Cliente não encontrado'}), 404

            # Converte a tupla em um dicionário para facilitar o acesso no frontend
            return jsonify({
                'id': cliente[0],
                'nome': cliente[1],
                'nome_fantasia': cliente[2],
                'email': cliente[3],
                'telefone': cliente[4],
                'ativo': cliente[5],
                'tipo_cliente': cliente[6],
                'cnpj_cpf': cliente[7],
                'ie_rg': cliente[8],
                'contribuinte_icms': cliente[9],
                'rg_orgao_emissor': cliente[10],
                'nacionalidade': cliente[11],
                'naturalidade': cliente[12],
                'estado_nascimento': cliente[13],
                'data_nascimento': cliente[14],
                'sexo': cliente[15],
                'profissao': cliente[16],
                'estado_civil': cliente[17],
                'inscricao_municipal': cliente[18],
                'cep': cliente[19],
                'rua': cliente[20],
                'numero': cliente[21],
                'complemento': cliente[22],
                'bairro': cliente[23],
                'cidade': cliente[24],
                'estado': cliente[25],
                'pais': cliente[26]
            })
    except Exception as e:
        # Registra falha no log
        app_logger.error(f"Erro ao obter cliente: {e}")
        
        # Retorna mensagem de erro genérica
        return jsonify({'erro': 'Erro ao obter cliente'}), 500

# ========================================================
# ADMINISTRAÇÃO DO BANCO DE DADOS - NOVOS ENDPOINTS
# ========================================================

@app.route('/admin/database/stats')
@login_required
def database_stats():
    """
    Obtém estatísticas gerais do banco de dados
    """
    if session.get('role') != 'admin':
        return jsonify({'error': 'Acesso negado'}), 403

    try:
        # Obtém o tamanho do arquivo de banco de dados
        db_size = os.path.getsize(DATABASE)
        size_in_mb = db_size / (1024 * 1024)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Obtém a lista de tabelas
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Remove tabelas do sistema SQLite
            tables = [table for table in tables if not table.startswith('sqlite_')]
            
            return jsonify({
                'total_size': f'{size_in_mb:.2f} MB',
                'raw_size': db_size,
                'table_count': len(tables),
                'tables': tables
            })
    except Exception as e:
        app_logger.error(f"Erro ao obter estatísticas do banco de dados: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/admin/database/tables')
@login_required
def list_tables():
    """
    Lista todas as tabelas do banco de dados
    """
    if session.get('role') != 'admin':
        return jsonify({'error': 'Acesso negado'}), 403
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
            return jsonify(tables)
    except Exception as e:
        app_logger.error(f"Erro ao listar tabelas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/admin/database/tables/<table_name>/data')
@login_required
def table_data(table_name):
    """
    Obtém dados de uma tabela específica
    """
    if session.get('role') != 'admin':
        return jsonify({'error': 'Acesso negado'}), 403

    try:
        # Sanitizar nome da tabela para evitar SQL injection
        # Os nomes de tabela SQLite não podem conter caracteres especiais, apenas letras, números e underscores
        if not re.match(r'^[a-zA-Z0-9_]+$', table_name):
            return jsonify({'error': 'Nome de tabela inválido'}), 400

        with get_db_connection() as conn:
            # Tornar o dicionário acessível por nome de coluna
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Verificar se a tabela existe
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                return jsonify({'error': 'Tabela não encontrada'}), 404

            # Obter informações sobre colunas
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [row['name'] for row in cursor.fetchall()]

            # Obter todos os registros
            cursor.execute(f"SELECT * FROM {table_name}")
            records = [dict(row) for row in cursor.fetchall()]

            # Estimar tamanho da tabela
            estimated_size = 0
            for record in records:
                for key, value in record.items():
                    if value is not None:
                        estimated_size += len(value.encode('utf-8')) if isinstance(value, str) else 8
            # Converter para KB ou MB
            size_text = ''
            if estimated_size > 1024 * 1024:
                size_text = f"{estimated_size / (1024 * 1024):.2f} MB"
            elif estimated_size > 1024:
                size_text = f"{estimated_size / 1024:.2f} KB"
            else:
                size_text = f"{estimated_size} bytes"

            # Registra acesso no log
            app_logger.info(f"Administrador {session.get('username')} visualizou dados da tabela {table_name}")

            return jsonify({
                'columns': columns,
                'records': records,
                'count': len(records),
                'size': size_text
            })
    except Exception as e:
        app_logger.error(f"Erro ao obter dados da tabela {table_name}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/admin/database/tables/<table_name>/import', methods=['POST'])
@login_required
def import_table_data(table_name):
    """
    Importa dados para uma tabela específica do banco de dados
    Suporta formatos CSV e XLSX
    """
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Acesso negado'}), 403
    
    try:
        # Sanitizar nome da tabela para evitar SQL injection
        if not re.match(r'^[a-zA-Z0-9_]+$', table_name):
            return jsonify({'success': False, 'error': 'Nome de tabela inválido'}), 400
        
        # Obter os dados enviados
        dados = request.json
        if not dados or not isinstance(dados.get('data'), list) or not dados.get('columns'):
            return jsonify({'success': False, 'error': 'Dados de importação inválidos'}), 400
        
        # Verificar se a tabela existe
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                return jsonify({'success': False, 'error': 'Tabela não encontrada'}), 404
            
            # Obter informações sobre colunas da tabela
            cursor.execute(f"PRAGMA table_info({table_name})")
            tabela_colunas = [row[1] for row in cursor.fetchall()]
            
            # Verificar modo de importação
            import_mode = dados.get('mode', 'append')
            
            # Para o modo 'replace', excluir registros existentes
            if import_mode == 'replace':
                try:
                    cursor.execute(f"DELETE FROM {table_name}")
                    app_logger.warning(f"Administrador {session.get('username')} excluiu todos os registros da tabela {table_name} para importação")
                except Exception as e:
                    return jsonify({'success': False, 'error': f'Erro ao limpar tabela: {str(e)}'}), 500
            
            # Validar colunas enviadas contra colunas da tabela
            colunas_importacao = dados.get('columns', [])
            colunas_validas = [col for col in colunas_importacao if col in tabela_colunas]
            
            if not colunas_validas:
                return jsonify({'success': False, 'error': 'Nenhuma coluna válida encontrada para importação'}), 400
            
            # Preparar para inserção em lote
            registros_importados = 0
            registros_falhos = 0
            
            # Criar sql de inserção dinâmico
            colunas_str = ', '.join(colunas_validas)
            placeholders = ', '.join(['?' for _ in colunas_validas])
            sql = f"INSERT INTO {table_name} ({colunas_str}) VALUES ({placeholders})"
            
            # Processar lote de registros
            for registro in dados['data']:
                try:
                    # Extrair valores nas colunas válidas, convertendo tipos de dados
                    values = []
                    for col in colunas_validas:
                        val = registro.get(col, '')
                        # Converter None para string vazia
                        if val is None:
                            val = ''
                        # Converter valores numéricos para string
                        elif isinstance(val, (int, float)):
                            val = str(val)
                        # Converter booleanos para 0/1
                        elif isinstance(val, bool):
                            val = '1' if val else '0'
                        # Converter datetime para string ISO
                        elif hasattr(val, 'isoformat'):
                            val = val.isoformat()
                        values.append(val)
                    
                    # Inserir registro
                    cursor.execute(sql, values)
                    registros_importados += 1
                except Exception as e:
                    app_logger.error(f"Erro ao importar registro para tabela {table_name}: {e}")
                    registros_falhos += 1
            
            # Commit das alterações
            conn.commit()
            
            # Registrar no log
            app_logger.info(f"Administrador {session.get('username')} importou {registros_importados} registros para a tabela {table_name}")
            
            # Resultado da importação
            return jsonify({
                'success': True,
                'message': f'Importação concluída. {registros_importados} registros importados com sucesso. {registros_falhos} falhas.'
            })
            
    except Exception as e:
        app_logger.error(f"Erro geral na importação para {table_name}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/export/<format>/<table_name>')
@login_required
def export_table(format, table_name):
    """
    Exporta dados de uma tabela em formato CSV ou XLSX
    """
    if session.get('role') != 'admin':
        return jsonify({'error': 'Acesso negado'}), 403

    try:
        # Sanitizar nome da tabela
        if not re.match(r'^[a-zA-Z0-9_]+$', table_name):
            return jsonify({'error': 'Nome de tabela inválido'}), 400

        with get_db_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Verificar se a tabela existe
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                return jsonify({'error': 'Tabela não encontrada'}), 404

            # Obter dados
            cursor.execute(f"SELECT * FROM {table_name}")
            records = cursor.fetchall()
            
            if not records:
                return jsonify({'error': 'Nenhum dado encontrado'}), 404

            # Obter nomes das colunas
            columns = [description[0] for description in cursor.description]

            if format.lower() == 'xlsx':
                # Criar arquivo Excel
                wb = Workbook()
                ws = wb.active
                ws.title = table_name

                # Adicionar cabeçalhos
                ws.append(columns)

                # Adicionar dados
                for record in records:
                    ws.append([record[col] for col in columns])

                # Salvar em buffer de memória
                excel_file = BytesIO()
                wb.save(excel_file)
                excel_file.seek(0)

                return send_file(
                    excel_file,
                    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    as_attachment=True,
                    download_name=f'{table_name}_export.xlsx'
                )

            elif format.lower() == 'csv':
                # Criar buffer de memória para o CSV
                csv_file = BytesIO()
                
                # Escrever com encoding UTF-8 e BOM para suporte a caracteres especiais no Excel
                csv_file.write('\ufeff'.encode('utf-8'))
                
                # Converter dados para CSV
                csv_content = []
                
                # Adicionar cabeçalhos
                csv_content.append(','.join(f'"{col}"' for col in columns))
                
                # Adicionar dados
                for record in records:
                    # Tratar valores especiais e escapar aspas
                    row_values = []
                    for col in columns:
                        value = record[col]
                        if value is None:
                            value = ''
                        else:
                            value = str(value).replace('"', '""')  # Escapar aspas
                        row_values.append(f'"{value}"')
                    csv_content.append(','.join(row_values))
                
                # Juntar linhas com quebra de linha Windows
                csv_data = '\r\n'.join(csv_content)
                
                # Escrever no buffer
                csv_file.write(csv_data.encode('utf-8'))
                csv_file.seek(0)
                
                return send_file(
                    csv_file,
                    mimetype='text/csv',
                    as_attachment=True,
                    download_name=f'{table_name}_export.csv'
                )
            else:
                return jsonify({'error': 'Formato não suportado'}), 400

    except Exception as e:
        app_logger.error(f"Erro ao exportar tabela {table_name}: {e}")
        return jsonify({'error': str(e)}), 500

# ========================================================
# INICIALIZAÇÃO DO APLICATIVO
# ========================================================

if __name__ == '__main__':
    # Esta parte é usada apenas quando você executa o arquivo diretamente
    # para desenvolvimento, não quando usando Gunicorn
    app.run(host='0.0.0.0', port=5000, debug=True)
