import os
import math
from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for, g
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
import logging
from logging.handlers import RotatingFileHandler
from contextlib import contextmanager
from time import sleep
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
import secrets

# Define diretorios base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
DATABASE = os.path.join(BASE_DIR, 'database.db')

# Configuração de fallback para logs críticos
def setup_critical_logger():
    critical_logger = logging.getLogger('critical')
    critical_handler = logging.StreamHandler()
    critical_handler.setLevel(logging.CRITICAL)
    critical_formatter = logging.Formatter('CRITICAL - %(asctime)s - %(message)s')
    critical_handler.setFormatter(critical_formatter)
    critical_logger.addHandler(critical_handler)
    return critical_logger

# Inicializa logger crítico para erros de setup
critical_logger = setup_critical_logger()

try:
    # Garante que o diretório de logs existe e tem permissões corretas
    if not os.path.exists(LOGS_DIR):
        os.makedirs(LOGS_DIR)
    
    # Testa permissões de escrita
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

# Inicializa o aplicativo Flask
app = Flask(__name__)
CORS(app)

# Configuração melhorada dos handlers de log
def setup_logging():
    try:
        # Formatadores
        file_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - [%(name)s:%(funcName)s:%(lineno)d] - %(message)s'
        )
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )

        # Handler para erros
        error_handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'error.log'),
            maxBytes=5*1024*1024,
            backupCount=5,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)

        # Handler para segurança
        security_handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'security.log'),
            maxBytes=5*1024*1024,
            backupCount=5,
            encoding='utf-8'
        )
        security_handler.setLevel(logging.WARNING)
        security_handler.setFormatter(file_formatter)

        # Handler para acesso
        access_handler = RotatingFileHandler(
            os.path.join(LOGS_DIR, 'access.log'),
            maxBytes=5*1024*1024,
            backupCount=5,
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

        # Remove handlers existentes
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # Adiciona novos handlers
        handlers = {
            'error': error_handler,
            'security': security_handler,
            'access': access_handler,
            'console': console_handler
        }

        # Configura handlers no root logger
        for handler in handlers.values():
            root_logger.addHandler(handler)

        return handlers

    except Exception as e:
        critical_logger.critical(f"Erro fatal na configuração de logging: {e}")
        raise SystemExit(1)

# Inicializa os loggers específicos
try:
    handlers = setup_logging()

    # Logger para autenticação
    auth_logger = logging.getLogger('auth')
    auth_logger.setLevel(logging.INFO)
    auth_logger.addHandler(handlers['security'])
    auth_logger.propagate = False  # Evita duplicação de logs

    # Logger para banco de dados
    db_logger = logging.getLogger('database')
    db_logger.setLevel(logging.ERROR)
    db_logger.addHandler(handlers['error'])
    db_logger.propagate = False

    # Logger para aplicação
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

# Função de teste dos loggers
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

# Gera uma chave secreta aleatória se não existir
SECRET_KEY_FILE = os.path.join(BASE_DIR, 'secret_key')

def get_or_generate_secret_key():
    try:
        # Tenta ler a chave existente
        if os.path.exists(SECRET_KEY_FILE):
            with open(SECRET_KEY_FILE, 'r') as f:
                return f.read().strip()
    except:
        pass
    
    # Gera uma nova chave se não existir ou houver erro na leitura
    new_key = secrets.token_hex(32)  # Gera 32 bytes (256 bits) de dados aleatórios
    
    # Salva a nova chave
    try:
        with open(SECRET_KEY_FILE, 'w') as f:
            f.write(new_key)
        # Restrict file permissions
        os.chmod(SECRET_KEY_FILE, 0o600)
    except Exception as e:
        app_logger.error(f"Erro ao salvar chave secreta: {e}")
    
    return new_key

app.secret_key = get_or_generate_secret_key()

# Configuração do tempo da sessão
app.permanent_session_lifetime = timedelta(hours=8)  # Sessão dura 8 horas

@app.before_request
def before_request():
    # Renova a sessão se o usuário estiver ativo
    if 'user_id' in session:
        session.modified = True  # Atualiza o timestamp da sessão

# Define o número máximo de tentativas para operações no banco de dados.
MAX_RETRIES = 3

# Context manager para gerenciar a conexão com o banco de dados SQLite.
# Garante que a conexão seja fechada após o uso, mesmo em caso de exceção.
@contextmanager
def get_db_connection():
    conn = None
    try:
        # Tenta estabelecer uma conexão com o banco de dados.
        conn = sqlite3.connect(DATABASE)
        # Habilita o suporte a chaves estrangeiras no SQLite.
        conn.execute('PRAGMA foreign_keys = ON')
        # Retorna a conexão para ser usada no bloco 'with'.
        yield conn
    except sqlite3.Error as e:
        # Loga erros de banco de dados.
        app_logger.error(f"Database error: {e}")
        # Relança a exceção para que possa ser tratada em um nível superior.
        raise
    finally:
        # Garante que a conexão seja fechada, se estiver aberta.
        if conn:
            conn.close()

# Decorador para executar novamente operações no banco de dados em caso de falha.
# Útil para lidar com condições de concorrência ou problemas transitórios.
def retry_db_operation(func):
    def wrapper(*args, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                # Tenta executar a função.
                return func(*args, **kwargs)
            except sqlite3.Error as e:
                # Se atingir o número máximo de tentativas, relança a exceção.
                if attempt == MAX_RETRIES - 1:
                    raise
                # Loga um aviso sobre a falha e a tentativa de repetição.
                app_logger.warning(f"Database operation failed, retrying... ({attempt + 1}/{MAX_RETRIES})")
                # Aguarda um curto período antes de tentar novamente.
                sleep(1)
    return wrapper

# Cria as tabelas no banco de dados se elas não existirem.
# A coluna cliente_id na tabela chamados DEVE permitir valores NULL.
def criar_tabelas():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Cria a tabela clientes, se não existir.
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
        # Cria a tabela chamados, se não existir.
        # A coluna cliente_id NÃO deve conter a restrição NOT NULL.
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
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
        )''')
        # Cria a tabela chamado_andamentos para armazenar as entradas de progresso dos chamados.
        cursor.execute('''CREATE TABLE IF NOT EXISTS chamado_andamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chamado_id INTEGER NOT NULL,
            data_hora DATETIME NOT NULL,
            texto TEXT NOT NULL,
            FOREIGN KEY(chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
        )''')
        # Cria a tabela de usuários
        cursor.execute('''CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'guest',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Verifica se já existe um usuário admin
        cursor.execute('SELECT COUNT(*) FROM usuarios WHERE username = "admin"')
        if cursor.fetchone()[0] == 0:
            # Cria o usuário admin padrão
            admin_pass = generate_password_hash('admin')
            cursor.execute('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)',
                         ('admin', admin_pass, 'admin'))
        
        # Salva as alterações no banco de dados.
        conn.commit()

# Cria as tabelas ao iniciar o aplicativo
criar_tabelas()

# Adiciona as colunas 'protocolo', 'data_fechamento', 'assunto' e 'telefone' à tabela chamados,
# caso elas não existam.
def adicionar_colunas():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Obtém informações sobre as colunas da tabela chamados.
        cursor.execute("PRAGMA table_info(chamados)")
        # Extrai os nomes das colunas existentes.
        colunas = [info[1] for info in cursor.fetchall()]
        # Adiciona a coluna protocolo se ela não existir.
        if 'protocolo' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN protocolo TEXT')
        # Adiciona a coluna data_fechamento se ela não existir.
        if 'data_fechamento' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN data_fechamento TEXT')
        # Adiciona a coluna assunto se ela não existir.
        if 'assunto' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN assunto TEXT')
        # Adiciona a coluna telefone se ela não existir.
        if 'telefone' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN telefone TEXT')
        # Salva as alterações no banco de dados.
        conn.commit()

# Adiciona as colunas 'protocolo' e 'data_fechamento' se não existirem
adicionar_colunas()

# Atualiza os chamados existentes que não possuem um protocolo definido.
# Gera o protocolo com base na data de abertura e no ID do cliente.
def atualizar_chamados_sem_protocolo():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Seleciona os chamados que possuem protocolo nulo ou vazio.
        cursor.execute('SELECT id, cliente_id, data_abertura FROM chamados WHERE protocolo IS NULL OR protocolo = ""')
        chamados = cursor.fetchall()
        # Itera sobre os chamados selecionados.
        for chamado in chamados:
            id, cliente_id, data_abertura = chamado
            try:
                # Tenta converter a data de abertura para um objeto datetime.
                data_abertura_dt = datetime.strptime(data_abertura, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    # Tenta converter a data de abertura usando outro formato.
                    data_abertura_dt = datetime.strptime(data_abertura, '%d/%m/%Y %H:%M')
                except ValueError:
                    # Loga um erro se o formato da data for inválido.
                    app_logger.error(f"Formato de data inválido para o chamado ID {id}: {data_abertura}")
                    continue
            # Gera o protocolo com base na data de abertura e no ID do cliente.
            protocolo = data_abertura_dt.strftime('%d%m%Y%H%M') + str(cliente_id)
            # Atualiza o chamado com o protocolo gerado.
            cursor.execute('UPDATE chamados SET protocolo = ? WHERE id = ?', (protocolo, id))
        # Salva as alterações no banco de dados.
        conn.commit()

# Atualiza os chamados existentes ao iniciar o aplicativo
atualizar_chamados_sem_protocolo()

# Rota para servir o arquivo index.html (frontend).
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect('/login.html')
    return send_from_directory('static', 'index.html')

# Rota para servir arquivos estáticos (CSS, JavaScript, imagens, etc.).
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# Rota para listar clientes, com suporte a paginação.
@app.route('/clientes', methods=['GET'])
def listar_clientes():
    try:
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        offset = (pagina - 1) * limite
        
        # Adiciona parâmetros de ordenação
        order_field = request.args.get('order_field', default='id', type=str)
        order_order = request.args.get('order_order', default='asc', type=str)
        if order_field not in ['id', 'nome', 'nome_fantasia', 'email', 'telefone']:
            order_field = 'id'
        if order_order.lower() not in ['asc', 'desc']:
            order_order = 'asc'
        order_clause = f"ORDER BY {order_field} {order_order.upper()}"
        
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
            cursor.execute("SELECT COUNT(*) FROM clientes")
            total = cursor.fetchone()[0]
            cursor.execute(query, (limite, offset))
            clientes = cursor.fetchall()
            total_pages = math.ceil(total / limite)
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

# Rota para cadastrar um novo cliente.
@app.route('/clientes', methods=['POST'])
def cadastrar_cliente():
    try:
        # Obtém os dados do cliente do corpo da requisição.
        dados = request.json
        # Valida se o nome do cliente foi fornecido.
        if not dados or not dados.get('nome') or len(dados['nome'].strip()) == 0:
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        # Valida o formato do email, se fornecido.
        if 'email' in dados and dados['email']:
            if '@' not in dados['email'] or '.' not in dados['email']:
                return jsonify({'erro': 'Email inválido'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Define a query SQL para inserir um novo cliente.
            cursor.execute('''
                INSERT INTO clientes (
                    nome, nome_fantasia, email, telefone, ativo, tipo_cliente, cnpj_cpf,
                    ie_rg, contribuinte_icms, rg_orgao_emissor, nacionalidade, naturalidade,
                    estado_nascimento, data_nascimento, sexo, profissao, estado_civil,
                    inscricao_municipal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                dados.get('inscricao_municipal', '').strip()
            ))
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON, juntamente com o ID do novo cliente.
            return jsonify({
                'mensagem': 'Cliente cadastrado com sucesso!',
                'id': cursor.lastrowid
            }), 201
    except Exception as e:
        # Loga erros ao cadastrar cliente.
        app_logger.error(f"Erro ao cadastrar cliente: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao cadastrar cliente'}), 500

# Rota para editar um cliente existente.
@app.route('/clientes/<int:id>', methods=['PUT'])
def editar_cliente(id):
    try:
        # Obtém os dados do cliente do corpo da requisição.
        dados = request.json
        # Valida se os dados foram fornecidos e se o nome do cliente está presente.
        if not dados or 'nome' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Define a query SQL para atualizar um cliente existente.
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
            # Verifica se o cliente foi encontrado.
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Cliente não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Cliente atualizado com sucesso!'})
    except Exception as e:
        # Loga erros ao editar cliente.
        app_logger.error(f"Erro ao editar cliente: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao editar cliente'}), 500

# Rota para excluir um cliente existente.
@app.route('/clientes/<int:id>', methods=['DELETE'])
def excluir_cliente(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Atualiza todos os chamados relacionados, independente do status, removendo a referência ao cliente
            data_fechamento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute("""
                UPDATE chamados 
                SET status = 'Finalizado', data_fechamento = ?, cliente_id = NULL
                WHERE cliente_id = ?
            """, (data_fechamento, id))
            # Em seguida, exclui o cliente
            cursor.execute("DELETE FROM clientes WHERE id=?", (id,))
            # Verifica se o cliente foi encontrado.
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Cliente não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Cliente excluído com sucesso!'})
    except Exception as e:
        # Loga erros ao excluir cliente.
        app_logger.error(f"Erro ao excluir cliente: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao excluir cliente'}), 500

# Rota para buscar clientes com base em um termo de pesquisa.
@app.route('/clientes/buscar', methods=['GET'])
def buscar_clientes():
    try:
        # Obtém o termo de pesquisa da query string.
        termo = request.args.get('termo', '')
        # Define a query SQL para buscar clientes com base no termo de pesquisa.
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
            # Define o termo de pesquisa com curingas para busca parcial.
            search_term = f'%{termo}%'
            # Executa a query para buscar os clientes.
            cursor.execute(query, (search_term, search_term, search_term))
            clientes = cursor.fetchall()
            # Retorna os clientes encontrados em formato JSON.
            return jsonify(clientes)
    except Exception as e:
        # Loga erros ao buscar clientes.
        app_logger.error(f"Erro na busca de clientes: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro na busca'}), 500

# Rota para abrir um novo chamado.
@app.route('/chamados', methods=['POST'])
def abrir_chamado():
    try:
        # Obtém os dados do chamado do corpo da requisição.
        dados = request.json
        # Valida se os dados foram fornecidos e se o ID do cliente e a descrição estão presentes.
        if not dados or 'cliente_id' not in dados or 'descricao' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Verifica se o cliente existe
            cursor.execute('SELECT id FROM clientes WHERE id = ?', (dados['cliente_id'],))
            if not cursor.fetchone():
                return jsonify({'erro': 'Cliente não encontrado'}), 404

            # Gerar protocolo automaticamente: ddmmyyyyHHMM + id do cliente
            now = datetime.now()
            protocolo = now.strftime('%d%m%Y%H%M') + str(dados['cliente_id'])

            # Insere o chamado com os campos adicionais
            data_abertura = now.strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('''
                INSERT INTO chamados (
                    cliente_id, descricao, data_abertura, protocolo,
                    assunto, telefone
                )
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                dados['cliente_id'], 
                dados['descricao'], 
                data_abertura, 
                protocolo,
                dados.get('assunto', ''),
                dados.get('telefone', '')
            ))
            
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON, juntamente com o protocolo do novo chamado.
            return jsonify({'mensagem': 'Chamado aberto com sucesso!', 'protocolo': protocolo}), 201
    except Exception as e:
        # Loga erros ao abrir chamado.
        app_logger.error(f"Erro ao abrir chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao abrir chamado'}), 500

# Rota para listar chamados, com suporte a paginação e filtro por status.
@app.route('/chamados', methods=['GET'])
def listar_chamados():
    try:
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        status = request.args.get('status', default='Aberto', type=str)
        offset = (pagina - 1) * limite

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM chamados WHERE status = ?', (status,))
            total = cursor.fetchone()[0]
            
            # Query ajustada para retornar mais informações e garantir o nome do cliente
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
                if chamado[9]:  # Se tem nome do cliente
                    chamado_dict[9] = chamado[9]  # Usa o nome do cliente
                else:
                    chamado_dict[9] = "Cliente removido"  # Caso o cliente tenha sido excluído
                chamados_processados.append(chamado_dict)

            return jsonify({
                'chamados': chamados_processados,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite
            })

    except Exception as e:
        app_logger.error(f"Erro ao listar chamados: {e}")
        return jsonify({'erro': 'Erro ao listar chamados'}), 500

# Rota para editar um chamado existente.
@app.route('/chamados/<int:id>', methods=['PUT'])
def editar_chamado(id):
    try:
        dados = request.json
        if not dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Construir query dinamicamente baseado nos campos recebidos
            campos_atualizacao = []
            valores = []
            
            if 'descricao' in dados:
                campos_atualizacao.append('descricao=?')
                valores.append(dados['descricao'])
            
            if 'assunto' in dados:
                campos_atualizacao.append('assunto=?')
                valores.append(dados['assunto'])
                
            if 'telefone' in dados:
                campos_atualizacao.append('telefone=?')
                valores.append(dados['telefone'])
            
            if 'status' in dados:
                campos_atualizacao.append('status=?')
                valores.append(dados['status'])
                
                # Se estiver reabrindo o chamado, limpa a data de fechamento
                if dados['status'] == 'Aberto':
                    campos_atualizacao.append('data_fechamento=NULL')
                
            # Adiciona o ID do chamado aos valores
            valores.append(id)
            
            # Monta e executa a query
            query = f"UPDATE chamados SET {', '.join(campos_atualizacao)} WHERE id=?"
            cursor.execute(query, valores)
            
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Chamado não encontrado'}), 404
                
            conn.commit()
            return jsonify({'mensagem': 'Chamado atualizado com sucesso!'})
            
    except Exception as e:
        app_logger.error(f"Erro ao editar chamado: {e}")
        return jsonify({'erro': 'Erro ao editar chamado'}), 500

# Rota para finalizar um chamado existente.
@app.route('/chamados/<int:id>/finalizar', methods=['PUT'])
def finalizar_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Define a data de fechamento como a data e hora atuais.
            data_fechamento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            # Define a query SQL para finalizar um chamado existente.
            cursor.execute('''
                UPDATE chamados
                SET status=?, data_fechamento=?
                WHERE id=?
            ''', ('Finalizado', data_fechamento, id))
            # Verifica se o chamado foi encontrado.
            if cursor.rowcount == 0:
                app_logger.error(f"Chamado não encontrado: ID {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Loga a finalização do chamado.
            app_logger.info(f"Chamado finalizado com sucesso: ID {id}")
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Chamado finalizado com sucesso!'})
    except Exception as e:
        # Loga erros ao finalizar chamado.
        app_logger.error(f"Erro ao finalizar chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao finalizar chamado'}), 500

# Rota para excluir um chamado existente.
@app.route('/chamados/<int:id>', methods=['DELETE'])
def excluir_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Define a query SQL para excluir um chamado existente.
            cursor.execute('DELETE FROM chamados WHERE id=?', (id,))
            # Verifica se o chamado foi encontrado.
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Chamado excluído com sucesso!'})
    except Exception as e:
        # Loga erros ao excluir chamado.
        app_logger.error(f"Erro ao excluir chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao excluir chamado'}), 500

# Rota da API para adicionar uma entrada de progresso a um chamado.
@app.route('/chamados/<int:chamado_id>/andamentos', methods=['POST'])
def adicionar_andamento(chamado_id):
    try:
        # Obtém os dados da entrada de progresso do corpo da requisição.
        dados = request.json
        # Loga os dados recebidos para fins de depuração.
        app_logger.debug(f"Recebendo dados para novo andamento: {dados}")
        
        # Valida se os dados foram fornecidos e se o texto da entrada de progresso está presente.
        if not dados or 'texto' not in dados or not dados['texto'].strip():
            return jsonify({'erro': 'Texto do andamento é obrigatório'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verifica se o chamado existe
            cursor.execute('SELECT id FROM chamados WHERE id = ?', (chamado_id,))
            if not cursor.fetchone():
                return jsonify({'erro': 'Chamado não encontrado'}), 404

            # Obtém a data e hora atuais.
            data_hora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Loga os dados da entrada de progresso antes da inserção.
            app_logger.debug(f"Inserindo andamento: chamado_id={chamado_id}, data_hora={data_hora}, texto={dados['texto']}")
            
            # Define a query SQL para inserir uma nova entrada de progresso.
            cursor.execute('''
                INSERT INTO chamado_andamentos (chamado_id, data_hora, texto)
                VALUES (?, ?, ?)
            ''', (chamado_id, data_hora, dados['texto'].strip()))
            
            # Obtém o ID da nova entrada de progresso.
            novo_id = cursor.lastrowid
            # Salva as alterações no banco de dados.
            conn.commit()
            
            # Confirma que o andamento foi salvo
            cursor.execute('SELECT id, data_hora, texto FROM chamado_andamentos WHERE id = ?', (novo_id,))
            andamento = cursor.fetchone()
            
            # Loga a criação bem-sucedida da entrada de progresso.
            app_logger.info(f"Andamento criado com sucesso: ID={novo_id}")
            
            # Retorna uma mensagem de sucesso em formato JSON, juntamente com os dados da nova entrada de progresso.
            return jsonify({
                'mensagem': 'Andamento adicionado com sucesso!',
                'andamento': {
                    'id': andamento[0],
                    'data_hora': andamento[1],
                    'texto': andamento[2]
                }
            }), 201
    except Exception as e:
        # Loga erros ao adicionar entrada de progresso.
        app_logger.error(f"Erro ao adicionar andamento: {str(e)}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': f'Erro ao adicionar andamento: {str(e)}'}), 500

# Rota da API para excluir uma entrada de progresso de um chamado.
@app.route('/chamados/andamentos/<int:andamento_id>', methods=['DELETE'])
def excluir_andamento(andamento_id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Define a query SQL para excluir uma entrada de progresso.
            cursor.execute('DELETE FROM chamado_andamentos WHERE id=?', (andamento_id,))
            # Verifica se a entrada de progresso foi encontrada.
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Andamento não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Andamento excluído com sucesso!'})
    except Exception as e:
        # Loga erros ao excluir entrada de progresso.
        app_logger.error(f"Erro ao excluir andamento: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao excluir andamento'}), 500

# Modifica o endpoint /chamados/<int:id> para incluir as entradas de progresso
@app.route('/chamados/<int:id>', methods=['GET'])
def obter_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Seleciona os dados do chamado, incluindo o nome do cliente através de um JOIN.
            cursor.execute('''
                SELECT ch.id, ch.cliente_id, ch.descricao, ch.status, ch.data_abertura, 
                       ch.data_fechamento, ch.protocolo, ch.assunto, ch.telefone,
                       cl.nome as cliente_nome
                FROM chamados ch
                LEFT JOIN clientes cl ON ch.cliente_id = cl.id
                WHERE ch.id = ?
            ''', (id,))
            # Obtém o resultado da consulta.
            chamado = cursor.fetchone()
            # Verifica se o chamado foi encontrado.
            if not chamado:
                return jsonify({'erro': 'Chamado não encontrado'}), 404

            # Seleciona as entradas de progresso (andamentos) para o chamado, ordenadas por data e hora.
            cursor.execute('SELECT id, data_hora, texto FROM chamado_andamentos WHERE chamado_id = ? ORDER BY data_hora', (id,))
            # Obtém os dados dos andamentos.
            andamentos_data = cursor.fetchall()
            # Converte os dados dos andamentos em uma lista de dicionários.
            andamentos_list = [
                {'id': row[0], 'data_hora': row[1], 'texto': row[2]}
                for row in andamentos_data
            ]

            # Retorna os dados do chamado e a lista de andamentos em formato JSON.
            return jsonify({
                'id': chamado[0],
                'cliente_id': chamado[1],
                'descricao': chamado[2],
                'status': chamado[3],
                'data_abertura': chamado[4],
                'data_fechamento': chamado[5],
                'protocolo': chamado[6],
                'assunto': chamado[7],
                'telefone': chamado[8],
                'cliente_nome': chamado[9],
                'andamentos': andamentos_list  # Inclui a lista de andamentos
            })
    except Exception as e:
        # Loga erros ao obter detalhes do chamado.
        app_logger.error(f"Erro ao obter detalhes do chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao obter detalhes do chamado'}), 500

# Rotas de estatísticas e busca
@app.route('/estatisticas', methods=['GET'])
@retry_db_operation
def obter_estatisticas():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            stats = {
                'total_clientes': 0,
                'chamados_status': {},
                'ultimos_chamados': [],
                'chamados_por_mes': []
            }

            # Total de clientes
            cursor.execute('SELECT COUNT(*) FROM clientes')
            stats['total_clientes'] = cursor.fetchone()[0]

            # Chamados por status
            cursor.execute('''
                SELECT status, COUNT(*) 
                FROM chamados 
                GROUP BY status
            ''')
            stats['chamados_status'] = dict(cursor.fetchall())

            # Últimos chamados com dados do cliente
            cursor.execute('''
                SELECT ch.*, cl.nome as cliente_nome
                FROM chamados ch
                JOIN clientes cl ON ch.cliente_id = cl.id
                ORDER BY ch.data_abertura DESC
                LIMIT 5
            ''')
            stats['ultimos_chamados'] = cursor.fetchall()

            # Chamados por mês
            cursor.execute('''
                SELECT strftime('%Y-%m', data_abertura) as mes, COUNT(*)
                FROM chamados
                GROUP BY mes
                ORDER BY mes DESC
                LIMIT 6
            ''')
            stats['chamados_por_mes'] = cursor.fetchall()

            return jsonify(stats)
    except Exception as e:
        app_logger.error(f"Erro ao obter estatísticas: {e}")
        return jsonify({'erro': 'Erro ao obter estatísticas'}), 500

# Adicione esta função de decorador para proteger as rotas
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/auth/login', methods=['POST'])
def auth_login():
    try:
        data = request.json
        username = data.get('username', '').strip()
        
        if not username:
            auth_logger.warning(f'Tentativa de login sem username: {request.remote_addr}')
            return jsonify({'error': 'Username required'}), 400
            
        auth_logger.info(f'Tentativa de login: {username} de {request.remote_addr}')
        
        # Validação mais rigorosa
        password = data.get('password', '').strip()
        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username and password are required'
            }), 400
            
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, password, role FROM usuarios WHERE username = ? AND username != ""', (username,))
            user = cursor.fetchone()
            
            if user and check_password_hash(user[2], password):
                session.clear()
                session.permanent = True  # Sessão dura 31 dias
                session['user_id'] = user[0]
                session['username'] = user[1]
                session['role'] = user[3]
                
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'role': user[3]
                })
            
            # Tempo de espera para dificultar força bruta
            sleep(1)
            return jsonify({
                'success': False,
                'error': 'Invalid credentials'
            }), 401
            
    except Exception as e:
        auth_logger.error(f'Erro no login: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Server error'
        }), 500

@app.route('/auth/logout')
def auth_logout():
    session.clear()
    return redirect('/login.html')

# Rota para verificar o papel do usuário atual
@app.route('/auth/check-role')
def check_role():
    if 'role' not in session:
        return jsonify({'role': None, 'username': None}), 401
    return jsonify({
        'role': session['role'],
        'username': session['username']
    })

# Rotas para gerenciamento de usuários
@app.route('/usuarios', methods=['GET'])
@login_required
def listar_usuarios():
    try:
        if session.get('role') != 'admin':
            return jsonify({'error': 'Acesso não autorizado'}), 403
            
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, username, role, created_at 
                FROM usuarios 
                ORDER BY created_at DESC
            ''')
            usuarios = cursor.fetchall()
            return jsonify([{
                'id': u[0],
                'username': u[1],
                'role': u[2],
                'created_at': u[3]
            } for u in usuarios])
    except Exception as e:
        app_logger.error(f"Erro ao listar usuários: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/usuarios', methods=['POST'])
@login_required
def criar_usuario():
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'guest')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            hashed_password = generate_password_hash(password)
            cursor.execute(
                'INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)',
                (username, hashed_password, role)
            )
            conn.commit()
            return jsonify({'message': 'User created successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409
    except Exception as e:
        app_logger.error(f"Erro ao criar usuário: {e}")
        return jsonify({'error': 'Error creating user'}), 500

@app.route('/usuarios/<int:id>', methods=['PUT'])
@login_required
def atualizar_usuario(id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
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
                return jsonify({'error': 'User not found'}), 404

            # Verifica se é o usuário admin
            if current_user[0] == 'admin':
                # Se for o admin, só permite alterar a senha
                if username != 'admin' or role != 'admin':
                    return jsonify({'error': 'Cannot modify admin username or role'}), 403
                
                if not password:
                    return jsonify({'error': 'Password is required for admin'}), 400

                hashed_password = generate_password_hash(password)
                cursor.execute(
                    'UPDATE usuarios SET password=? WHERE id=?',
                    (hashed_password, id)
                )
            else:
                # Se não for o admin, verifica se não está tentando usar o username 'admin'
                if username == 'admin':
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

            conn.commit()
            return jsonify({'message': 'User updated successfully'})
            
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409
    except Exception as e:
        app_logger.error(f"Erro ao atualizar usuário: {e}")
        return jsonify({'error': 'Error updating user'}), 500

@app.route('/usuarios/<int:id>', methods=['DELETE'])
@login_required
def excluir_usuario(id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Não permite excluir o próprio usuário
            if id == session.get('user_id'):
                return jsonify({'error': 'Cannot delete your own user'}), 400
            cursor.execute('DELETE FROM usuarios WHERE id=?', (id,))
            conn.commit()
            return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        app_logger.error(f"Erro ao excluir usuário: {e}")
        return jsonify({'error': 'Error deleting user'}), 500

@app.route('/usuarios/<int:id>', methods=['GET'])
@login_required
def obter_usuario(id):
    if session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, role, created_at FROM usuarios WHERE id = ?', (id,))
            usuario = cursor.fetchone()
            
            if not usuario:
                return jsonify({'error': 'User not found'}), 404
                
            return jsonify({
                'id': usuario[0],
                'username': usuario[1],
                'role': usuario[2],
                'created_at': usuario[3]
            })
    except Exception as e:
        app_logger.error(f"Erro ao obter usuário: {e}")
        return jsonify({'error': 'Error getting user'}), 500

@app.route('/auth/renew-session', methods=['POST'])
def renew_session():
    if 'user_id' in session:
        # Renova a sessão
        session.modified = True
        return jsonify({'success': True})
    return jsonify({'success': False}), 401

# Rota para atualizar o endereço de um cliente existente.
@app.route('/clientes/<int:id>/endereco', methods=['PUT'])
def atualizar_endereco(id):
    try:
        dados = request.json
        with get_db_connection() as conn:
            cursor = conn.cursor()
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
            conn.commit()
        return jsonify({'mensagem': 'Endereço atualizado com sucesso!'})
    except Exception as e:
        app_logger.error(f"Erro ao atualizar endereço: {e}")
        return jsonify({'erro': 'Erro ao atualizar endereço'}), 500

# Rota para obter detalhes de um cliente específico
@app.route('/clientes/<int:id>', methods=['GET'])
def obter_cliente(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
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
            if not cliente:
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
        app_logger.error(f"Erro ao obter cliente: {e}")
        return jsonify({'erro': 'Erro ao obter cliente'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
