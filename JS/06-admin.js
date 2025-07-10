// 06-admin.js - Administração de Usuários

// Variáveis para controle de seleção de usuário
let selectedUserId = null;
let selectedUsername = null;
let currentUserId = null;

// Mock de vínculos usuário-departamento
let usuarioDepartamentos = [
    { usuarioId: 1, departamentoIds: [1, 2] }, // admin: TI, Financeiro
    { usuarioId: 2, departamentoIds: [1] }     // guest: TI
];

function mostrarAba(aba) {
    document.getElementById('aba-usuarios').style.display = (aba === 'usuarios') ? '' : 'none';
    document.getElementById('aba-departamentos').style.display = (aba === 'departamentos') ? '' : 'none';
    document.getElementById('tab-usuarios').classList.toggle('active', aba === 'usuarios');
    document.getElementById('tab-departamentos').classList.toggle('active', aba === 'departamentos');
    if (aba === 'departamentos') carregarDepartamentos();
    if (aba === 'usuarios') {
        renderizarFiltroDepartamento();
        adicionarEventoFiltroDepartamento();
        carregarUsuarios();
    }
}

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
    mostrarAba('usuarios'); // Exibe aba de usuários por padrão
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
        const usuariosOrdenados = [...usuarios].sort((a, b) => b.id - a.id);
        const filtroDep = document.getElementById('filtro-departamento');
        const depIdSelecionado = filtroDep ? parseInt(filtroDep.value) : null;
        // Buscar todos os vínculos de usuários
        let vinculos = {};
        for (const usuario of usuariosOrdenados) {
            const resp = await fetch(`/usuarios/${usuario.id}/departamentos`);
            if (resp.ok) {
                vinculos[usuario.id] = (await resp.json()) || [];
            } else {
                vinculos[usuario.id] = [];
            }
        }
        let usuariosFiltrados = usuariosOrdenados;
        if (depIdSelecionado) {
            usuariosFiltrados = usuariosOrdenados.filter(usuario =>
                vinculos[usuario.id].some(dep => dep.id === depIdSelecionado)
            );
        }
        const tbody = document.getElementById('usuarios-list');
        tbody.innerHTML = usuariosFiltrados.map(usuario => `
            <tr data-id="${usuario.id}" data-username="${usuario.username}" style="cursor:pointer;">
                <td>${usuario.id}</td>
                <td>${usuario.username}</td>
                <td>${usuario.role}</td>
                <td>${new Date(usuario.created_at).toLocaleString()}</td>
                <td>${(vinculos[usuario.id] || []).map(dep => dep.nome).join(', ')}</td>
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
        const user = row.children[1].textContent.toLowerCase();
        const role = row.children[2].textContent.toLowerCase();
        if (user.includes(termo) || role.includes(termo)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Buscar departamentos reais ao abrir modal de usuário
async function renderizarCheckboxDepartamentos(usuarioId) {
    const container = document.getElementById('departamentos-checkboxes');
    if (!container) return;
    // Buscar departamentos do backend
    let deps = [];
    try {
        const resp = await fetch('/departamentos');
        if (resp.ok) deps = await resp.json();
    } catch (e) { deps = []; }
    let selecionados = [];
    if (usuarioId) {
        // Buscar vínculos reais do usuário
        try {
            const resp = await fetch(`/usuarios/${usuarioId}/departamentos`);
            if (resp.ok) {
                const vincs = await resp.json();
                selecionados = vincs.map(v => v.id);
            }
        } catch (e) { selecionados = []; }
    }
    container.innerHTML = '<label class="form-label">Departamentos</label>' +
        deps.map(dep => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${dep.id}" id="dep-check-${dep.id}" ${selecionados.includes(dep.id) ? 'checked' : ''}>
                <label class="form-check-label" for="dep-check-${dep.id}">${dep.nome}</label>
            </div>
        `).join('');
}

