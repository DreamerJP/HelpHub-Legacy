// 07-backups.js - Gerenciamento de Backups

document.addEventListener('DOMContentLoaded', () => {
    // Bloquear acesso para não-admins
    fetch('/auth/check-role').then(r => r.json()).then(data => {
        if (data.role !== 'admin') {
            exibirMensagem('Acesso restrito a administradores.', 'erro');
            setTimeout(() => { window.location.href = '/p/home'; }, 2000);
        }
    });
    carregarInfoBackups();
    carregarConfiguracoesBackup();
    document.getElementById('btn-backup-manual').addEventListener('click', realizarBackupManual);
    document.getElementById('config-backup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        let diretorio = document.getElementById('backup-dir').value.trim();
        // Normaliza as barras para frente
        diretorio = diretorio.replace(/\\\\/g, '/').replace(/\\/g, '/');
        await salvarConfiguracaoBackup(diretorio);
    });
});

// Carrega informações dos backups disponíveis
async function carregarInfoBackups() {
    try {
        showLoading();
        const response = await fetch('/system/backups');
        if (!response.ok) throw new Error('Falha ao carregar backups');
        const data = await response.json();
        document.getElementById('total-backups').textContent = data.total_backups;
        const lista = document.getElementById('lista-backups');
        if (!data.backups || data.backups.length === 0) {
            lista.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum backup encontrado</td></tr>';
        } else {
            lista.innerHTML = data.backups.map(backup => `
                <tr>
                    <td>${backup.nome}</td>
                    <td>${backup.data_criacao}</td>
                    <td>${backup.tamanho}</td>
                    <td><a href="/BACKUP/${backup.nome}" class="btn btn-sm btn-outline-primary" title="Baixar backup" download><i class="bi bi-download"></i></a></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        exibirMensagem('Erro ao carregar backups: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Realiza backup manual
async function realizarBackupManual() {
    try {
        showLoading();
        const response = await fetch('/system/backup/manual', { method: 'POST' });
        if (!response.ok) throw new Error('Falha ao realizar backup');
        exibirMensagem('Backup realizado com sucesso!');
        carregarInfoBackups();
    } catch (error) {
        exibirMensagem('Erro ao realizar backup: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Carrega configurações atuais de backup
async function carregarConfiguracoesBackup() {
    try {
        const response = await fetch('/system/backup-config');
        if (!response.ok) throw new Error('Falha ao carregar configuração');
        const data = await response.json();
        document.getElementById('backup-dir').value = data.diretorio_atual || '';
        document.getElementById('backup-dir-atual').textContent = data.diretorio_atual || 'Não configurado';
    } catch (error) {
        exibirMensagem('Erro ao carregar configuração: ' + error.message, 'erro');
    }
}

// Salva nova configuração de diretório de backup
async function salvarConfiguracaoBackup(diretorio) {
    try {
        showLoading();
        const response = await fetch('/system/backup-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diretorio })
        });
        if (!response.ok) throw new Error('Falha ao salvar configuração');
        exibirMensagem('Configuração de diretório salva com sucesso!');
        carregarConfiguracoesBackup();
    } catch (error) {
        exibirMensagem('Erro ao salvar configuração: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Utilitário para exibir mensagens
function exibirMensagem(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('toast-feedback');
    let body = document.getElementById('toast-feedback-body');
    if (!toast || !body) {
        // Cria toast se não existir
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

// Utilitários de loading
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