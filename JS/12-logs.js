// 12-logs.js - Visualização de Logs do Sistema

document.addEventListener('DOMContentLoaded', () => {
    // Bloquear acesso para não-admins
    fetch('/auth/check-role').then(r => r.json()).then(data => {
        if (data.role !== 'admin') {
            exibirMensagem('Acesso restrito a administradores.', 'erro');
            setTimeout(() => { window.location.href = '/p/home'; }, 2000);
        }
    });
    // Eventos
    document.getElementById('tipo-log').addEventListener('change', carregarLog);
    document.getElementById('filtro-data').addEventListener('change', carregarLog);
    document.getElementById('btn-download-log').addEventListener('click', baixarLog);
    setupPaginacao();
    carregarLog();
});

let paginaAtual = 1;
const linhasPorPagina = 100;
let linhasFiltradasGlobal = [];

// Atualiza paginação e tabela
function atualizarTabelaPaginada() {
    const tabela = document.getElementById('tabela-logs');
    const infoPagina = document.getElementById('info-pagina');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnProxima = document.getElementById('btn-proxima');
    const totalLinhas = linhasFiltradasGlobal.length;
    const totalPaginas = Math.max(1, Math.ceil(totalLinhas / linhasPorPagina));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    const inicio = (paginaAtual - 1) * linhasPorPagina;
    const fim = inicio + linhasPorPagina;
    const linhasPagina = linhasFiltradasGlobal.slice(inicio, fim);
    if (linhasPagina.length === 0) {
        tabela.innerHTML = '<tr><td colspan="2" class="text-center">Nenhuma linha encontrada</td></tr>';
    } else {
        tabela.innerHTML = linhasPagina.map((linha, i) =>
            `<tr><td>${inicio + i + 1}</td><td style="white-space:pre-line;">${linha}</td></tr>`
        ).join('');
    }
    infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    btnAnterior.disabled = paginaAtual === 1;
    btnProxima.disabled = paginaAtual === totalPaginas;
}

// Eventos de paginação
function setupPaginacao() {
    document.getElementById('btn-anterior').addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            atualizarTabelaPaginada();
        }
    });
    document.getElementById('btn-proxima').addEventListener('click', () => {
        const totalPaginas = Math.max(1, Math.ceil(linhasFiltradasGlobal.length / linhasPorPagina));
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            atualizarTabelaPaginada();
        }
    });
}

// Busca e exibe o log selecionado
async function carregarLog() {
    const tipo = document.getElementById('tipo-log').value;
    const filtroData = document.getElementById('filtro-data').value;
    const tabela = document.getElementById('tabela-logs');
    try {
        showLoading();
        const resp = await fetch(`/logs/${tipo}`);
        if (!resp.ok) throw new Error('Falha ao buscar log');
        const texto = await resp.text();
        const linhas = texto.split('\n');
        let linhasFiltradas = linhas;
        if (filtroData) {
            linhasFiltradas = linhas.filter(l => l.includes(filtroData));
        }
        linhasFiltradasGlobal = linhasFiltradas;
        paginaAtual = 1;
        atualizarTabelaPaginada();
    } catch (e) {
        tabela.innerHTML = '<tr><td colspan="2" class="text-center text-danger">Erro ao carregar log</td></tr>';
        exibirMensagem('Erro ao carregar log: ' + e.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Download do log selecionado
function baixarLog() {
    const tipo = document.getElementById('tipo-log').value;
    window.open(`/logs/${tipo}`, '_blank');
}

// Toast moderno para feedback
function exibirMensagem(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('toast-feedback');
    let body = document.getElementById('toast-feedback-body');
    if (!toast || !body) {
        toast = document.createElement('div');
        toast.id = 'toast-feedback';
        toast.className = 'toast align-items-center border-0 position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = 9999;
        toast.innerHTML = `<div class="d-flex"><div class="toast-body" id="toast-feedback-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
        document.body.appendChild(toast);
        body = document.getElementById('toast-feedback-body');
    }
    body.textContent = mensagem;
    toast.className = 'toast align-items-center border-0 position-fixed bottom-0 end-0 p-3';
    toast.classList.add(tipo === 'erro' ? 'text-bg-danger' : 'text-bg-success');
    const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
    bsToast.show();
}

// Spinner de loading global
function showLoading() {
    document.body.style.cursor = 'wait';
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = '';
}
function hideLoading() {
    document.body.style.cursor = '';
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
} 