// Ao abrir o modal de novo usuário, renderizar checkboxes reais
function abrirModalNovoUsuario() {
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-form').reset();
    document.querySelector('#usuarioModal .modal-title').textContent = 'Novo Usuário';
    document.getElementById('senha-label-ajuda').textContent = '';
    document.getElementById('password').required = true;
    renderizarCheckboxDepartamentos(null);
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

// Ao abrir o modal de edição, renderizar checkboxes reais
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
        await renderizarCheckboxDepartamentos(usuario.id);
        new bootstrap.Modal(document.getElementById('usuarioModal')).show();
    } catch (error) {
        exibirMensagem('Erro ao buscar usuário: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Salvar vínculos reais após salvar usuário
async function salvarUsuario() {
    const id = sanitizeInput(document.getElementById('usuario-id').value);
    const username = sanitizeInput(document.getElementById('username').value);
    const password = sanitizeInput(document.getElementById('password').value);
    const role = sanitizeInput(document.getElementById('role').value);
    // Coletar departamentos selecionados
    const depChecks = document.querySelectorAll('#departamentos-checkboxes input[type=checkbox]:checked');
    const departamentosSelecionados = Array.from(depChecks).map(cb => parseInt(cb.value));
    try {
        let url = id ? `/usuarios/${id}` : '/usuarios';
        let method = id ? 'PUT' : 'POST';
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
            let userId = id;
            if (!id) {
                // Novo usuário: buscar o ID retornado
                const res = await response.json();
                userId = res.id || null;
            }
            // Salvar vínculos reais
            if (userId) {
                await fetch(`/usuarios/${userId}/departamentos`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ departamentos: departamentosSelecionados })
                });
            }
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

// Utilitário para mostrar loading
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

// --- Integração real com backend para departamentos ---
let departamentos = [];
let departamentoSelecionadoId = null;

async function carregarDepartamentos() {
    try {
        showLoading();
        const response = await fetch('/departamentos');
        if (!response.ok) throw new Error('Falha ao carregar departamentos');
        departamentos = await response.json();
        renderizarDepartamentos();
    } catch (error) {
        exibirMensagem('Erro ao carregar departamentos: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

function contarUsuariosPorDepartamento(usuarios) {
    const contagem = {};
    usuarios.forEach(user => {
        (user.departamentos || []).forEach(dep => {
            contagem[dep.id] = (contagem[dep.id] || 0) + 1;
        });
    });
    return contagem;
}

async function renderizarDepartamentos() {
    const tbody = document.getElementById('departamentos-list');
    const departamentosOrdenados = [...departamentos].sort((a, b) => b.id - a.id);
    // Carregar todos os usuários e seus departamentos
    let usuarios = [];
    try {
        const resp = await fetch('/usuarios');
        if (resp.ok) usuarios = await resp.json();
        // Para cada usuário, buscar os departamentos vinculados
        for (const user of usuarios) {
            const depResp = await fetch(`/usuarios/${user.id}/departamentos`);
            if (depResp.ok) {
                user.departamentos = await depResp.json();
            } else {
                user.departamentos = [];
            }
        }
    } catch (e) { usuarios = []; }
    const contagem = contarUsuariosPorDepartamento(usuarios);
    tbody.innerHTML = departamentosOrdenados.map(dep => `
        <tr data-id="${dep.id}" class="${dep.id == departamentoSelecionadoId ? 'selected' : ''}" style="cursor:pointer;">
            <td>${dep.id}</td>
            <td>${dep.nome}</td>
            <td>${dep.descricao || ''}</td>
            <td>${contagem[dep.id] || 0}</td>
        </tr>
    `).join('');
    // Seleção de linha
    document.querySelectorAll('#departamentos-list tr').forEach(row => {
        row.addEventListener('click', function () {
            document.querySelectorAll('#departamentos-list tr').forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
            departamentoSelecionadoId = parseInt(this.getAttribute('data-id'));
            document.getElementById('btn-editar-departamento').disabled = false;
            document.getElementById('btn-excluir-departamento').disabled = false;
        });
    });
    // Desabilita botões se nada selecionado
    if (!departamentoSelecionadoId) {
        document.getElementById('btn-editar-departamento').disabled = true;
        document.getElementById('btn-excluir-departamento').disabled = true;
    }
}

function abrirModalNovoDepartamento() {
    document.getElementById('departamento-id').value = '';
    document.getElementById('departamento-form').reset();
    document.querySelector('#departamentoModal .modal-title').textContent = 'Novo Departamento';
    new bootstrap.Modal(document.getElementById('departamentoModal')).show();
}

function editarDepartamentoSelecionado() {
    if (!departamentoSelecionadoId) return;
    const dep = departamentos.find(d => d.id === departamentoSelecionadoId);
    if (!dep) return;
    document.getElementById('departamento-id').value = dep.id;
    document.getElementById('departamento-nome').value = dep.nome;
    document.getElementById('departamento-descricao').value = dep.descricao || '';
    document.querySelector('#departamentoModal .modal-title').textContent = 'Editar Departamento';
    new bootstrap.Modal(document.getElementById('departamentoModal')).show();
}

async function salvarDepartamento() {
    const id = document.getElementById('departamento-id').value;
    const nome = document.getElementById('departamento-nome').value.trim();
    const descricao = document.getElementById('departamento-descricao').value.trim();
    if (!nome) {
        exibirMensagem('Nome do departamento é obrigatório.', 'erro');
        return;
    }
    try {
        showLoading();
        let response;
        if (id) {
            // Editar existente
            response = await fetch(`/departamentos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao })
            });
        } else {
            // Novo departamento
            response = await fetch('/departamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao })
            });
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar departamento');
        }
        bootstrap.Modal.getInstance(document.getElementById('departamentoModal')).hide();
        exibirMensagem('Departamento salvo com sucesso!');
        departamentoSelecionadoId = null;
        await carregarDepartamentos();
    } catch (error) {
        exibirMensagem(error.message || 'Erro ao salvar departamento', 'erro');
    } finally {
        hideLoading();
    }
}

async function excluirDepartamentoSelecionado() {
    if (!departamentoSelecionadoId) return;
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    try {
        showLoading();
        const response = await fetch(`/departamentos/${departamentoSelecionadoId}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir departamento');
        }
        exibirMensagem('Departamento excluído com sucesso!');
        departamentoSelecionadoId = null;
        await carregarDepartamentos();
    } catch (error) {
        exibirMensagem(error.message || 'Erro ao excluir departamento', 'erro');
    } finally {
        hideLoading();
    }
}

// Função auxiliar para obter nomes dos departamentos de um usuário
function getDepartamentosDoUsuario(userId) {
    const vinculo = usuarioDepartamentos.find(v => v.usuarioId == userId);
    if (!vinculo) return '';
    return vinculo.departamentoIds
        .map(depId => {
            const dep = departamentos.find(d => d.id === depId);
            return dep ? dep.nome : '';
        })
        .filter(Boolean)
        .join(', ');
}

function renderizarFiltroDepartamento() {
    const select = document.getElementById('filtro-departamento');
    if (!select) return;
    select.innerHTML = `<option value="">Todos os Departamentos</option>` +
        departamentos.map(dep => `<option value="${dep.id}">${dep.nome}</option>`).join('');
}

// Adicionar evento ao filtro
function adicionarEventoFiltroDepartamento() {
    const select = document.getElementById('filtro-departamento');
    if (select) {
        select.addEventListener('change', carregarUsuarios);
    }
} 