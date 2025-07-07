// Interceptor global para tratar erros de autenticação e gerenciar logout por inatividade
(function () {
    'use strict';

    // Não executa na tela de login
    if (window.location.pathname.includes('01-login.html') || window.location.pathname === '/p/login') return;

    // Configurações de timeout (PADRÃO)
    const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 horas em millisegundos
    const WARNING_TIMEOUT = 7.5 * 60 * 60 * 1000; // 7.5 horas (30 min antes)
    const CHECK_INTERVAL = 60000; // Verifica a cada 1 minuto
    const RENEW_THROTTLE = 30000; // Throttle de 30 segundos para renovação de sessão

    let lastActivity = Date.now();
    let lastRenewAttempt = 0; // Controle de throttle para renovação
    let warningShown = false;
    let logoutTimer = null;
    let warningTimer = null;

    // Salva a função fetch original
    const originalFetch = window.fetch;

    // Substitui fetch por uma versão que intercepta erros de autenticação
    window.fetch = function (...args) {
        return originalFetch.apply(this, args).then(response => {
            // Se for erro 401 (não autorizado), trata automaticamente
            if (response.status === 401) {
                // Clona a resposta para poder lê-la duas vezes
                const clonedResponse = response.clone();

                clonedResponse.json().then(data => {
                    // Redireciona para login imediatamente
                    window.location.href = data.redirect || '/p/login';
                }).catch(() => {
                    // Se não conseguir ler o JSON, redireciona mesmo assim
                    window.location.href = '/p/login';
                });
            }

            // Retorna a resposta original para que o código continue funcionando
            return response;
        });
    };

    // Função para renovar a sessão com throttle
    function renewSession() {
        const now = Date.now();

        // Throttle: só renova se passou pelo menos 30 segundos desde a última tentativa
        if (now - lastRenewAttempt < RENEW_THROTTLE) {
            return;
        }

        lastRenewAttempt = now;

        fetch('/auth/renew-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    lastActivity = Date.now();
                    warningShown = false;
                    resetTimers();
                    console.log('Sessão renovada com sucesso');
                }
            })
            .catch(error => {
                console.error('Erro ao renovar sessão:', error);
            });
    }

    // Função para verificar se o usuário está logado
    function checkAuthStatus() {
        fetch('/auth/check-session')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Sessão inválida');
                }
                return response.json();
            })
            .then(data => {
                if (!data.valid) {
                    throw new Error(data.error || 'Sessão inválida');
                }
            })
            .catch(() => {
                // Redireciona para login imediatamente
                window.location.href = '/p/login';
            });
    }

    // Função para mostrar aviso de logout
    function showLogoutWarning() {
        if (warningShown) return;

        warningShown = true;

        // Cria um modal de aviso
        const warningModal = document.createElement('div');
        warningModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        warningModal.innerHTML = `
    <div style="
        background: #ffffff;
        padding: 32px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
        width: 90vw;
        box-shadow: 0 20px 60px rgba(0,0,0,0.12);
        position: relative;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease-out;
        border: 1px solid rgba(0,0,0,0.06);
    ">
        <div style="margin-bottom: 24px;">
            <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: #fef3e2;
                color: #f59e0b;
                border-radius: 50%;
                width: 52px;
                height: 52px;
                font-size: 24px;
                margin-bottom: 16px;
            ">⏰</div>
        </div>
        
        <h3 style="
            color: #111827; 
            margin: 0 0 16px 0; 
            font-size: 20px; 
            font-weight: 600;
            letter-spacing: -0.025em;
        ">
            Sessão expirando
        </h3>
        
        <p style="
            margin: 0 0 32px 0; 
            color: #6b7280; 
            font-size: 15px; 
            line-height: 1.5;
        ">
            Sua sessão expirará em <strong style="color: #374151;">20 segundos</strong>. 
            Deseja continuar?
        </p>
        
        <div style="
            display: flex; 
            gap: 12px; 
            justify-content: center;
            flex-wrap: wrap;
        ">
            <button id="keep-session-btn" style="
                background: #3b82f6;
                color: #ffffff;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                box-shadow: 0 1px 3px rgba(59, 130, 246, 0.15);
                min-width: 120px;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                Continuar
            </button>
            
            <button id="logout-now-btn" style="
                background: #ffffff;
                color: #6b7280;
                border: 1px solid #d1d5db;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                min-width: 120px;
            " onmouseover="this.style.background='#f9fafb'; this.style.color='#374151'" onmouseout="this.style.background='#ffffff'; this.style.color='#6b7280'">
                Sair
            </button>
        </div>
    </div>
    
    <style>
        @keyframes slideIn {
            from { 
                opacity: 0; 
                transform: translateY(-20px) scale(0.95);
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
        }
        
        #keep-session-btn:active {
            transform: translateY(1px);
        }
        
        #logout-now-btn:active {
            transform: translateY(1px);
        }
    </style>
`;

        document.body.appendChild(warningModal);

        // Event listeners para os botões
        document.getElementById('keep-session-btn').addEventListener('click', () => {
            renewSession();
            document.body.removeChild(warningModal);
        });

        document.getElementById('logout-now-btn').addEventListener('click', () => {
            window.location.href = '/auth/logout';
        });
    }

    // Função para fazer logout automático
    function forceLogout() {
        console.log('Logout automático por inatividade');
        window.location.href = '/auth/logout';
    }

    // Função para resetar os timers
    function resetTimers() {
        // Limpa timers existentes
        if (logoutTimer) clearTimeout(logoutTimer);
        if (warningTimer) clearTimeout(warningTimer);

        // Configura novos timers
        warningTimer = setTimeout(showLogoutWarning, WARNING_TIMEOUT);
        logoutTimer = setTimeout(forceLogout, SESSION_TIMEOUT);
    }

    // Função para detectar atividade do usuário
    function updateActivity() {
        lastActivity = Date.now();
        if (!warningShown) {
            // Só renova a sessão se passou tempo suficiente desde a última tentativa
            const now = Date.now();
            if (now - lastRenewAttempt >= RENEW_THROTTLE) {
                renewSession();
            }
            resetTimers();
        }
    }

    // Event listeners para detectar atividade
    const activityEvents = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });

    // Verifica autenticação e configura timers a cada minuto
    setInterval(() => {
        checkAuthStatus();

        // Verifica se passou muito tempo desde a última atividade
        const timeSinceActivity = Date.now() - lastActivity;
        if (timeSinceActivity > SESSION_TIMEOUT) {
            forceLogout();
        }
    }, CHECK_INTERVAL);

    // Verifica autenticação quando a página carrega
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            checkAuthStatus();
            resetTimers();
        });
    } else {
        checkAuthStatus();
        resetTimers();
    }

    console.log('Sistema de autenticação e logout por inatividade carregado');
})(); 