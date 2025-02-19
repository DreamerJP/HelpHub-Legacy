import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from datetime import datetime
import logging
from contextlib import contextmanager
from time import sleep

# Determine o diretório atual e configure os caminhos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'database.db')
log_file = os.path.join(BASE_DIR, 'app.log')

# DETAILED_LOGGING_DEVELOPMENT: Esta configuração detalhada de log está ativa para desenvolvimento.
# Na versão de produção, remova ou simplifique esta configuração para exibir logs básicos.
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(funcName)s() - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
MAX_RETRIES = 3

@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = sqlite3.connect(DATABASE)
        conn.execute('PRAGMA foreign_keys = ON')
        yield conn
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()

def retry_db_operation(func):
    def wrapper(*args, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                return func(*args, **kwargs)
            except sqlite3.Error as e:
                if attempt == MAX_RETRIES - 1:
                    raise
                logger.warning(f"Database operation failed, retrying... ({attempt + 1}/{MAX_RETRIES})")
                sleep(1)
    return wrapper

# WARNING_DROP_DB_DEVELOPMENT: Caso o banco de dados já exista, remova (ou renomeie) o arquivo database.db para que
# este novo esquema seja aplicado corretamente. A coluna cliente_id DEVE permitir valores NULL.
def criar_tabelas():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            nome_fantasia TEXT,
            email TEXT,
            telefone TEXT,
            endereco TEXT,
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
            inscricao_municipal TEXT
        )''')
        # A coluna cliente_id NÃO deve conter a cláusula NOT NULL
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
            endereco TEXT,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
        )''')
        conn.commit()

# Cria as tabelas ao iniciar o aplicativo
criar_tabelas()

def adicionar_colunas():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(chamados)")
        colunas = [info[1] for info in cursor.fetchall()]
        if 'protocolo' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN protocolo TEXT')
        if 'data_fechamento' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN data_fechamento TEXT')
        # New columns for details:
        if 'assunto' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN assunto TEXT')
        if 'telefone' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN telefone TEXT')
        if 'endereco' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN endereco TEXT')
        conn.commit()

# Adiciona as colunas 'protocolo' e 'data_fechamento' se não existirem
adicionar_colunas()

