from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas
DATABASE = 'database.db'

def criar_tabelas():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT,
                    telefone TEXT,
                    endereco TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS chamados (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL,
                    descricao TEXT NOT NULL,
                    status TEXT DEFAULT 'Aberto',
                    data_abertura TEXT NOT NULL,
                    FOREIGN KEY(cliente_id) REFERENCES clientes(id))''')
    conn.commit()
    conn.close()

# Cria as tabelas ao iniciar o aplicativo
criar_tabelas()

# Endpoint para servir o frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# Endpoint para listar clientes com paginação
@app.route('/clientes', methods=['GET'])
def listar_clientes():
    try:
        pagina = request.args.get('pagina', default=1, type=int)
        limite = request.args.get('limite', default=10, type=int)
        offset = (pagina - 1) * limite

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM clientes LIMIT ? OFFSET ?', (limite, offset))
        clientes = cursor.fetchall()
        conn.close()
        return jsonify(clientes)
    except Exception as e:
        print("Erro ao listar clientes:", e)
        return jsonify({'erro': 'Erro ao listar clientes'}), 500

# Endpoint para cadastrar um novo cliente
@app.route('/clientes', methods=['POST'])
def cadastrar_cliente():
    try:
        dados = request.json
        print("Dados recebidos:", dados)  # Log para depuração

        if not dados or 'nome' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO clientes (nome, email, telefone, endereco) VALUES (?, ?, ?, ?)',
                      (dados['nome'], dados.get('email', ''), dados.get('telefone', ''), dados.get('endereco', '')))
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Cliente cadastrado com sucesso!'}), 201
    except Exception as e:
        print("Erro ao cadastrar cliente:", e)
        return jsonify({'erro': 'Erro ao cadastrar cliente'}), 500

# Endpoint para editar um cliente
@app.route('/clientes/<int:id>', methods=['PUT'])
def editar_cliente(id):
    try:
        dados = request.json
        print("Dados recebidos:", dados)  # Log para depuração

        if not dados or 'nome' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('UPDATE clientes SET nome=?, email=?, telefone=?, endereco=? WHERE id=?',
                      (dados['nome'], dados.get('email', ''), dados.get('telefone', ''), dados.get('endereco', ''), id))
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Cliente atualizado com sucesso!'})
    except Exception as e:
        print("Erro ao editar cliente:", e)
        return jsonify({'erro': 'Erro ao editar cliente'}), 500

# Endpoint para excluir um cliente
@app.route('/clientes/<int:id>', methods=['DELETE'])
def excluir_cliente(id):
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM clientes WHERE id=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Cliente excluído com sucesso!'})
    except Exception as e:
        print("Erro ao excluir cliente:", e)
        return jsonify({'erro': 'Erro ao excluir cliente'}), 500

# Endpoint para abrir um novo chamado
@app.route('/chamados', methods=['POST'])
def abrir_chamado():
    try:
        dados = request.json
        print("Dados recebidos:", dados)  # Log para depuração

        if not dados or 'cliente_id' not in dados or 'descricao' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        data = datetime.now().strftime('%d/%m/%Y %H:%M')
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO chamados (cliente_id, descricao, data_abertura) VALUES (?, ?, ?)',
                      (dados['cliente_id'], dados['descricao'], data))
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Chamado aberto com sucesso!'}), 201
    except Exception as e:
        print("Erro ao abrir chamado:", e)
        return jsonify({'erro': 'Erro ao abrir chamado'}), 500

# Endpoint para listar todos os chamados
@app.route('/chamados', methods=['GET'])
def listar_chamados():
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM chamados')
        chamados = cursor.fetchall()
        conn.close()
        return jsonify(chamados)
    except Exception as e:
        print("Erro ao listar chamados:", e)
        return jsonify({'erro': 'Erro ao listar chamados'}), 500

# Endpoint para editar um chamado
@app.route('/chamados/<int:id>', methods=['PUT'])
def editar_chamado(id):
    try:
        dados = request.json
        print("Dados recebidos:", dados)  # Log para depuração

        if not dados or 'descricao' not in dados:
            return jsonify({'erro': 'Dados inválidos'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('UPDATE chamados SET descricao=?, status=? WHERE id=?',
                      (dados['descricao'], dados.get('status', 'Aberto'), id))
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Chamado atualizado com sucesso!'})
    except Exception as e:
        print("Erro ao editar chamado:", e)
        return jsonify({'erro': 'Erro ao editar chamado'}), 500

# Endpoint para fechar um chamado
@app.route('/chamados/<int:id>/fechar', methods=['PUT'])
def fechar_chamado(id):
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('UPDATE chamados SET status=? WHERE id=?', ('Fechado', id))
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Chamado fechado com sucesso!'})
    except Exception as e:
        print("Erro ao fechar chamado:", e)
        return jsonify({'erro': 'Erro ao fechar chamado'}), 500

# Rodar o aplicativo
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)  # Permite acesso pela rede local e internet
