/* ===== FUNÇÕES ESPECÍFICAS PARA A PÁGINA DE LOGIN ===== */

/**
 * Função para verificar se é primeiro acesso
 */
async function checkFirstAccess() {
    try {
        const response = await fetch('/auth/check-first-access');
        const data = await response.json();

        if (data.is_first_access) {
            document.getElementById('first-access-alert').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao verificar primeiro acesso:', error);
    }
}

/**
 * Função para lidar com o envio do formulário de login
 */
async function handleLogin(e) {
    // Previne o comportamento padrão do formulário (recarregar página)
    e.preventDefault();

    // Obtém referências aos elementos do DOM
    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    const backupDiv = document.getElementById('backup-message');
    const backupText = document.getElementById('backup-text');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validação no cliente antes de enviar ao servidor
    if (!username || !password) {
        errorDiv.textContent = 'Usuário e senha são obrigatórios';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        // Desabilita o botão e altera o texto para feedback visual
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
        errorDiv.style.display = 'none';
        backupDiv.style.display = 'none';

        // Envia a solicitação de login para o servidor
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin', // Importante para manter a sessão
            body: JSON.stringify({ username, password })
        });

        // Processa a resposta do servidor
        const data = await response.json();
        console.log('Resposta do servidor:', data); // Log adicional para depuração

        if (data.initial_password_required) {
            // Mostra formulário de senha inicial
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('initial-password-form').style.display = 'block';
            return;
        }

        if (response.ok && data.success) {
            // Se houver informações de backup, armazena para exibir após o login
            if (data.backup) {
                localStorage.setItem('backup_info', JSON.stringify(data.backup));
            }

            // Se o login for bem-sucedido, redireciona para a página principal
            window.location.href = '/';
        } else {
            // Exibe mensagem de erro retornada pelo servidor
            errorDiv.textContent = data.error || 'Credenciais inválidas';
            errorDiv.style.display = 'block';

            // Limpa o campo de senha por segurança
            document.getElementById('password').value = '';
        }
    } catch (error) {
        // Trata erros de conexão ou outros problemas técnicos
        console.error('Erro de login:', error);
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.style.display = 'block';
    } finally {
        // Restaura o estado do botão após a conclusão
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
}

/**
 * Função para lidar com o formulário de senha inicial
 */
async function handleInitialPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('login-error');

    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'As senhas não coincidem';
        errorDiv.style.display = 'block';
        return;
    }

    if (newPassword.length < 8) {
        errorDiv.textContent = 'A senha deve ter pelo menos 8 caracteres';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/auth/set_initial_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ password: newPassword })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.href = '/';
        } else {
            errorDiv.textContent = data.error || 'Erro ao definir senha';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao definir senha:', error);
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.style.display = 'block';
    }
}

/**
 * Função para limpar mensagens de erro quando o usuário começa a digitar
 */
function clearErrors() {
    document.getElementById('login-error').style.display = 'none';
}

// ===== INICIALIZAÇÃO QUANDO A PÁGINA CARREGA =====

document.addEventListener('DOMContentLoaded', function () {
    // Executa a verificação de primeiro acesso
    checkFirstAccess();

    // Adiciona evento de envio ao formulário de login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Adiciona evento de envio ao formulário de senha inicial
    document.getElementById('initial-password-form').addEventListener('submit', handleInitialPassword);

    // Melhora a experiência do usuário ocultando erros quando começa a digitar novamente
    document.querySelectorAll('#username, #password, #new-password, #confirm-password').forEach(input => {
        input.addEventListener('input', clearErrors);
    });

    // Foco automático no campo de usuário
    document.getElementById('username').focus();
}); 