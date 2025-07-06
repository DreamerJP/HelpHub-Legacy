// Interceptor global para tratar erros de autenticação
(function () {
    'use strict';

    // Não executa na tela de login
    if (window.location.pathname.includes('01-login.html') || window.location.pathname === '/p/login') return;

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

    // Verifica autenticação a cada 30 segundos
    setInterval(checkAuthStatus, 30000);

    // Verifica autenticação quando a página carrega
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthStatus);
    } else {
        checkAuthStatus();
    }

    console.log('Interceptor de autenticação carregado');
})(); 