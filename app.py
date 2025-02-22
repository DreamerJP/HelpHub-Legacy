import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from datetime import datetime
import logging
from contextlib import contextmanager
from time import sleep

# Define o diretório base do projeto como o diretório do script atual.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Define o caminho para o arquivo de banco de dados SQLite.
DATABASE = os.path.join(BASE_DIR, 'database.db')
# Define o caminho para o arquivo de log da aplicação.
log_file = os.path.join(BASE_DIR, 'app.log')

# Configuração detalhada de logging para fins de desenvolvimento.
# Em produção, esta configuração deve ser simplificada ou removida para logs mais concisos.
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(funcName)s() - %(message)s',
    handlers=[
        logging.FileHandler(log_file),  # Salva logs em arquivo.
        logging.StreamHandler()         # Exibe logs no console.
    ]
)

# Inicializa o logger para este módulo.
logger = logging.getLogger(__name__)

# Cria uma instância do aplicativo Flask.
app = Flask(__name__)
# Habilita o CORS (Cross-Origin Resource Sharing) para permitir requisições de diferentes domínios.
CORS(app)
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
        logger.error(f"Database error: {e}")
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
                logger.warning(f"Database operation failed, retrying... ({attempt + 1}/{MAX_RETRIES})")
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
            endereco TEXT,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
        )''')
        # Cria a tabela chamado_andamentos para armazenar as entradas de progresso dos chamados.
        cursor.execute('DROP TABLE IF EXISTS chamado_andamentos')
        cursor.execute('''CREATE TABLE chamado_andamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chamado_id INTEGER NOT NULL,
            data_hora DATETIME NOT NULL,
            texto TEXT NOT NULL,
            FOREIGN KEY(chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
        )''')
        # Salva as alterações no banco de dados.
        conn.commit()

# Cria as tabelas ao iniciar o aplicativo
criar_tabelas()

# Adiciona as colunas 'protocolo', 'data_fechamento', 'assunto', 'telefone' e 'endereco' à tabela chamados,
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
        # Adiciona a coluna endereco se ela não existir.
        if 'endereco' not in colunas:
            cursor.execute('ALTER TABLE chamados ADD COLUMN endereco TEXT')
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
                    logger.error(f"Formato de data inválido para o chamado ID {id}: {data_abertura}")
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
    return send_from_directory('static', 'index.html')

# Rota para servir arquivos estáticos (CSS, JavaScript, imagens, etc.).
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# Rota para listar clientes, com suporte a paginação.
@app.route('/clientes', methods=['GET'])
def listar_clientes():
    try:
        # Obtém os parâmetros de paginação da query string.
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        # Calcula o offset com base na página e no limite.
        offset = (pagina - 1) * limite

        # Define a query SQL para selecionar os clientes com paginação.
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
            # Obtém o número total de clientes.
            cursor.execute("SELECT COUNT(*) FROM clientes")
            total = cursor.fetchone()[0]

            # Executa a query para selecionar os clientes da página atual.
            cursor.execute(query, (limite, offset))
            clientes = cursor.fetchall()

            # Retorna os clientes em formato JSON, juntamente com informações de paginação.
            return jsonify({
                'clientes': clientes,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite
            })
    except Exception as e:
        # Loga erros ao listar clientes.
        logger.error(f"Erro ao listar clientes: {e}")
        # Retorna uma mensagem de erro em formato JSON.
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
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON, juntamente com o ID do novo cliente.
            return jsonify({
                'mensagem': 'Cliente cadastrado com sucesso!',
                'id': cursor.lastrowid
            }), 201
    except Exception as e:
        # Loga erros ao cadastrar cliente.
        logger.error(f"Erro ao cadastrar cliente: {e}")
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
            # Verifica se o cliente foi encontrado.
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Cliente não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Cliente atualizado com sucesso!'})
    except Exception as e:
        # Loga erros ao editar cliente.
        logger.error(f"Erro ao editar cliente: {e}")
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
        logger.error(f"Erro ao excluir cliente: {e}")
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
         SELECT id, nome, nome_fantasia, email, telefone, endereco, ativo,
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
        logger.error(f"Erro na busca de clientes: {e}")
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
            
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON, juntamente com o protocolo do novo chamado.
            return jsonify({'mensagem': 'Chamado aberto com sucesso!', 'protocolo': protocolo}), 201
    except Exception as e:
        # Loga erros ao abrir chamado.
        logger.error(f"Erro ao abrir chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao abrir chamado'}), 500

# Rota para listar chamados, com suporte a paginação e filtro por status.
@app.route('/chamados', methods=['GET'])
def listar_chamados():
    try:
        # Obtém os parâmetros de paginação e status da query string.
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        status = request.args.get('status', default='Aberto', type=str)
        # Calcula o offset com base na página e no limite.
        offset = (pagina - 1) * limite

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Obtém o número total de chamados com o status especificado.
            cursor.execute('SELECT COUNT(*) FROM chamados WHERE status = ?', (status,))
            total = cursor.fetchone()[0]
            
            # Modificada a query para garantir que estamos pegando o nome correto do cliente
            cursor.execute('''
                SELECT 
                    c.id, c.cliente_id, c.descricao, c.status, 
                    c.data_abertura, c.data_fechamento, c.protocolo, 
                    c.assunto, c.telefone, c.endereco,
                    cl.nome as cliente_nome 
                FROM chamados c 
                LEFT JOIN clientes cl ON c.cliente_id = cl.id 
                WHERE c.status = ? 
                ORDER BY c.id 
                LIMIT ? OFFSET ?
            ''', (status, limite, offset))
            
            # Executa a query para selecionar os chamados da página atual.
            chamados = cursor.fetchall()

            # Retorna os chamados em formato JSON, juntamente com informações de paginação.
            return jsonify({
                'chamados': chamados,
                'total': total,
                'pagina_atual': pagina,
                'total_paginas': (total + limite - 1) // limite
            })
    except Exception as e:
        # Loga erros ao listar chamados.
        logger.error(f"Erro ao listar chamados: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao listar chamados'}), 500

# Rota para editar um chamado existente.
@app.route('/chamados/<int:id>', methods=['PUT'])
def editar_chamado(id):
    try:
        # Obtém os dados do chamado do corpo da requisição.
        dados = request.json
        # Valida se os dados foram fornecidos e se a descrição está presente.
        if not dados or 'descricao' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Define a query SQL para atualizar um chamado existente.
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
            # Verifica se o chamado foi encontrado.
            if cursor.rowcount == 0:
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Chamado atualizado com sucesso!'})
    except Exception as e:
        # Loga erros ao editar chamado.
        logger.error(f"Erro ao editar chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
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
                logger.error(f"Chamado não encontrado: ID {id}")
                return jsonify({'erro': 'Chamado não encontrado'}), 404
            # Salva as alterações no banco de dados.
            conn.commit()
            # Loga a finalização do chamado.
            logger.info(f"Chamado finalizado com sucesso: ID {id}")
            # Retorna uma mensagem de sucesso em formato JSON.
            return jsonify({'mensagem': 'Chamado finalizado com sucesso!'})
    except Exception as e:
        # Loga erros ao finalizar chamado.
        logger.error(f"Erro ao finalizar chamado: {e}")
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
        logger.error(f"Erro ao excluir chamado: {e}")
        # Retorna uma mensagem de erro em formato JSON.
        return jsonify({'erro': 'Erro ao excluir chamado'}), 500

# Rota da API para adicionar uma entrada de progresso a um chamado.
@app.route('/chamados/<int:chamado_id>/andamentos', methods=['POST'])
def adicionar_andamento(chamado_id):
    try:
        # Obtém os dados da entrada de progresso do corpo da requisição.
        dados = request.json
        # Loga os dados recebidos para fins de depuração.
        logger.debug(f"Recebendo dados para novo andamento: {dados}")
        
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
            logger.debug(f"Inserindo andamento: chamado_id={chamado_id}, data_hora={data_hora}, texto={dados['texto']}")
            
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
            logger.info(f"Andamento criado com sucesso: ID={novo_id}")
            
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
        logger.error(f"Erro ao adicionar andamento: {str(e)}")
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
        logger.error(f"Erro ao excluir andamento: {e}")
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
                       ch.data_fechamento, ch.protocolo, ch.assunto, ch.telefone, ch.endereco,
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
                'endereco': chamado[9],
                'cliente_nome': chamado[10],
                'andamentos': andamentos_list  # Inclui a lista de andamentos
            })
    except Exception as e:
        # Loga erros ao obter detalhes do chamado.
        logger.error(f"Erro ao obter detalhes do chamado: {e}")
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
        logger.error(f"Erro ao obter estatísticas: {e}")
        return jsonify({'erro': 'Erro ao obter estatísticas'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
