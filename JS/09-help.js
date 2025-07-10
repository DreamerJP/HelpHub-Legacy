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

// Função utilitária para remover acentos
function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Cache para conteúdos dos tópicos
const CONTEUDO_TOPICOS = {};

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

// Debounce utilitário
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Função para gerar snippet com termo destacado
function gerarSnippet(conteudo, termo, tamanho = 40) {
    if (!termo) return '';
    const termoNormalizado = removerAcentos(termo.toLowerCase());
    const conteudoNormalizado = removerAcentos(conteudo.toLowerCase());
    const idx = conteudoNormalizado.indexOf(termoNormalizado);
    if (idx === -1) return '';
    const ini = Math.max(0, idx - tamanho / 2);
    const fim = Math.min(conteudo.length, idx + termo.length + tamanho / 2);
    let snippet = conteudo.substring(ini, fim);
    // Destacar termo
    const regex = new RegExp(`(${termo})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
    return '... ' + snippet + ' ...';
}

// Busca fuzzy com Fuse.js
function fuzzySearch(termo) {
    const options = {
        includeScore: true,
        threshold: 0.6, // mais tolerante
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
            { name: 'title', weight: 0.7 },
            { name: 'conteudo', weight: 0.3 }
        ]
    };
    // Monta array de objetos com título e conteúdo
    const docs = TOPICOS_AJUDA.map((topico, idx) => ({
        idx,
        title: topico.title,
        conteudo: CONTEUDO_TOPICOS[idx] || ''
    }));
    const fuse = new Fuse(docs, options);
    return fuse.search(termo);
}

function filtrarTopicos(e) {
    const termo = e.target.value.toLowerCase();
    const termoNormalizado = removerAcentos(termo);
    const lista = document.getElementById('topic-list');
    lista.innerHTML = '';
    // Se o campo de busca estiver vazio, mostra todos os tópicos
    if (!termoNormalizado) {
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
        return;
    }
    // Se Fuse.js estiver disponível, faz busca fuzzy
    if (typeof Fuse !== 'undefined') {
        let resultados = fuzzySearch(termo);
        // Fallback: se não encontrar nada, faz busca exata simples
        if (resultados.length === 0) {
            resultados = TOPICOS_AJUDA.map((topico, idx) => {
                const tituloNormalizado = removerAcentos(topico.title.toLowerCase());
                const conteudoNormalizado = removerAcentos((CONTEUDO_TOPICOS[idx] || '').toLowerCase());
                if (tituloNormalizado.includes(termoNormalizado) || conteudoNormalizado.includes(termoNormalizado)) {
                    return { item: { idx } };
                }
                return null;
            }).filter(Boolean);
        }
        resultados.forEach(res => {
            const idx = res.item.idx;
            const topico = TOPICOS_AJUDA[idx];
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            // Destacar termo no título
            let tituloOriginal = topico.title;
            let tituloDestacado = tituloOriginal.replace(new RegExp(`(${termo.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
            a.innerHTML = tituloDestacado;
            a.dataset.idx = idx;
            a.onclick = (e) => {
                e.preventDefault();
                selecionarTopico(idx);
            };
            li.appendChild(a);
            // Snippet do conteúdo
            const snippet = gerarSnippet(CONTEUDO_TOPICOS[idx] || '', termo);
            if (snippet) {
                const divSnippet = document.createElement('div');
                divSnippet.className = 'snippet-ajuda';
                divSnippet.style.fontSize = '0.9em';
                divSnippet.style.color = '#666';
                divSnippet.innerHTML = snippet;
                li.appendChild(divSnippet);
            }
            lista.appendChild(li);
        });
        return;
    }
    // Busca normal (fallback)
    TOPICOS_AJUDA.forEach((topico, idx) => {
        const tituloNormalizado = removerAcentos(topico.title.toLowerCase());
        let contemNoTitulo = tituloNormalizado.includes(termoNormalizado);
        let contemNoConteudo = false;
        if (!contemNoTitulo && termoNormalizado && CONTEUDO_TOPICOS[idx]) {
            const conteudoNormalizado = removerAcentos(CONTEUDO_TOPICOS[idx].toLowerCase());
            contemNoConteudo = conteudoNormalizado.includes(termoNormalizado);
        }
        if (contemNoTitulo || contemNoConteudo) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            if (termo && contemNoTitulo) {
                let tituloOriginal = topico.title;
                let tituloDestacado = '';
                let i = 0;
                let j = 0;
                while (i < tituloOriginal.length) {
                    const charOriginal = tituloOriginal[i];
                    const charNormalizado = removerAcentos(charOriginal.toLowerCase());
                    if (termoNormalizado && tituloNormalizado.substr(j, termoNormalizado.length) === termoNormalizado) {
                        tituloDestacado += '<mark>' + tituloOriginal.substr(i, termoNormalizado.length) + '</mark>';
                        i += termoNormalizado.length;
                        j += termoNormalizado.length;
                    } else {
                        tituloDestacado += charOriginal;
                        i++;
                        j++;
                    }
                }
                a.innerHTML = tituloDestacado;
            } else {
                a.textContent = topico.title;
            }
            a.dataset.idx = idx;
            a.onclick = (e) => {
                e.preventDefault();
                selecionarTopico(idx);
            };
            li.appendChild(a);
            // Snippet do conteúdo
            const snippet = gerarSnippet(CONTEUDO_TOPICOS[idx] || '', termo);
            if (snippet) {
                const divSnippet = document.createElement('div');
                divSnippet.className = 'snippet-ajuda';
                divSnippet.style.fontSize = '0.9em';
                divSnippet.style.color = '#666';
                divSnippet.innerHTML = snippet;
                li.appendChild(divSnippet);
            }
            lista.appendChild(li);
        }
    });
}

