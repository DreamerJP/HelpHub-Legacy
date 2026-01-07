// Script para inserir a navbar em todas as páginas automaticamente
// Exceto páginas de login (01-login.html, /login, /p/login)
(function () {
  const loginPaths = ['/login', '/p/login', '/01-login.html'];
  if (loginPaths.some(path => window.location.pathname === path || window.location.pathname.endsWith(path))) return;

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
      setupColorInvert();
      setupThemeToggle();
      if (window.setupSessionValidation) window.setupSessionValidation();
      // Exibir link de logs apenas para admin
      if (window.isUserAdmin) {
        window.isUserAdmin().then(isAdmin => {
          const linkLogs = document.getElementById('link-logs');
          if (linkLogs) {
            linkLogs.style.display = isAdmin ? '' : 'none';
            if (isAdmin) {
              console.log('Link de logs exibido para admin.');
            } else {
              console.log('Usuário não é admin, link de logs oculto.');
            }
          } else {
            console.warn('Elemento link-logs não encontrado no DOM.');
          }
        }).catch(e => {
          console.error('Erro ao verificar permissão para logs:', e);
        });
      }
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

  // Função para configurar dropdowns em mobile
  function setupMobileDropdowns() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', function (e) {
        if (window.innerWidth < 992) {
          e.preventDefault(); // Impede o Bootstrap de agir
          e.stopPropagation(); // Impede que o collapse seja fechado
          // Verifica se o dropdown está aberto
          const dropdownMenu = this.nextElementSibling;
          const isOpen = dropdownMenu.classList.contains('show');
          // Fecha todos os outros dropdowns primeiro
          document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (menu !== dropdownMenu) {
              menu.classList.remove('show');
              menu.previousElementSibling.classList.remove('show');
            }
          });
          // Alterna o dropdown atual
          if (isOpen) {
            dropdownMenu.classList.remove('show');
            this.classList.remove('show');
          } else {
            dropdownMenu.classList.add('show');
            this.classList.add('show');
          }
        }
      });
      // Remove o atributo data-bs-toggle em mobile e restaura em desktop
      function updateToggleAttr() {
        if (window.innerWidth < 992) {
          toggle.removeAttribute('data-bs-toggle');
        } else {
          toggle.setAttribute('data-bs-toggle', 'dropdown');
        }
      }
      updateToggleAttr();
      window.addEventListener('resize', updateToggleAttr);
    });
  }

  // Configuração do menu mobile
  function setupMobileMenu() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    if (navbarToggler && navbarCollapse) {
      // Fecha o menu apenas em links que NÃO são dropdowns
      const navLinks = navbarCollapse.querySelectorAll('.nav-link:not(.dropdown-toggle)');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 992) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
              toggle: false
            });
            bsCollapse.hide();
          }
        });
      });
      // Configurar dropdowns específicos para mobile
      setupMobileDropdowns();
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
  });

  // Função adicional para lidar com mudanças de tamanho de tela
  function handleDropdownResize() {
    // Fecha todos os dropdowns quando muda para desktop
    if (window.innerWidth >= 992) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
        menu.previousElementSibling.classList.remove('show');
      });
    }
  }
  window.addEventListener('resize', handleDropdownResize);

  // Configuração do inversor de cores
  function setupColorInvert() {
    const invertToggle = document.getElementById('invert-toggle');

    if (!invertToggle) {
      console.warn('Botão de inversão de cores não encontrado');
      return;
    }

    // Carrega a configuração salva
    const isInverted = localStorage.getItem('colorInvert') === 'true';
    if (isInverted) {
      document.documentElement.classList.add('color-invert');
      invertToggle.classList.add('color-invert-active');
    }

    // Evento de click
    invertToggle.addEventListener('click', function() {
      const html = document.documentElement;
      const isCurrentlyInverted = html.classList.contains('color-invert');

      if (isCurrentlyInverted) {
        html.classList.remove('color-invert');
        invertToggle.classList.remove('color-invert-active');
        localStorage.setItem('colorInvert', 'false');
      } else {
        // Ativar inversão - desativar brilho automaticamente
        html.classList.add('color-invert');
        html.classList.remove('dark-mode');
        invertToggle.classList.add('color-invert-active');
        localStorage.setItem('colorInvert', 'true');
        localStorage.setItem('themeIntensity', '0');
        // Reset do slider se existir
        const slider = document.getElementById('theme-intensity');
        const value = document.getElementById('intensity-value');
        if (slider) slider.value = 0;
        if (value) value.textContent = '0%';
      }
    });
  }

  // Configuração do controle de brilho
  function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const intensitySlider = document.getElementById('theme-intensity');
    const intensityValue = document.getElementById('intensity-value');

    if (!themeToggle || !intensitySlider || !intensityValue) {
      console.warn('Elementos do controle de tema não encontrados');
      return;
    }

    if (localStorage.getItem('darkMode') !== null) {
      localStorage.removeItem('darkMode');
    }

    let savedIntensity = Math.min(parseInt(localStorage.getItem('themeIntensity')) || 0, 70);

    // Aplica a intensidade inicial
    applyThemeIntensity(savedIntensity);

    // Configura o slider
    intensitySlider.value = savedIntensity;
    intensitySlider.max = 70; // Máximo seguro: 70%
    updateIntensityDisplay(savedIntensity);

    // Evento para mudanças no slider
    intensitySlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      applyThemeIntensity(value);
      updateIntensityDisplay(value);
      localStorage.setItem('themeIntensity', value);

      // Se brilho > 0, desativar inversão de cores automaticamente
      if (value > 0) {
        const invertToggle = document.getElementById('invert-toggle');
        document.documentElement.classList.remove('color-invert');
        if (invertToggle) {
          invertToggle.classList.remove('color-invert-active');
        }
        localStorage.setItem('colorInvert', 'false');
      }
    });

    function applyThemeIntensity(value) {
      const opacity = value / 100; // 0 = 0%, 100 = 100%

      if (value === 0) {
        // Remove completamente o overlay quando em 0%
        document.documentElement.classList.remove('dark-mode');
      } else {
        document.documentElement.classList.add('dark-mode');
      }

      document.documentElement.style.setProperty('--theme-intensity', opacity);
    }

    function updateIntensityDisplay(value) {
      intensityValue.textContent = value + '%';

      const dropdown = intensitySlider.closest('.theme-dropdown');
      if (value >= 50) {
        dropdown.classList.add('theme-intensity-high');
      } else {
        dropdown.classList.remove('theme-intensity-high');
      }
    }
  }

  // Exposição de funções globais para uso em outras partes do sistema
  window.HelpHubNavbar = {
    handleLogout
  };
})();