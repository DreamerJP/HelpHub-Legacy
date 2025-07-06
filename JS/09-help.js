// 09-help.js - Central de Ajuda modular

// Verificação de permissões de administrador
async function checkAdminRole() {
    try {
        const res = await fetch('/auth/check-role');
        if (!res.ok) throw new Error('Falha ao verificar papel');
        const data = await res.json();
        if (data.role !== 'admin') {
            alert('Acesso negado. Apenas administradores podem acessar a Central de Ajuda.');
            window.location.href = '/p/home';
            return;
        }
    } catch (e) {
        console.error('Erro ao verificar permissões:', e);
        window.location.href = '/p/login';
    }
}

// Lista de tópicos de ajuda (arquivo e título)
const TOPICOS_AJUDA = [
    { title: 'Visão Geral', file: '/docs/md/09-help' },
    { title: 'Login e Acesso', file: '/docs/md/01-login' },
    { title: 'Página Inicial', file: '/docs/md/02-home' },
    { title: 'Clientes', file: '/docs/md/03-clientes' },
    { title: 'Chamados', file: '/docs/md/04-chamados' },
    { title: 'Agenda', file: '/docs/md/05-agenda' },
    { title: 'Usuários/Administração', file: '/docs/md/06-usuarios' },
    { title: 'Backups', file: '/docs/md/07-backups' },
    { title: 'Database Viewer', file: '/docs/md/08-db-viewer' },
    { title: 'Ordem de Serviço', file: '/docs/md/10-ordem-servico' },
    { title: 'Importação de Dados', file: '/docs/md/11-instrucoes-importacao' },
    { title: 'Exportação de Dados', file: '/docs/md/12-instrucoes-exportacao' },
    { title: 'Segurança do Sistema', file: '/docs/md/13-seguranca-sistema' },
    { title: 'URLs Amigáveis', file: '/docs/md/14-urls-amigaveis' }
];

document.addEventListener('DOMContentLoaded', () => {
    checkAdminRole().then(() => {
        carregarTopicos();
        document.getElementById('search-input').addEventListener('input', filtrarTopicos);
    }).catch(() => {
        // Se a verificação falhar, o redirecionamento já foi feito
        // Mas pode adicionar uma mensagem de erro aqui se necessário
    });
});

// Carrega a lista de tópicos na sidebar
function carregarTopicos() {
    const lista = document.getElementById('topic-list');
    lista.innerHTML = '';
    TOPICOS_AJUDA.forEach((topico, idx) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = topico.title;
        a.dataset.idx = idx;
        a.onclick = (e) => {
            e.preventDefault();
            selecionarTopico(idx);
        };
        li.appendChild(a);
        lista.appendChild(li);
    });
}

// Filtro de tópicos
function filtrarTopicos(e) {
    const termo = e.target.value.toLowerCase();
    const lista = document.getElementById('topic-list');
    lista.innerHTML = '';
    TOPICOS_AJUDA.forEach((topico, idx) => {
        if (topico.title.toLowerCase().includes(termo)) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.innerHTML = topico.title.replace(new RegExp(`(${termo})`, 'gi'), '<mark>$1</mark>');
            a.dataset.idx = idx;
            a.onclick = (e) => {
                e.preventDefault();
                selecionarTopico(idx);
            };
            li.appendChild(a);
            lista.appendChild(li);
        }
    });
}

// Seleciona e carrega um tópico
function selecionarTopico(idx) {
    document.querySelectorAll('#topic-list a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`#topic-list a[data-idx="${idx}"]`);
    if (link) link.classList.add('active');
    carregarMarkdown(TOPICOS_AJUDA[idx].file);
}

// Carrega e renderiza um arquivo markdown
async function carregarMarkdown(file) {
    try {
        showLoading();
        const res = await fetch(file);
        if (!res.ok) throw new Error('Arquivo de ajuda não encontrado');
        const md = await res.text();
        const html = marked.parse(md);
        const content = document.getElementById('help-content');
        content.innerHTML = html;
        // Destaca código
        content.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    } catch (e) {
        exibirMensagem('Erro ao carregar tópico: ' + e.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Utilitário para exibir mensagens
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const div = document.getElementById('help-mensagem');
    div.innerHTML = `<div class="alert alert-${tipo === 'erro' ? 'danger' : 'success'} mt-3">${mensagem}</div>`;
    setTimeout(() => { div.innerHTML = ''; }, 4000);
}

// Utilitários de loading
function showLoading() {
    document.body.style.cursor = 'wait';
}
function hideLoading() {
    document.body.style.cursor = '';
} 