// Script para inserir a navbar em todas as páginas automaticamente
// Exceto páginas de login (01-login.html)
(function () {
  // Não inserir na página de login
  if (window.location.pathname.includes('01-login.html') || window.location.pathname === '/login') return;

  // Carrega a navbar
  fetch('/html/11-navbar.html')
    .then(response => response.text())
    .then(html => {
      // Cria um elemento temporário para parsear o HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      // Insere a navbar logo após o <body>
      document.body.insertBefore(temp.firstElementChild, document.body.firstChild);
      // Inicializa dropdowns do Bootstrap após inserir a navbar
      if (window.bootstrap && bootstrap.Dropdown) {
        var dropdownElements = document.querySelectorAll('.dropdown-toggle');
        dropdownElements.forEach(function (dropdownToggleEl) {
          new bootstrap.Dropdown(dropdownToggleEl);
        });
      } else {
        console.error('Bootstrap JS não está disponível! Verifique se o script do Bootstrap está incluído corretamente no HTML.');
      }
      // Inicializa funcionalidades após inserir a navbar
      initializeNavbar();
    })
    .catch(error => {
      console.error('Erro ao carregar navbar:', error);
    });

  // Função para inicializar todas as funcionalidades da navbar
  function initializeNavbar() {
    // Aguarda um frame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      setupActiveLink();
      setupUserInfo();
      setupMobileMenu();
      setupDropdowns();
      setupSessionValidation();

      // Exibir link de logs apenas para admin
      fetch('/auth/check-role').then(r => r.json()).then(data => {
        console.log('Permissão detectada:', data.role);
        if (data.role === 'admin') {
          const linkLogs = document.getElementById('link-logs');
          if (linkLogs) {
            linkLogs.style.display = '';
            console.log('Link de logs exibido para admin.');
          } else {
            console.warn('Elemento link-logs não encontrado no DOM.');
          }
        } else {
          console.log('Usuário não é admin, link de logs oculto.');
        }
      }).catch(e => {
        console.error('Erro ao verificar permissão para logs:', e);
      });
    });
  }

  // Função para validar sessão periodicamente
  function setupSessionValidation() {
    // Verifica a sessão a cada 30 segundos
    setInterval(() => {
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
        .catch(error => {
          console.warn('Sessão invalidada:', error.message);
          alert('Sua sessão foi invalidada devido a mudanças no banco de dados. Você será redirecionado para a tela de login.');
          window.location.href = '/login';
        });
    }, 30000); // 30 segundos
  }

  // Função global para tratar erros de autenticação
  window.handleAuthError = function (response) {
    if (response.status === 401) {
      response.json().then(data => {
        console.warn('Erro de autenticação:', data.error);
        alert('Sua sessão foi invalidada. Você será redirecionado para a tela de login.');
        window.location.href = data.redirect || '/login';
      }).catch(() => {
        window.location.href = '/login';
      });
      return true; // Indica que o erro foi tratado
    }
    return false; // Indica que o erro não foi tratado
  };

  // Destaca o link ativo baseado na página atual
  function setupActiveLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && currentPath.includes(href)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // Configuração das informações do usuário
  function setupUserInfo() {
    const userName = document.getElementById('userName');
    const adminMenu = document.getElementById('adminDropdown')?.closest('.nav-item');

    if (userName) {
      fetch('/auth/check-role')
        .then(res => res.json())
        .then(data => {
          if (data.username) {
            userName.textContent = data.username;
            // Exibe papel do usuário como tooltip
            userName.title = data.role;
            // Esconde menu Admin se não for admin
            if (adminMenu && data.role !== 'admin') {
              adminMenu.style.display = 'none';
            } else if (adminMenu) {
              adminMenu.style.display = '';
            }
          } else {
            userName.textContent = 'Usuário';
            if (adminMenu) adminMenu.style.display = 'none';
          }
        })
        .catch(() => {
          userName.textContent = 'Usuário';
          if (adminMenu) adminMenu.style.display = 'none';
        });
    }
  }

  // Configuração do menu mobile
  function setupMobileMenu() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    if (navbarToggler && navbarCollapse) {
      // Fecha o menu ao clicar em um link (mobile)
      const navLinks = navbarCollapse.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 992) { // Bootstrap lg breakpoint
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
              toggle: false
            });
            bsCollapse.hide();
          }
        });
      });
    }
  }

  // Configuração dos dropdowns
  function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-toggle');

    dropdowns.forEach(dropdown => {
      dropdown.addEventListener('shown.bs.dropdown', function () {
        // Adiciona classe para styling quando dropdown está aberto
        this.classList.add('dropdown-open');
      });

      dropdown.addEventListener('hidden.bs.dropdown', function () {
        // Remove classe quando dropdown fecha
        this.classList.remove('dropdown-open');
      });
    });
  }

  // Função para logout
  function handleLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
      // Implementar lógica de logout
      window.location.href = '/force-logout';
    }
  }

  // Adiciona listener para botão de logout
  document.addEventListener('click', function (e) {
    if (e.target.closest('[href="/force-logout"]')) {
      e.preventDefault();
      handleLogout();
    }
  });

  // Função para redimensionamento da janela
  function handleResize() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      // Ajusta comportamento responsivo se necessário
      if (window.innerWidth >= 992) {
        // Desktop
        navbar.classList.add('navbar-expand-lg');
      }
    }
  }

  // Listener para redimensionamento
  window.addEventListener('resize', handleResize);

  // Função para keyboard navigation
  document.addEventListener('keydown', function (e) {
    // ESC fecha dropdowns
    if (e.key === 'Escape') {
      const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
      openDropdowns.forEach(dropdown => {
        const toggle = dropdown.previousElementSibling;
        if (toggle) {
          const bsDropdown = new bootstrap.Dropdown(toggle);
          bsDropdown.hide();
        }
      });
    }

    // Ctrl+K para foco na busca
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
      }
    }
  });

  // Exposição de funções globais para uso em outras partes do sistema
  window.HelpHubNavbar = {
    handleLogout
  };
})();