// Carregar conteúdo dos tópicos em background para busca futura
async function carregarConteudosTopicos() {
    for (let i = 0; i < TOPICOS_AJUDA.length; i++) {
        const topico = TOPICOS_AJUDA[i];
        try {
            const res = await fetch(topico.file);
            if (res.ok) {
                CONTEUDO_TOPICOS[i] = await res.text();
            } else {
                CONTEUDO_TOPICOS[i] = '';
            }
        } catch {
            CONTEUDO_TOPICOS[i] = '';
        }
    }
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

document.addEventListener('DOMContentLoaded', () => {
    checkAdminRole().then(() => {
        carregarTopicos();
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('clear-search-btn');
        const fabContainer = document.getElementById('sidebar-fab-container');
        const fabBtn = document.getElementById('sidebar-fab-btn');
        const fabLabel = document.getElementById('sidebar-fab-label');
        let topicoSelecionado = null;
        // Debounce na busca
        const debouncedFiltrar = debounce(filtrarTopicos, 300);
        searchInput.addEventListener('input', debouncedFiltrar);
        // Mostrar/esconder botão X
        searchInput.addEventListener('input', () => {
            clearBtn.style.display = searchInput.value ? '' : 'none';
        });
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            filtrarTopicos({ target: searchInput });
            searchInput.focus();
        });
        filtrarTopicos({ target: searchInput }); // Mostra todos os tópicos ao abrir
        carregarConteudosTopicos(); // Carrega conteúdos em background

        // Sidebar colapsável e hamburger
        const sidebar = document.querySelector('.sidebar');
        const sidebarBtn = document.getElementById('sidebar-toggle-btn');
        // Cria overlay
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        function showFabLabel() {
            if (fabLabel && window.innerWidth <= 768 && !sidebar.classList.contains('open') && !topicoSelecionado) {
                fabLabel.classList.remove('hide');
                fabLabel.style.display = 'block';
            } else if (fabLabel) {
                fabLabel.classList.add('hide');
                setTimeout(() => { fabLabel.style.display = 'none'; }, 300);
            }
        }
        function openSidebar() {
            sidebar.classList.add('open');
            overlay.style.display = 'block';
            if (fabContainer) fabContainer.style.display = 'none';
            showFabLabel();
        }
        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.style.display = 'none';
            if (fabContainer && window.innerWidth <= 768) fabContainer.style.display = 'flex';
            showFabLabel();
        }
        sidebarBtn.addEventListener('click', openSidebar);
        overlay.addEventListener('click', closeSidebar);
        // Botão fixo abre sidebar
        if (fabBtn) fabBtn.addEventListener('click', openSidebar);
        // Fecha sidebar ao selecionar tópico (mobile)
        document.getElementById('topic-list').addEventListener('click', (e) => {
            if (window.innerWidth <= 768) closeSidebar();
            topicoSelecionado = true;
            showFabLabel();
        });
        // Gestos touch para abrir/fechar sidebar
        let touchStartX = null;
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
        });
        document.addEventListener('touchend', (e) => {
            if (touchStartX !== null && e.changedTouches.length === 1) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                if (dx > 80 && !sidebar.classList.contains('open')) {
                    openSidebar();
                } else if (dx < -80 && sidebar.classList.contains('open')) {
                    closeSidebar();
                }
            }
            touchStartX = null;
        });
        // Mostrar/esconder container conforme sidebar
        function updateFabBtn() {
            if (!fabContainer) return;
            if (window.innerWidth <= 768 && !sidebar.classList.contains('open')) {
                fabContainer.style.display = 'flex';
            } else {
                fabContainer.style.display = 'none';
            }
            showFabLabel();
        }
        updateFabBtn();
        window.addEventListener('resize', updateFabBtn);
    }).catch(() => {
        // Se a verificação falhar, o redirecionamento já foi feito
        // Mas pode adicionar uma mensagem de erro aqui se necessário
    });
}); 