def atualizar_chamados_sem_protocolo():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, cliente_id, data_abertura FROM chamados WHERE protocolo IS NULL OR protocolo = ""')
        chamados = cursor.fetchall()
        for chamado in chamados:
            id, cliente_id, data_abertura = chamado
            try:
                data_abertura_dt = datetime.strptime(data_abertura, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    data_abertura_dt = datetime.strptime(data_abertura, '%d/%m/%Y %H:%M')
                except ValueError:
                    logger.error(f"Formato de data inválido para o chamado ID {id}: {data_abertura}")
                    continue
            protocolo = data_abertura_dt.strftime('%d%m%Y%H%M') + str(cliente_id)
            cursor.execute('UPDATE chamados SET protocolo = ? WHERE id = ?', (protocolo, id))
        conn.commit()

# Atualiza os chamados existentes ao iniciar o aplicativo
atualizar_chamados_sem_protocolo()

# Endpoint para servir o frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# Rotas para clientes
@app.route('/clientes', methods=['GET'])
def listar_clientes():
    try:
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        offset = (pagina - 1) * limite

        query = """
         SELECT id, nome, nome_fantasia, email, telefone, endereco, ativo,
                tipo_cliente, cnpj_cpf, ie_rg, contribuinte_icms, rg_orgao_emissor,
                nacionalidade, naturalidade, estado_nascimento, data_nascimento,
                sexo, profissao, estado_civil, inscricao_municipal
         FROM clientes
         ORDER BY id LIMIT ? OFFSET ?
        """

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM clientes")
            total = cursor.fetchone()[0]

            cursor.execute(query, (limite, offset))
            clientes = cursor.fetchall()

            return jsonify({
                'clientes': clientes,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite
            })
    except Exception as e:
        logger.error(f"Erro ao listar clientes: {e}")
        return jsonify({'erro': 'Erro ao listar clientes'}), 500

@app.route('/clientes', methods=['POST'])
def cadastrar_cliente():
    try:
        dados = request.json
        if not dados or not dados.get('nome') or len(dados['nome'].strip()) == 0:
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        if 'email' in dados and dados['email']:
            # Validação básica de email
            if '@' not in dados['email'] or '.' not in dados['email']:
                return jsonify({'erro': 'Email inválido'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO clientes (
                    nome, nome_fantasia, email, telefone, endereco, ativo, tipo_cliente, cnpj_cpf,
                    ie_rg, contribuinte_icms, rg_orgao_emissor, nacionalidade, naturalidade,
                    estado_nascimento, data_nascimento, sexo, profissao, estado_civil, inscricao_municipal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                dados['nome'].strip(),
                dados.get('nome_fantasia', '').strip(),
                dados.get('email', '').strip(),
                dados.get('telefone', '').strip(),
                dados.get('endereco', '').strip(),
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
            conn.commit()
            return jsonify({
                'mensagem': 'Cliente cadastrado com sucesso!',
                'id': cursor.lastrowid
            }), 201
    except Exception as e:
        logger.error(f"Erro ao cadastrar cliente: {e}")
        return jsonify({'erro': 'Erro ao cadastrar cliente'}), 500

@app.route('/clientes/<int:id>', methods=['PUT'])
def editar_cliente(id):
    try:
        dados = request.json
        if not dados or 'nome' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE clientes
                SET nome = ?,
                    nome_fantasia = ?,
                    email = ?,
                    telefone = ?,
                    endereco = ?,
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
                dados.get('endereco'),
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
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Cliente não encontrado'}), 404
            conn.commit()
            return jsonify({'mensagem': 'Cliente atualizado com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao editar cliente: {e}")
        return jsonify({'erro': 'Erro ao editar cliente'}), 500

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
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Cliente não encontrado'}), 404
            conn.commit()
            return jsonify({'mensagem': 'Cliente excluído com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao excluir cliente: {e}")
        return jsonify({'erro': 'Erro ao excluir cliente'}), 500

@app.route('/clientes/buscar', methods=['GET'])
def buscar_clientes():
    try:
        termo = request.args.get('termo', '')
        query = """
         SELECT id, nome, nome_fantasia, email, telefone, endereco, ativo,
                tipo_cliente, cnpj_cpf, ie_rg, contribuinte_icms, rg_orgao_emissor,
                nacionalidade, naturalidade, estado_nascimento, data_nascimento,
                sexo, profissao, estado_civil, inscricao_municipal
         FROM clientes
         WHERE nome LIKE ? OR email LIKE ?
         COLLATE NOCASE
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (f'%{termo}%', f'%{termo}%'))
            clientes = cursor.fetchall()
            return jsonify(clientes)
    except Exception as e:
        logger.error(f"Erro na busca de clientes: {e}")
        return jsonify({'erro': 'Erro na busca'}), 500

# Rotas para chamados
@app.route('/chamados', methods=['POST'])
def abrir_chamado():
    try:
        dados = request.json
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
                    assunto, telefone, endereco
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                dados['cliente_id'], 
                dados['descricao'], 
                data_abertura, 
                protocolo,
                dados.get('assunto', ''),
                dados.get('telefone', ''),
                dados.get('endereco', '')
            ))
            
            conn.commit()
            return jsonify({'mensagem': 'Chamado aberto com sucesso!', 'protocolo': protocolo}), 201
    except Exception as e:
        logger.error(f"Erro ao abrir chamado: {e}")
        return jsonify({'erro': 'Erro ao abrir chamado'}), 500

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
            
            cursor.execute('SELECT * FROM chamados WHERE status = ? ORDER BY id LIMIT ? OFFSET ?', (status, limite, offset))
            chamados = cursor.fetchall()

            return jsonify({
                'chamados': chamados,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite
            })
    except Exception as e:
        logger.error(f"Erro ao listar chamados: {e}")
        return jsonify({'erro': 'Erro ao listar chamados'}), 500

@app.route('/chamados/<int:id>', methods=['PUT'])
def editar_chamado(id):
    try:
        dados = request.json
        if not dados or 'descricao' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE chamados
                SET descricao=?, 
                    status=?,
                    assunto=?,
                    telefone=?,
                    endereco=?
                WHERE id=?
            ''', (
                dados['descricao'],
                dados.get('status', 'Aberto'),
                dados.get('assunto', ''),
                dados.get('telefone', ''),
                dados.get('endereco', ''),
                id
            ))
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            conn.commit()
            return jsonify({'mensagem': 'Chamado atualizado com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao editar chamado: {e}")
        return jsonify({'erro': 'Erro ao editar chamado'}), 500

@app.route('/chamados/<int:id>/finalizar', methods=['PUT'])
def finalizar_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            data_fechamento = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute('''
                UPDATE chamados
                SET status=?, data_fechamento=?
                WHERE id=?
            ''', ('Finalizado', data_fechamento, id))
            if cursor.rowcount == 0:
                logger.error(f"Chamado não encontrado: ID {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            conn.commit()
            logger.info(f"Chamado finalizado com sucesso: ID {id}")
            return jsonify({'mensagem': 'Chamado finalizado com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao finalizar chamado: {e}")
        return jsonify({'erro': 'Erro ao finalizar chamado'}), 500

@app.route('/chamados/<int:id>', methods=['DELETE'])
def excluir_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM chamados WHERE id=?', (id,))
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            conn.commit()
            return jsonify({'mensagem': 'Chamado excluído com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao excluir chamado: {e}")
        return jsonify({'erro': 'Erro ao excluir chamado'}), 500

@app.route('/chamados/<int:id>', methods=['GET'])
def obter_chamado(id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT ch.id, ch.cliente_id, ch.descricao, ch.status, ch.data_abertura, 
                       ch.data_fechamento, ch.protocolo, ch.assunto, ch.telefone, ch.endereco,
                       cl.nome as cliente_nome
                FROM chamados ch
                LEFT JOIN clientes cl ON ch.cliente_id = cl.id
                WHERE ch.id = ?
            ''', (id,))
            chamado = cursor.fetchone()
            if not chamado:
                return jsonify({'erro': 'Chamado não encontrado'}), 404
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
                'endereco': chamado[9],
                'cliente_nome': chamado[10]
            })
    except Exception as e:
        logger.error(f"Erro ao obter detalhes do chamado: {e}")
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
        logger.error(f"Erro ao obter estatísticas: {e}")
        return jsonify({'erro': 'Erro ao obter estatísticas'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
