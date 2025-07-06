// 06-admin.js - Administração de Usuários

// Variáveis para controle de seleção de usuário
let selectedUserId = null;
let selectedUsername = null;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Descobrir usuário logado
    fetch('/auth/check-role').then(r => r.json()).then(data => {
        currentUserId = data.id || null;
    });
    carregarUsuarios();
    // Busca dinâmica
    const buscaInput = document.getElementById('busca-usuario');
    if (buscaInput) {
        buscaInput.addEventListener('input', function () {
            filtrarUsuarios(this.value);
        });
    }
    // Botões já estão no HTML, listeners são declarados inline
});

// Carrega a lista de usuários do sistema
async function carregarUsuarios() {
    try {
        showLoading();
        const response = await fetch('/usuarios');
        if (!response.ok) {
            throw new Error('Falha ao carregar usuários');
        }
        const usuarios = await response.json();
        const tbody = document.getElementById('usuarios-list');
        tbody.innerHTML = usuarios.map(usuario => `
            <tr data-id="${usuario.id}" data-username="${usuario.username}" style="cursor:pointer;">
                <td>${usuario.username}</td>
                <td>${usuario.role}</td>
                <td>${new Date(usuario.created_at).toLocaleString()}</td>
            </tr>
        `).join('');
        // Adiciona eventos de clique nas linhas
        document.querySelectorAll("#usuarios-list tr").forEach(row => {
            row.addEventListener('click', function () {
                document.querySelectorAll("#usuarios-list tr").forEach(r => r.classList.remove('selected'));
                this.classList.add('selected');
                const username = this.getAttribute('data-username');
                const id = this.getAttribute('data-id');
                document.getElementById('btn-editar-usuario').disabled = (currentUserId && id == currentUserId);
                document.getElementById('btn-excluir-usuario').disabled = (username === 'admin' || (currentUserId && id == currentUserId));
                selectedUserId = id;
                selectedUsername = username;
            });
        });
        // Atualizar filtro se já houver texto
        const buscaInput = document.getElementById('busca-usuario');
        if (buscaInput && buscaInput.value) filtrarUsuarios(buscaInput.value);
    } catch (error) {
        exibirMensagem('Erro ao carregar usuários: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Filtro de busca dinâmica
function filtrarUsuarios(termo) {
    termo = termo.toLowerCase();
    document.querySelectorAll('#usuarios-list tr').forEach(row => {
        const user = row.children[0].textContent.toLowerCase();
        const role = row.children[1].textContent.toLowerCase();
        if (user.includes(termo) || role.includes(termo)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Abre o modal para criar um novo usuário
function abrirModalNovoUsuario() {
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-form').reset();
    document.querySelector('#usuarioModal .modal-title').textContent = 'Novo Usuário';
    document.getElementById('senha-label-ajuda').textContent = '';
    document.getElementById('password').required = true;
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

// Salva um usuário novo ou editado
async function salvarUsuario() {
    const id = sanitizeInput(document.getElementById('usuario-id').value);
    const username = sanitizeInput(document.getElementById('username').value);
    const password = sanitizeInput(document.getElementById('password').value);
    const role = sanitizeInput(document.getElementById('role').value);
    try {
        const url = id ? `/usuarios/${id}` : '/usuarios';
        const method = id ? 'PUT' : 'POST';
        // Validação: senha obrigatória só no cadastro
        if (!id && !password) {
            exibirMensagem('Senha é obrigatória para novo usuário.', 'erro');
            return;
        }
        // Se edição e senha em branco, não enviar campo password
        const payload = id ? { username, role } : { username, password, role };
        if (id && password) payload.password = password;
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            exibirMensagem('Usuário salvo com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('usuarioModal')).hide();
            carregarUsuarios();
        } else {
            const error = await response.json();
            throw new Error(error.error);
        }
    } catch (error) {
        exibirMensagem(error.message || 'Erro ao salvar usuário', 'erro');
    }
}

// Seleciona um usuário para edição
function editarUsuarioSelecionado() {
    if (!selectedUserId) {
        exibirMensagem('Selecione um usuário para editar', 'erro');
        return;
    }
    if (currentUserId && selectedUserId == currentUserId) {
        exibirMensagem('Você não pode editar seu próprio usuário por aqui.', 'erro');
        return;
    }
    editarUsuario(selectedUserId);
}

// Edita um usuário existente
async function editarUsuario(id) {
    try {
        showLoading();
        const response = await fetch(`/usuarios/${id}`);
        if (!response.ok) throw new Error('Falha ao buscar usuário');
        const usuario = await response.json();
        document.getElementById('usuario-id').value = usuario.id;
        document.getElementById('username').value = usuario.username;
        document.getElementById('password').value = '';
        document.getElementById('role').value = usuario.role;
        document.querySelector('#usuarioModal .modal-title').textContent = 'Editar Usuário';
        document.getElementById('senha-label-ajuda').textContent = ' (deixe em branco para não alterar)';
        document.getElementById('password').required = false;
        new bootstrap.Modal(document.getElementById('usuarioModal')).show();
    } catch (error) {
        exibirMensagem('Erro ao buscar usuário: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Exclui o usuário selecionado após confirmação
function excluirUsuarioSelecionado() {
    if (!selectedUserId) {
        exibirMensagem('Selecione um usuário para excluir', 'erro');
        return;
    }
    if (selectedUsername === 'admin') {
        exibirMensagem('O usuário admin não pode ser excluído', 'erro');
        return;
    }
    if (currentUserId && selectedUserId == currentUserId) {
        exibirMensagem('Você não pode excluir seu próprio usuário.', 'erro');
        return;
    }
    excluirUsuario(selectedUserId);
}

// Exclui um usuário pelo ID
async function excluirUsuario(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
        showLoading();
        const response = await fetch(`/usuarios/${id}`, { method: 'DELETE' });
        if (response.ok) {
            exibirMensagem('Usuário excluído com sucesso!');
            carregarUsuarios();
        } else {
            const error = await response.json();
            throw new Error(error.error);
        }
    } catch (error) {
        exibirMensagem(error.message || 'Erro ao excluir usuário', 'erro');
    } finally {
        hideLoading();
    }
}

// Toast moderno para feedback
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast-feedback');
    const body = document.getElementById('toast-feedback-body');
    if (!toast || !body) { alert(mensagem); return; }
    body.textContent = mensagem;
    toast.className = 'toast align-items-center border-0';
    toast.classList.add(tipo === 'erro' ? 'text-bg-danger' : 'text-bg-success');
    const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
    bsToast.show();
}

// Utilitário para mostrar loading (pode ser adaptado)
function showLoading() {
    document.body.style.cursor = 'wait';
    if (!document.getElementById('global-loading')) {
        const div = document.createElement('div');
        div.id = 'global-loading';
        div.style.position = 'fixed';
        div.style.top = 0;
        div.style.left = 0;
        div.style.width = '100vw';
        div.style.height = '100vh';
        div.style.background = 'rgba(255,255,255,0.4)';
        div.style.zIndex = 99999;
        div.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"><div class="spinner-border text-primary" style="width:3rem;height:3rem;"></div></div>';
        document.body.appendChild(div);
    }
}
function hideLoading() {
    document.body.style.cursor = '';
    const div = document.getElementById('global-loading');
    if (div) div.remove();
}

// Utilitário para sanitizar entradas
function sanitizeInput(input) {
    return String(input).replace(/[<>"']/g, '');
} 