// Variáveis globais
let paginaAtualClientes = 1; // Página atual da listagem de clientes
const limitePorPagina = 10; // Limite de clientes por página
let graficoChamados; // Para armazenar a instância do gráfico de chamados
let paginaAtualChamadosAbertos = 1; // Página atual da listagem de chamados abertos
let paginaAtualChamadosFinalizados = 1; // Página atual da listagem de chamados finalizados
const limiteChamados = 10; // Limite de chamados por página

// Variáveis globais para ordenação
let currentSortField = 'id'; // Campo de ordenação atual (padrão: id)
let currentSortOrder = 'asc'; // Ordem de ordenação atual (padrão: ascendente)

let selectedChamadoId = null; // ID do chamado selecionado

// Variáveis globais para ordenação de chamados
let currentChamadoSortField = ''; // Campo de ordenação atual dos chamados ("protocolo", "cliente", "data" ou "assunto")
let currentChamadoSortOrder = 'asc'; // Ordem de ordenação atual dos chamados (padrão: ascendente)

let totalPaginasClientes = 1; // Total de páginas de clientes

// Variáveis para o controle de sessão
let sessionCheckInterval;
let lastUserActivity = Date.now();
const SESSION_WARNING_TIME = 30;  // 30 minutos
const SESSION_TIMEOUT = 480;   // 8 horas (480 minutos)

// Monitora atividade do usuário
document.addEventListener('mousemove', updateUserActivity);
document.addEventListener('keypress', updateUserActivity);
document.addEventListener('click', updateUserActivity);

/**
 * Atualiza o timestamp da última atividade do usuário
 */
function updateUserActivity() {
    lastUserActivity = Date.now();
}

/**
 * Inicia o monitoramento de sessão do usuário
 */
function startSessionMonitor() {
    sessionCheckInterval = setInterval(checkSession, 60000); // Verifica a cada 1 minutos
}

/**
 * Verifica se a sessão está prestes a expirar
 */
function checkSession() {
    const timeSinceLastActivity = (Date.now() - lastUserActivity) / (60 * 1000); // Em minutos
    console.log(`Tempo desde última atividade: ${timeSinceLastActivity.toFixed(2)} minutos`);

    // Avisa quando faltar 30 segundos para expirar
    if (timeSinceLastActivity >= (SESSION_TIMEOUT - SESSION_WARNING_TIME)) {
        // Obtém o modal ou cria uma nova instância se não existir
        let sessionWarningModal = bootstrap.Modal.getInstance(document.getElementById('sessionWarningModal'));
        if (!sessionWarningModal) {
            sessionWarningModal = new bootstrap.Modal(document.getElementById('sessionWarningModal'));
        }

        // Atualiza o texto do tempo restante
        document.getElementById('timeLeft').textContent = SESSION_WARNING_TIME.toFixed(1);

        // Exibe o modal
        sessionWarningModal.show();
    }

    // Se passou do tempo limite, força logout
    if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        window.location.href = '/auth/logout';
    }
}

/**
 * Renova a sessão do usuário com o servidor
 */
async function renewSession() {
    try {
        const response = await fetch('/auth/renew-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        const data = await response.json();

        // Atualiza o timestamp da última atividade
        lastUserActivity = Date.now();

        // Fecha o modal usando a API do Bootstrap
        const sessionWarningModal = bootstrap.Modal.getInstance(document.getElementById('sessionWarningModal'));
        if (sessionWarningModal) {
            sessionWarningModal.hide();
        }

        // Limpa qualquer backdrop (fundo escuro) que possa ter permanecido
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        // Remove a classe modal-open do body para restaurar o scroll e comportamento normal
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        return data.success;
    } catch (error) {
        console.error("Erro ao renovar sessão:", error);

        // Mesmo em caso de erro, devemos fechar o modal e remover elementos residuais
        const sessionWarningModal = bootstrap.Modal.getInstance(document.getElementById('sessionWarningModal'));
        if (sessionWarningModal) {
            sessionWarningModal.hide();
        }

        // Limpa backdrop e restaura o body
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        return false;
    }
}

// Configura o botão de sair no modal de aviso de sessão
document.querySelector('#sessionWarningModal .btn-secondary').onclick = function () {
    window.location.href = '/auth/logout';
};

/**
 * Exibe uma mensagem temporária para feedback ao usuário
 * @param {string} mensagem - Texto da mensagem a ser exibida
 * @param {string} tipo - Tipo da mensagem: 'sucesso' ou 'erro'
 */
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const mensagemDiv = document.getElementById('mensagem'); // Obtém o elemento para exibir a mensagem
    mensagemDiv.textContent = mensagem; // Define o texto da mensagem
    mensagemDiv.className = `alert alert-${tipo === 'sucesso' ? 'success' : 'danger'}`; // Define as classes CSS para o tipo de mensagem
    mensagemDiv.style.display = 'block'; // Exibe a mensagem

    setTimeout(() => {
        mensagemDiv.style.display = 'none'; // Oculta a mensagem após 3 segundos
    }, 3000);
}

/**
 * Atualiza o menu ativo, destacando a página atual
 * @param {string} selected - Identificador do menu a ser ativado
 */
function updateActiveMenu(selected) {
    // Atualiza o controle da página atual para o sistema de atualizações
    paginaAtual = selected;

    const menus = ['menu-home', 'menu-clientes', 'menu-chamados', 'menu-usuarios', 'menu-agenda', 'menu-backups'];
    menus.forEach(function (id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('active');
        }
    });
    const selectedMenu = document.getElementById('menu-' + selected);
    if (selectedMenu) {
        selectedMenu.classList.add('active');
    }
}

/**
 * Carrega a página de listagem de clientes
 */
function carregarClientesPage() {
    updateActiveMenu('clientes'); // Atualiza o menu ativo

    // Obtém e clona o template
    const template = document.getElementById('clientes-page-template');
    const clone = template.content.cloneNode(true);

    // Atualiza o texto da paginação no clone
    const paginaAtualElement = clone.querySelector('#pagina-atual');
    if (paginaAtualElement) {
        paginaAtualElement.textContent = `Página ${paginaAtualClientes}/${totalPaginasClientes}`;
    }

    // Limpa e adiciona o novo conteúdo
    const conteudo = document.getElementById('conteudo');
    conteudo.innerHTML = '';
    conteudo.appendChild(clone);

    carregarClientes(); // Carrega a lista de clientes
    configurarPesquisaClientes(); // Configura a pesquisa de clientes
}

/**
 * Realiza a pesquisa de clientes com base no termo digitado
 */
async function pesquisarClientes() {
    const termo = document.getElementById('pesquisa-cliente').value; // Obtém o termo de pesquisa
    try {
        const resposta = await fetch(`/clientes/buscar?termo=${encodeURIComponent(termo)}`); // Envia a requisição para a API
        const clientes = await resposta.json(); // Converte a resposta para JSON

        const tbody = document.getElementById('clientes'); // Obtém o corpo da tabela
        tbody.innerHTML = clientes.map(cliente => `
            <tr data-id="${cliente[0]}" data-cliente='${JSON.stringify(cliente).replace(/"/g, '&quot;')}' style="cursor:pointer;">
                <td>#${cliente[0]} - ${cliente[1]}</td>
                <td>${cliente[2] || ''}</td>
                <td>${cliente[3] || ''}</td>
                <td>${cliente[4] || ''}</td>
            </tr>
        `).join(''); // Renderiza os clientes na tabela

        // Adiciona evento de clique para selecionar a linha
        document.querySelectorAll("#clientes tr").forEach(row => {
            row.addEventListener('click', function () {
                document.querySelectorAll("#clientes tr").forEach(r => r.classList.remove('table-warning')); // Remove a classe de seleção de todas as linhas
                this.classList.add('table-warning'); // Adiciona a classe de seleção à linha clicada
                document.getElementById('btn-editar-cliente').disabled = false; // Habilita o botão de editar
                document.getElementById('btn-excluir-cliente').disabled = false; // Habilita o botão de excluir
                selectedClienteId = this.getAttribute('data-id'); // Define o ID do cliente selecionado
                selectedCliente = JSON.parse(this.getAttribute('data-cliente')); // Define o objeto do cliente selecionado
            });
        });

        // Esconde os controles de paginação durante a pesquisa
        document.getElementById('btn-anterior').style.display = 'none';
        document.getElementById('btn-proximo').style.display = 'none';
        document.getElementById('pagina-atual').style.display = 'none';

    } catch (erro) {
        console.error('Erro na busca de clientes:', erro); // Exibe o erro no console
        exibirMensagem('Erro na busca de clientes', 'erro'); // Exibe a mensagem de erro
    }
}

/**
 * Configura o campo de pesquisa para pesquisar clientes em tempo real
 */
function configurarPesquisaClientes() {
    const input = document.getElementById('pesquisa-cliente'); // Obtém o campo de pesquisa
    if (input) {
        input.addEventListener('keyup', function (e) {
            if (this.value.length > 0) {
                pesquisarClientes(); // Realiza a pesquisa
            } else {
                carregarClientes(); // Restaura a lista completa quando o campo está vazio
                // Restaura os controles de paginação
                document.getElementById('btn-anterior').style.display = 'block';
                document.getElementById('btn-proximo').style.display = 'block';
                document.getElementById('pagina-atual').style.display = 'block';
            }
        });
    }
}

/**
 * Busca clientes na API com base no termo informado
 * @param {string} termo - Termo para busca de clientes
 */
async function buscarClientes(termo) {
    try {
        const resposta = await fetch(`/clientes/buscar?termo=${encodeURIComponent(termo)}`); // Envia a requisição para a API
        const clientes = await resposta.json(); // Converte a resposta para JSON

        const resultadoHTML = clientes.map(cliente => `
            <tr data-id="${cliente[0]}" data-telefone="${cliente[4] || ''}" data-cliente='${JSON.stringify(cliente).replace(/"/g, '&quot;')}' style="cursor:pointer;">
                <td>${cliente[1]}</td>
                <td>${cliente[2] || ''}</td>
                <td>${cliente[3] || ''}</td>
                <td>${cliente[4] || ''}</td>
            </tr>
        `).join(''); // Renderiza os clientes na tabela

        document.getElementById('clientes').innerHTML = resultadoHTML; // Define o HTML da tabela

        // Adiciona evento de clique para selecionar a linha
        document.querySelectorAll("#clientes tr").forEach(row => {
            row.addEventListener('click', function () {
                // Remove a classe de seleção de todas as linhas
                document.querySelectorAll("#clientes tr").forEach(r => r.classList.remove('table-warning'));
                // Adiciona a classe de seleção à linha clicada
                this.classList.add('table-warning');
                // Habilita os botões de editar e excluir
                document.getElementById('btn-editar-cliente').disabled = false;
                document.getElementById('btn-excluir-cliente').disabled = false;
                // Define o ID do cliente selecionado
                selectedClienteId = this.getAttribute('data-id');
                selectedCliente = JSON.parse(this.getAttribute('data-cliente'));
            });
        });
    } catch (erro) {
        console.error('Erro na busca de clientes:', erro); // Exibe o erro no console
        exibirMensagem('Erro na busca de clientes', 'erro'); // Exibe a mensagem de erro
    }
}

/**
 * Carrega a página de chamados com as abas disponíveis
 */
async function carregarChamadosPage() {
    try {
        updateActiveMenu('chamados');

        // Limpa o conteúdo anterior
        const conteudo = document.getElementById('conteudo');
        conteudo.innerHTML = '';

        // Obtém e clona o template
        const template = document.getElementById('chamados-page-template');
        const clone = template.content.cloneNode(true);

        // Adiciona o novo conteúdo
        conteudo.appendChild(clone);

        selecionarAbaChamados('abrir');
        await carregarAbrirChamado();
    } catch (erro) {
        console.error('Erro ao carregar página de chamados:', erro);
        exibirMensagem('Erro ao carregar página de chamados', 'erro');
    }
}

/**
 * Seleciona a aba ativa na página de chamados
 * @param {string} aba - Identificador da aba a ser ativada
 */
function selecionarAbaChamados(aba) {
    const tabs = ['tab-abrir', 'tab-abertos', 'tab-finalizados']; // Lista de IDs das abas
    tabs.forEach(function (id) {
        document.getElementById(id).classList.remove('active'); // Remove a classe 'active' de todas as abas
    });
    document.getElementById('tab-' + aba).classList.add('active'); // Adiciona a classe 'active' à aba selecionada
}

/**
 * Carrega a subpágina para abrir um novo chamado
 * @returns {Promise<void>}
 */
function carregarAbrirChamado() {
    return new Promise((resolve) => {
        // Limpa o conteúdo anterior
        const chamadosContent = document.getElementById('chamados-content');
        chamadosContent.innerHTML = '';

        // Obtém e clona o template
        const template = document.getElementById('abrir-chamado-template');
        const clone = template.content.cloneNode(true);

        // Adiciona o novo conteúdo
        chamadosContent.appendChild(clone);

        // Aguarda o próximo ciclo de eventos para garantir que o DOM seja atualizado
        setTimeout(async () => {
            try {
                await configurarFormularioChamado(); // Configura o formulário de chamado
                configurarBuscaClienteChamado(); // Configura a busca de cliente no formulário de chamado
                resolve(); // Resolve a Promise
            } catch (erro) {
                console.error('Erro ao carregar formulário de chamado:', erro);
                exibirMensagem('Erro ao carregar formulário', 'erro');
            }
        }, 0);
    });
}

/**
 * Configura o campo de busca de clientes no formulário de chamado
 */
function configurarBuscaClienteChamado() {
    const clienteBusca = document.getElementById('cliente_busca'); // Obtém o campo de busca de cliente
    const resultadosDiv = document.getElementById('resultados_cliente'); // Obtém a div para exibir os resultados

    let timeoutId; // Variável para controlar o timeout da busca

    clienteBusca.addEventListener('input', function () {
        clearTimeout(timeoutId); // Limpa o timeout anterior
        timeoutId = setTimeout(async () => {
            const termo = this.value.trim(); // Obtém o termo de pesquisa
            if (termo.length < 1) {
                resultadosDiv.innerHTML = ''; // Limpa os resultados se o termo for vazio
                return;
            }

            try {
                const resposta = await fetch(`/clientes/buscar?termo=${encodeURIComponent(termo)}`); // Envia a requisição para a API
                const clientes = await resposta.json(); // Converte a resposta para JSON

                resultadosDiv.innerHTML = clientes.map(cliente => `
                    <a href="#" class="list-group-item list-group-item-action" 
                    data-id="${cliente[0]}"
                    data-telefone="${cliente[4] || ''}"
                    onclick="selecionarClienteChamado(event, this)">
                        #${cliente[0]} - ${cliente[1]} ${cliente[2] ? `(${cliente[2]})` : ''}
                    </a>
                `).join(''); // Renderiza os resultados na div
            } catch (erro) {
                console.error('Erro na busca de clientes:', erro); // Exibe o erro no console
            }
        }, 300); // Define um delay de 300ms para a busca
    });
}

/**
 * Seleciona um cliente no formulário de chamado
 * @param {Event} event - Evento de clique
 * @param {HTMLElement} element - Elemento clicado
 */
function selecionarClienteChamado(event, element) {
    event.preventDefault(); // Previne o comportamento padrão do link

    const clienteId = element.dataset.id; // Obtém o ID do cliente
    const clienteNome = element.textContent.trim(); // Obtém o nome do cliente
    const telefone = element.dataset.telefone; // Obtém o telefone do cliente

    // Atualiza os campos hidden e de busca
    document.getElementById('cliente_id').value = clienteId;
    document.getElementById('cliente_busca').value = clienteNome;

    // Atualiza os campos de telefone
    document.getElementById('telefone_chamado').value = telefone;

    // Limpa os resultados
    document.getElementById('resultados_cliente').innerHTML = '';
}

/**
 * Configura o formulário de chamado para enviar dados para a API
 */
function configurarFormularioChamado() {
    document.getElementById('chamado-form').onsubmit = async (event) => {
        event.preventDefault(); // Previne o comportamento padrão do formulário
        const assunto = document.getElementById('assunto').value; // Obtém o assunto
        const cliente_id = document.getElementById('cliente_id').value; // Obtém o ID do cliente
        const telefone = document.getElementById('telefone_chamado').value; // Obtém o telefone
        const descricao = document.getElementById('descricao').value; // Obtém a descrição
        const solicitante = document.getElementById('solicitante').value;

        if (!cliente_id) {
            exibirMensagem('Selecione um cliente', 'erro'); // Exibe a mensagem de erro
            return;
        }

        // Monta os dados para o chamado
        const dadosChamado = {
            assunto,
            cliente_id: parseInt(cliente_id),
            telefone,
            descricao,
            solicitante
        };

        try {
            const resposta = await fetch('/chamados', { // Envia a requisição para a API
                method: 'POST', // Define o método como POST
                headers: { 'Content-Type': 'application/json' }, // Define o cabeçalho como JSON
                body: JSON.stringify(dadosChamado) // Converte os dados para JSON
            });
            if (resposta.ok) {
                const data = await resposta.json(); // Converte a resposta para JSON
                exibirMensagem(`Chamado aberto com sucesso! Protocolo: ${data.protocolo}`); // Exibe a mensagem de sucesso
                document.getElementById('chamado-form').reset(); // Limpa o formulário
                // Garante que carregarChamados seja chamado após a mensagem e o reset
                carregarChamados();
            } else {
                const erro = await resposta.json(); // Converte a resposta para JSON
                exibirMensagem(`Erro: ${erro.erro}`, 'erro'); // Exibe a mensagem de erro
            }
        } catch (erro) {
            console.error('Erro ao abrir chamado:', erro); // Exibe o erro no console
            exibirMensagem('Erro ao abrir chamado', 'erro'); // Exibe a mensagem de erro
        }
    };
}

/**
 * Carrega a lista de chamados abertos
 */
/**
 * Carrega a lista de chamados abertos
 */
function carregarChamadosAbertos() {
    // Limpa o conteúdo anterior
    const chamadosContent = document.getElementById('chamados-content');
    chamadosContent.innerHTML = ''; // Limpa o conteúdo existente

    // Obtém e clona o template
    const template = document.getElementById('chamados-abertos-template');
    const clone = template.content.cloneNode(true);

    // Adiciona o novo conteúdo
    chamadosContent.appendChild(clone);

    // Atualiza o número da página atual
    const paginaAtualElement = document.getElementById('pagina-atual-chamados-aberto');
    if (paginaAtualElement) {
        paginaAtualElement.textContent = `Página ${paginaAtualClientes}`;
    }

    carregarChamados('Aberto');
    configurarPesquisaChamados('aberto');
}

/**
 * Carrega a lista de chamados finalizados
 */
function carregarChamadosFinalizados() {
    // Limpa o conteúdo anterior
    const chamadosContent = document.getElementById('chamados-content');
    chamadosContent.innerHTML = '';

    // Obtém e clona o template
    const template = document.getElementById('chamados-finalizados-template');
    const clone = template.content.cloneNode(true);

    // Adiciona o novo conteúdo
    chamadosContent.appendChild(clone);

    // Atualiza o número da página atual
    const paginaAtualElement = document.getElementById('pagina-atual-chamados-finalizado');
    if (paginaAtualElement) {
        paginaAtualElement.textContent = `Página ${paginaAtualChamadosFinalizados}`;
    }

    carregarChamados('Finalizado');
    configurarPesquisaChamados('finalizado');
}

/**
 * Avança para a próxima página de clientes
 */
function proximaPaginaClientes() {
    paginaAtualClientes++; // Incrementa o número da página atual
    carregarClientes(); // Carrega os clientes da nova página
}

/**
 * Retorna para a página anterior de clientes
 */
function paginaAnteriorClientes() {
    if (paginaAtualClientes > 1) { // Verifica se não está na primeira página
        paginaAtualClientes--; // Decrementa o número da página atual
        carregarClientes(); // Carrega os clientes da nova página
    }
}

/**
 * Carrega a lista de clientes
 */
async function carregarClientes() {
    try {
        const url = `/clientes?pagina=${paginaAtualClientes}&limite=${limitePorPagina}&order_field=${currentSortField}&order_order=${currentSortOrder}`;
        const data = await fetchWithLoading(url); // Envia a requisição para a API com tela de carregamento

        const tbody = document.getElementById('clientes'); // Obtém o corpo da tabela
        tbody.innerHTML = data.clientes.map(cliente => `
            <tr data-id="${cliente[0]}" data-cliente='${JSON.stringify(cliente).replace(/"/g, '&quot;')}' style="cursor:pointer;">
                <td>#${cliente[0]} - ${cliente[1]}</td>
                <td>${cliente[2] || ''}</td>
                <td>${cliente[3] || ''}</td>
                <td>${cliente[4] || ''}</td>
            </tr>
        `).join(''); // Renderiza os clientes na tabela

        // Adiciona evento de clique para selecionar a linha
        document.querySelectorAll("#clientes tr").forEach(row => {
            row.addEventListener('click', function () {
                // Remove a classe de seleção de todas as linhas
                document.querySelectorAll("#clientes tr").forEach(r => r.classList.remove('table-warning'));
                // Adiciona a classe de seleção à linha clicada
                this.classList.add('table-warning');
                // Habilita os botões de editar e excluir
                document.getElementById('btn-editar-cliente').disabled = false;
                document.getElementById('btn-excluir-cliente').disabled = false;
                // Define o ID do cliente selecionado
                selectedClienteId = this.getAttribute('data-id');
                selectedCliente = JSON.parse(this.getAttribute('data-cliente'));
            });
        });

        // Atualiza controles de paginação
        document.getElementById('btn-anterior').disabled = paginaAtualClientes === 1; // Desabilita o botão "Anterior" se estiver na primeira página
        document.getElementById('btn-proximo').disabled = paginaAtualClientes >= data.total_paginas; // Desabilita o botão "Próximo" se estiver na última página

        totalPaginasClientes = data.totalPages || 1;
        document.getElementById('pagina-atual').textContent =
            `Página ${paginaAtualClientes}/${totalPaginasClientes}`;
    } catch (erro) {
        console.error('Erro ao carregar clientes:', erro); // Exibe o erro no console
    }
}

/**
 * Define o critério de ordenação para a lista de clientes
 * @param {string} field - Campo pelo qual ordenar
 */
function ordenarClientes(field) {
    if (currentSortField === field) {
        // Toggle order
        currentSortOrder = (currentSortOrder === 'asc') ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortOrder = 'asc';
    }
    carregarClientes(); // Re-renderiza a tabela ordenada
}

/**
 * Carrega os chamados com base no status
 * @param {string} status - Status dos chamados a serem carregados
 */
function carregarChamados(status = 'Aberto') {
    try {
        const paginaAtual = status === 'Aberto' ? paginaAtualChamadosAbertos : paginaAtualChamadosFinalizados;
        const url = `/chamados?pagina=${paginaAtual}&limite=${limiteChamados}&status=${status}`; // Define a URL da API
        console.log('Carregando chamados da URL:', url); // log
        fetchWithLoading(url) // Envia a requisição para a API com tela de carregamento
            .then(data => {
                console.log('Resposta da API:', data); // log
                // Verifica explicitamente undefined
                if (data.chamados === undefined) {
                    throw new Error('Formato de resposta inválido'); // Lança um erro se o formato da resposta for inválido
                }
                let chamadosArray = data.chamados.slice(); // Clona o array de chamados

                // Ordenação client-side se aplicável:
                if (currentChamadoSortField) {
                    chamadosArray.sort((a, b) => { // Ordena os chamados
                        // Considerando que:
                        // a[6] = protocolo, a[1] = cliente (id, idealmente nome), a[4] = data, a[7] = assunto
                        let fieldIndex; // Define o índice do campo para ordenação
                        if (currentChamadoSortField === 'protocolo') fieldIndex = 6; // Define o índice do protocolo
                        else if (currentChamadoSortField === 'cliente') fieldIndex = 1; // Define o índice do cliente
                        else if (currentChamadoSortField === 'data') fieldIndex = 4; // Define o índice da data
                        else if (currentChamadoSortField === 'assunto') fieldIndex = 7; // Define o índice do assunto
                        let A = a[fieldIndex] ? a[fieldIndex].toString().toUpperCase() : ''; // Obtém o valor para ordenação
                        let B = b[fieldIndex] ? b[fieldIndex].toString().toUpperCase() : ''; // Obtém o valor para ordenação
                        if (currentChamadoSortField === 'data') {
                            // Tente converter para data
                            A = new Date(a[fieldIndex]); // Converte para data
                            B = new Date(b[fieldIndex]); // Converte para data
                        }
                        if (A < B) return currentChamadoSortOrder === 'asc' ? -1 : 1; // Compara os valores
                        if (A > B) return currentChamadoSortOrder === 'asc' ? 1 : -1; // Compara os valores
                        return 0; // Retorna 0 se forem iguais
                    });
                }

                if (status === 'Aberto') {
                    const container = document.getElementById('chamados-list'); // Obtém o elemento para exibir a lista de chamados
                    // Adicionado verificação para garantir que o elemento exista
                    if (container) {
                        container.innerHTML = chamadosArray.map(chamado => { // Renderiza os chamados na tabela
                            const protocolo = chamado[6] ? chamado[6].replace(/\D/g, '') : 'N/A'; // Obtém o protocolo
                            const clienteId = chamado[1] || 'N/A'; // Obtém o ID do cliente
                            const clienteNome = chamado[10] || 'Cliente removido'; // Obtém o nome do cliente (vindo do JOIN)
                            const dataAbertura = chamado[4]; // Obtém a data de abertura
                            const assunto = chamado[7] || ''; // Obtém o assunto
                            return `<tr data-id="${chamado[0]}" style="cursor:pointer;">
                                        <td>${protocolo}</td>
                                        <td>#${clienteId}</td>
                                        <td>${clienteNome}</td>
                                        <td>${dataAbertura}</td>
                                        <td>${assunto}</td>
                                        <td>
                                            <span class="status-badge status-${chamado[3].toLowerCase()}">
                                                ${chamado[3]}
                                            </span>
                                        </td>
                                    </tr>`;
                        }).join('');

                        // Vincula eventos para seleção das linhas
                        document.querySelectorAll("#chamados-list tr").forEach(row => {
                            row.addEventListener('click', function () {
                                document.querySelectorAll("#chamados-list tr").forEach(r => r.classList.remove('table-warning')); // Remove a classe de seleção de todas as linhas
                                this.classList.add('table-warning'); // Adiciona a classe de seleção à linha clicada
                                selectedChamadoId = this.getAttribute('data-id'); // Define o ID do chamado selecionado

                                // Habilita os botões quando um chamado é selecionado
                                document.getElementById('btn-abrir').disabled = false;
                                document.getElementById('btn-finalizar').disabled = false;
                                document.getElementById('btn-excluir').disabled = false;
                            });
                        });
                    } else {
                        console.error('Elemento #chamados-list não encontrado!');
                    }
                } else {
                    const container = document.getElementById('chamados-finalizados'); // Obtém o elemento para exibir a lista de chamados finalizados
                    // Adicionado verificação para garantir que o elemento exista
                    if (container) {
                        container.innerHTML = chamadosArray.map(chamado => { // Renderiza os chamados na tabela
                            const protocolo = chamado[6] ? chamado[6].replace(/\D/g, '') : 'N/A'; // Obtém o protocolo
                            const clienteNome = chamado[10] || 'Cliente removido'; // Obtém o nome do cliente (vindo do JOIN)
                            const dataAbertura = chamado[4]; // Obtém a data de abertura
                            const dataFechamento = chamado[5] || ''; // Obtém a data de fechamento
                            const assunto = chamado[7] || ''; // Obtém o assunto
                            return `<tr data-id="${chamado[0]}" style="cursor:pointer;">
                                        <td>${protocolo}</td>
                                        <td>${clienteNome}</td>
                                        <td>${dataAbertura}</td>
                                        <td>${assunto}</td>
                                        <td>${dataFechamento}</td>
                                        <td>
                                            <span class="status-badge status-${chamado[3].toLowerCase()}">
                                                ${chamado[3]}
                                            </span>
                                        </td>
                                    </tr>`;
                        }).join('');

                        // Vincula eventos para seleção das linhas
                        document.querySelectorAll("#chamados-finalizados tr").forEach(row => {
                            row.addEventListener('click', function () {
                                document.querySelectorAll("#chamados-finalizados tr").forEach(r => r.classList.remove('table-warning')); // Remove a classe de seleção de todas as linhas
                                this.classList.add('table-warning'); // Adiciona a classe de seleção à linha clicada
                                selectedChamadoId = this.getAttribute('data-id'); // Define o ID do chamado selecionado

                                // Habilita os botões quando um chamado é selecionado
                                document.getElementById('btn-abrir').disabled = false;
                                document.getElementById('btn-reabrir').disabled = false;
                                document.getElementById('btn-excluir').disabled = false;
                            });
                        });
                    } else {
                        console.error('Elemento #chamados-finalizados não encontrado!');
                    }
                }

                // Atualiza controles de paginação para ambos os status
                const btnAnterior = document.getElementById(status === 'Aberto' ? 'btn-anterior-chamados-aberto' : 'btn-anterior-chamados-finalizado');
                const btnProximo = document.getElementById(status === 'Aberto' ? 'btn-proximo-chamados-aberto' : 'btn-proximo-chamados-finalizado');
                const paginaAtualElement = document.getElementById(status === 'Aberto' ? 'pagina-atual-chamados-aberto' : 'pagina-atual-chamados-finalizado');

                if (btnAnterior && btnProximo && paginaAtualElement) {
                    btnAnterior.disabled = paginaAtual === 1;
                    btnProximo.disabled = paginaAtual >= data.total_paginas;
                    paginaAtualElement.textContent = `Página ${paginaAtual}`;
                }
            })
            .catch(erro => {
                console.error('Erro ao carregar chamados:', erro);
                exibirMensagem('Erro ao carregar chamados', 'erro');
            });
    } catch (e) {
        console.error('Erro ao chamar carregarChamados:', e);
        exibirMensagem('Erro ao carregar chamados', 'erro');
    }
}

/**
 * Configura o formulário de cliente para enviar dados para a API
 */
function configurarFormularioCliente() {
    document.getElementById('cliente-form').onsubmit = async (event) => {
        event.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;

        try {
            const resposta = await fetch('/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, email, telefone, endereco }),
            });

            if (resposta.ok) {
                exibirMensagem('Cliente cadastrado com sucesso!');
                carregarClientes();
                document.getElementById('cliente-form').reset();
            } else {
                const erro = await resposta.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao cadastrar cliente:', erro);
            exibirMensagem('Erro ao cadastrar cliente', 'erro');
        }
    };
}

/**
 * Carrega a página de edição de cliente
 * @param {Array} cliente - Dados do cliente a ser editado
 */
function carregarEditarClientePage(cliente) {

    // Solução temporária: Buscar o cliente completo novamente
    if (Array.isArray(cliente) && cliente.length < 25) {
        // Se o cliente não tem todos os campos esperados, busca novamente do servidor
        fetch(`/clientes/${cliente[0]}`)
            .then(response => response.json())
            .then(clienteCompleto => {
                // Se o backend retorna um objeto com propriedades nomeadas em vez de um array
                if (!Array.isArray(clienteCompleto)) {
                    // Adiciona todos os dados de endereço para o modal
                    document.getElementById('endereco-cep').textContent = clienteCompleto.cep || 'N/A';
                    document.getElementById('endereco-rua').textContent = clienteCompleto.rua || 'N/A';
                    document.getElementById('endereco-numero').textContent = clienteCompleto.numero || 'N/A';
                    document.getElementById('endereco-complemento').textContent = clienteCompleto.complemento || 'N/A';
                    document.getElementById('endereco-bairro').textContent = clienteCompleto.bairro || 'N/A';
                    document.getElementById('endereco-cidade').textContent = clienteCompleto.cidade || 'N/A';
                    document.getElementById('endereco-estado').textContent = clienteCompleto.estado || 'N/A';
                    document.getElementById('endereco-pais').textContent = clienteCompleto.pais || 'N/A';

                    // Preencher os campos do formulário de endereço
                    document.getElementById('cep').value = clienteCompleto.cep || '';
                    document.getElementById('rua').value = clienteCompleto.rua || '';
                    document.getElementById('numero').value = clienteCompleto.numero || '';
                    document.getElementById('complemento').value = clienteCompleto.complemento || '';
                    document.getElementById('bairro').value = clienteCompleto.bairro || '';
                    document.getElementById('cidade').value = clienteCompleto.cidade || '';
                    document.getElementById('estado').value = clienteCompleto.estado || '';
                    document.getElementById('pais').value = clienteCompleto.pais || '';
                }
            })
            .catch(error => {
                console.error("Erro ao recarregar cliente:", error);
            });
    }

    document.getElementById('conteudo').innerHTML = `
        <div id="cliente-form-container" class="cliente-form-container">
        <div class="row">
            <div class="col-md-10 offset-md-1">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h2 class="m-0">Editar Cliente</h2>
                        <span class="client-id">#${cliente[0]}</span>
                    </div>
                    <div class="card-body">
                        <ul class="nav nav-tabs" id="clienteTabs">
                            <li class="nav-item">
                                <a class="nav-link active" id="dados-tab" data-bs-toggle="tab" href="#dados" role="tab">
                                    <i class="bi bi-person"></i> Dados do Cliente
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="endereco-tab" data-bs-toggle="tab" href="#endereco" role="tab">
                                    <i class="bi bi-geo-alt"></i> Endereço
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="chamados-tab" data-bs-toggle="tab" href="#chamados-cliente" role="tab">
                                    <i class="bi bi-ticket"></i> Chamados
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="notas-tab" data-bs-toggle="tab" href="#notas" role="tab">
                                    <i class="bi bi-journal-text"></i> Informações Adicionais
                                </a>
                            </li>
                        </ul>
                        <div class="tab-content pt-4" id="clienteTabsContent">
                            <div class="tab-pane fade show active" id="dados" role="tabpanel">
                                <form id="editar-cliente-form">
                                    <!-- Informações principais -->
                                    <h5 class="mb-3">Informações Principais</h5>
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="nome" class="form-label">Razão Social/Nome:</label>
                                                <input type="text" id="nome" class="form-control" value="${cliente[1] || ''}" required>
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="nome_fantasia" class="form-label">Nome Fantasia:</label>
                                                <input type="text" id="nome_fantasia" class="form-control" value="${cliente[2] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="email" class="form-label">E-mail:</label>
                                                <input type="text" id="email" class="form-control" value="${cliente[3] || ''}" 
                                                    placeholder="email@exemplo.com, outro@exemplo.com">
                                                <div class="form-text">Múltiplos e-mails separados por vírgula ou "/".</div>
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="telefone" class="form-label">Telefone:</label>
                                                <input type="text" id="telefone" class="form-control" value="${cliente[4] || ''}">
                                                <div class="form-text">Múltiplos telefones separados por vírgula ou "/".</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="ativo" class="form-label">Ativo:</label>
                                                <select id="ativo" class="form-select">
                                                    <option value="Sim" ${cliente[5] === 'Sim' ? 'selected' : ''}>Sim</option>
                                                    <option value="Não" ${cliente[5] === 'Não' ? 'selected' : ''}>Não</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="tipo_cliente" class="form-label">Tipo Cliente:</label>
                                                <select id="tipo_cliente" class="form-select">
                                                    <option value="Comercial" ${cliente[6] === 'Comercial' ? 'selected' : ''}>Comercial</option>
                                                    <option value="Pessoa Física" ${cliente[6] === 'Pessoa Física' ? 'selected' : ''}>Pessoa Física</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Documentação -->
                                    <h5 class="mb-3 mt-4">Documentação</h5>
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="cnpj_cpf" class="form-label">CNPJ/CPF:</label>
                                                <input type="text" id="cnpj_cpf" class="form-control" value="${cliente[7] || ''}">
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="ie_rg" class="form-label">IE/RG:</label>
                                                <input type="text" id="ie_rg" class="form-control" value="${cliente[8] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="contribuinte_icms" class="form-label">Contribuinte ICMS:</label>
                                                <select id="contribuinte_icms" class="form-select">
                                                    <option value="Sim" ${cliente[9] === 'Sim' ? 'selected' : ''}>Sim</option>
                                                    <option value="Não" ${cliente[9] === 'Não' ? 'selected' : ''}>Não</option>
                                                    <option value="Isento" ${cliente[9] === 'Isento' ? 'selected' : ''}>Isento</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="rg_orgao_emissor" class="form-label">RG Órgão Emissor:</label>
                                                <input type="text" id="rg_orgao_emissor" class="form-control" value="${cliente[10] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="inscricao_municipal" class="form-label">Inscrição Municipal:</label>
                                                <input type="text" id="inscricao_municipal" class="form-control" value="${cliente[18] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Dados Pessoais (Mostrar apenas se for Pessoa Física) -->
                                    <div id="dados-pessoais-section">
                                        <h5 class="mb-3 mt-4">Dados Pessoais</h5>
                                        <div class="form-row">
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="nacionalidade" class="form-label">Nacionalidade:</label>
                                                    <input type="text" id="nacionalidade" class="form-control" value="${cliente[11] || ''}">
                                                </div>
                                            </div>
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="naturalidade" class="form-label">Naturalidade:</label>
                                                    <input type="text" id="naturalidade" class="form-control" value="${cliente[12] || ''}">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="estado_nascimento" class="form-label">Estado de Nascimento:</label>
                                                    <input type="text" id="estado_nascimento" class="form-control" value="${cliente[13] || ''}">
                                                </div>
                                            </div>
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="data_nascimento" class="form-label">Data de Nascimento:</label>
                                                    <input type="date" id="data_nascimento" class="form-control" value="${cliente[14] || ''}">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="sexo" class="form-label">Sexo:</label>
                                                    <select id="sexo" class="form-select">
                                                        <option value="Feminino" ${cliente[15] === 'Feminino' ? 'selected' : ''}>Feminino</option>
                                                        <option value="Masculino" ${cliente[15] === 'Masculino' ? 'selected' : ''}>Masculino</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="profissao" class="form-label">Profissão:</label>
                                                    <input type="text" id="profissao" class="form-control" value="${cliente[16] || ''}">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="form-col">
                                                <div class="mb-3">
                                                    <label for="estado_civil" class="form-label">Estado Civil:</label>
                                                    <input type="text" id="estado_civil" class="form-control" value="${cliente[17] || ''}">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="d-flex justify-content-end mt-4">
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-save"></i> Atualizar Cliente
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="tab-pane fade" id="endereco" role="tabpanel">
                                <form id="editar-endereco-form">
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="cep" class="form-label">CEP:</label>
                                                <input type="text" id="cep" class="form-control" value="${cliente[19] || ''}" placeholder="Digite o CEP">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="rua" class="form-label">Rua:</label>
                                                <input type="text" id="rua" class="form-control" value="${cliente[20] || ''}">
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="numero" class="form-label">Número:</label>
                                                <input type="text" id="numero" class="form-control" value="${cliente[21] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="complemento" class="form-label">Complemento:</label>
                                                <input type="text" id="complemento" class="form-control" value="${cliente[22] || ''}">
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="bairro" class="form-label">Bairro:</label>
                                                <input type="text" id="bairro" class="form-control" value="${cliente[23] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="cidade" class="form-label">Cidade:</label>
                                                <input type="text" id="cidade" class="form-control" value="${cliente[24] || ''}">
                                            </div>
                                        </div>
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="estado" class="form-label">Estado:</label>
                                                <input type="text" id="estado" class="form-control" value="${cliente[25] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-col">
                                            <div class="mb-3">
                                                <label for="pais" class="form-label">País:</label>
                                                <input type="text" id="pais" class="form-control" value="${cliente[26] || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="d-flex justify-content-between mt-4">
                                        <button type="button" class="btn btn-maps" onclick="abrirRotaGoogleMaps()">
                                            <i class="bi bi-map"></i> Ver Rota no Google Maps
                                        </button>
                                        
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-save"></i> Atualizar Endereço
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="tab-pane fade" id="chamados-cliente" role="tabpanel">
                                <div class="chamados-cliente-container">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="m-0">Chamados do Cliente</h5>
                                        <button type="button" class="btn btn-new-ticket" onclick="novoChamadoCliente(${cliente[0]})">
                                            <i class="bi bi-plus-circle"></i> Novo Chamado
                                        </button>
                                    </div>
                                    <div id="chamados-cliente-lista" class="card">
                                        <div class="card-body text-center p-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Carregando...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-pane fade" id="notas" role="tabpanel">
                                <div class="notes-container">
                                    <h5 class="mb-3">Informações Adicionais</h5>
                                    <textarea id="cliente-notas" class="form-control" placeholder="Adicione informações importantes sobre este cliente..."></textarea>
                                    <div class="notes-actions mt-3">
                                        <button type="button" class="btn btn-primary" onclick="saveClientNotes(${cliente[0]})">
                                            <i class="bi bi-save"></i> Salvar Notas
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Lógica para mostrar/ocultar campos de pessoa física
    const toggleDadosPessoais = () => {
        const tipoCliente = document.getElementById('tipo_cliente').value;
        const dadosPessoaisSection = document.getElementById('dados-pessoais-section');

        if (tipoCliente === 'Pessoa Física') {
            dadosPessoaisSection.style.display = 'block';
        } else {
            dadosPessoaisSection.style.display = 'none';
        }
    };

    // Configurar o evento após o DOM estar pronto
    setTimeout(() => {
        const tipoClienteSelect = document.getElementById('tipo_cliente');
        if (tipoClienteSelect) {
            tipoClienteSelect.addEventListener('change', toggleDadosPessoais);
            // Executar uma vez na inicialização
            toggleDadosPessoais();
        }
    }, 100);

    // Mantém a lógica original dos formulários
    document.getElementById('editar-cliente-form').onsubmit = async (e) => {
        e.preventDefault();
        const clienteAtualizado = {
            nome: document.getElementById('nome').value,
            nome_fantasia: document.getElementById('nome_fantasia').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            ativo: document.getElementById('ativo').value,
            tipo_cliente: document.getElementById('tipo_cliente').value,
            cnpj_cpf: document.getElementById('cnpj_cpf').value,
            ie_rg: document.getElementById('ie_rg').value,
            contribuinte_icms: document.getElementById('contribuinte_icms').value,
            rg_orgao_emissor: document.getElementById('rg_orgao_emissor').value,
            nacionalidade: document.getElementById('nacionalidade').value,
            naturalidade: document.getElementById('naturalidade').value,
            estado_nascimento: document.getElementById('estado_nascimento').value,
            data_nascimento: document.getElementById('data_nascimento').value,
            sexo: document.getElementById('sexo').value,
            profissao: document.getElementById('profissao').value,
            estado_civil: document.getElementById('estado_civil').value,
            inscricao_municipal: document.getElementById('inscricao_municipal').value
        };
        try {
            const resposta = await fetch(`/clientes/${cliente[0]}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clienteAtualizado)
            });
            if (resposta.ok) {
                exibirMensagem('Cliente atualizado com sucesso!');
                carregarClientesPage();
            } else {
                const erro = await resposta.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao atualizar cliente:', erro);
            exibirMensagem('Erro ao atualizar cliente', 'erro');
        }
    };

    document.getElementById('editar-endereco-form').onsubmit = async (e) => {
        e.preventDefault();
        const enderecoAtualizado = {
            cep: document.getElementById('cep').value,
            rua: document.getElementById('rua').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complemento').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value,
            pais: document.getElementById('pais').value
        };
        try {
            const resposta = await fetch(`/clientes/${cliente[0]}/endereco`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(enderecoAtualizado)
            });
            if (resposta.ok) {
                exibirMensagem('Endereço atualizado com sucesso!');
                carregarClientesPage();
            } else {
                const erro = await resposta.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao atualizar endereço:', erro);
            exibirMensagem('Erro ao atualizar endereço', 'erro');
        }
    };

    document.getElementById('cep').addEventListener('blur', async () => {
        const cep = document.getElementById('cep').value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const dados = await resposta.json();
                if (!dados.erro) {
                    document.getElementById('rua').value = dados.logradouro || '';
                    document.getElementById('bairro').value = dados.bairro || '';
                    document.getElementById('cidade').value = dados.localidade || '';
                    document.getElementById('estado').value = dados.uf || '';
                    document.getElementById('pais').value = 'Brasil';
                } else {
                    exibirMensagem('CEP não encontrado', 'erro');
                }
            } catch (erro) {
                console.error('Erro ao buscar CEP:', erro);
                exibirMensagem('Erro ao buscar CEP', 'erro');
            }
        }
    });

    // Adicionar evento para carregar chamados quando a aba for selecionada
    document.getElementById('chamados-tab').addEventListener('shown.bs.tab', function (e) {
        carregarChamadosCliente(cliente[0]);
    });
}

/**
 * Carrega os chamados de um cliente específico
 * @param {number} clienteId - ID do cliente
 */
async function carregarChamadosCliente(clienteId) {
    try {
        const chamadosContainer = document.getElementById('chamados-cliente-lista');

        // Buscar chamados abertos do cliente
        const resultadoAbertos = await fetchWithLoading(`/chamados?status=Aberto&cliente_id=${clienteId}`);

        // Buscar chamados finalizados do cliente
        const resultadoFinalizados = await fetchWithLoading(`/chamados?status=Finalizado&cliente_id=${clienteId}`);

        // Filtra apenas os chamados deste cliente específico
        const chamadosAbertos = resultadoAbertos.chamados.filter(chamado => chamado[1] == clienteId);
        const chamadosFinalizados = resultadoFinalizados.chamados.filter(chamado => chamado[1] == clienteId);

        // Verificar se existem chamados
        if (chamadosAbertos.length === 0 && chamadosFinalizados.length === 0) {
            chamadosContainer.innerHTML = `
                <div class="alert alert-info">
                    Este cliente não possui chamados registrados.
                </div>
            `;
            return;
        }

        // Montar a tabela HTML para exibir os chamados com classes responsivas
        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-cliente-chamados">
                    <thead>
                        <tr>
                            <th style="width: 15%">Protocolo</th>
                            <th style="width: 10%">Status</th>
                            <th style="width: 20%">Data</th>
                            <th style="width: 35%">Assunto</th>
                            <th style="width: 20%">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Adiciona chamados abertos primeiro
        if (chamadosAbertos.length > 0) {
            chamadosAbertos.forEach(chamado => {
                html += `
                    <tr>
                        <td>${chamado[6] || '-'}</td>
                        <td><span class="status-badge status-aberto">Aberto</span></td>
                        <td>${formatarData(chamado[4])}</td>
                        <td class="text-truncate" style="max-width: 250px;" title="${chamado[7] || '-'}">${chamado[7] || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="abrirDetalhesChamado(${chamado[0]})">
                                Ver Detalhes
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        // Adiciona chamados finalizados depois
        if (chamadosFinalizados.length > 0) {
            chamadosFinalizados.forEach(chamado => {
                html += `
                    <tr>
                        <td>${chamado[6] || '-'}</td>
                        <td><span class="status-badge status-finalizado">Finalizado</span></td>
                        <td>${formatarData(chamado[4])}</td>
                        <td class="text-truncate" style="max-width: 250px;" title="${chamado[7] || '-'}">${chamado[7] || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="abrirDetalhesChamado(${chamado[0]})">
                                Ver Detalhes
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <p><strong>Total de chamados:</strong> ${chamadosAbertos.length + chamadosFinalizados.length}</p>
                <p><strong>Chamados abertos:</strong> ${chamadosAbertos.length}</p>
                <p><strong>Chamados finalizados:</strong> ${chamadosFinalizados.length}</p>
            </div>
        `;

        chamadosContainer.innerHTML = html;
    } catch (erro) {
        console.error('Erro ao carregar chamados do cliente:', erro);
        document.getElementById('chamados-cliente-lista').innerHTML = `
            <div class="alert alert-danger">
                Erro ao carregar chamados. Por favor, tente novamente.
            </div>
        `;
    }
}

/**
 * Formata uma data para exibição amigável
 * @param {string} dataString - String com a data
 * @returns {string} Data formatada ou string vazia se inválida
 */
function formatarData(dataString) {
    if (!dataString) return '';

    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dataString;
    }
}

/**
 * Confirma a exclusão de um cliente
 * @param {number} id - ID do cliente a ser excluído
 */
function confirmarExclusaoCliente(id) {
    if (confirm('Confirma exclusão do cliente?')) {
        excluirCliente(id);
    }
}

/**
 * Abre prompt para editar um chamado
 * @param {number} id - ID do chamado
 * @param {string} descricao - Descrição atual do chamado
 * @param {string} status - Status atual do chamado
 */
function abrirFormularioEdicaoChamado(id, descricao, status) {
    let novoDescricao = prompt('Editar descrição:', descricao);
    if (novoDescricao !== null) {
        editarChamado(id, novoDescricao, status);
    }
}

/**
 * Atualiza um chamado via API
 * @param {number} id - ID do chamado
 * @param {string} descricao - Nova descrição
 * @param {string} status - Novo status
 */
async function editarChamado(id, descricao, status) {
    try {
        const resposta = await fetch(`/chamados/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descricao, status })
        });
        if (resposta.ok) {
            exibirMensagem('Chamado atualizado com sucesso!');
            carregarChamados();
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao editar chamado:', erro);
        exibirMensagem('Erro ao editar chamado', 'erro');
    }
}

/**
 * Atualiza um cliente via API
 * @param {number} id - ID do cliente
 * @param {string} nome - Nome do cliente
 * @param {string} email - Email do cliente
 * @param {string} telefone - Telefone do cliente
 * @param {object} endereco - Dados de endereço
 */
async function editarCliente(id, nome, email, telefone, endereco) {
    try {
        const resposta = await fetch(`/clientes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nome, email, telefone, endereco }),
        });

        if (resposta.ok) {
            exibirMensagem('Cliente atualizado com sucesso!');
            carregarClientes();
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao editar cliente:', erro);
        exibirMensagem('Erro ao editar cliente', 'erro');
    }
}

/**
 * Exclui um cliente via API
 * @param {number} id - ID do cliente a ser excluído
 */
async function excluirCliente(id) {
    try {
        const resposta = await fetch(`/clientes/${id}`, {
            method: 'DELETE',
        });

        if (resposta.ok) {
            exibirMensagem('Cliente excluído com sucesso!');
            carregarClientes();
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao excluir cliente:', erro);
        exibirMensagem('Erro ao excluir cliente', 'erro');
    }
}

/**
 * Carrega as opções de clientes em um elemento select
 * @returns {Promise<void>}
 */
async function carregarClientesSelect() {
    return new Promise(async (resolve, reject) => {
        try {
            // Aguarda um curto período para garantir que o DOM esteja pronto
            await new Promise(r => setTimeout(r, 100));

            const selectClientes = document.getElementById('cliente_id');
            if (!selectClientes) {
                throw new Error('Elemento select de clientes não encontrado');
            }

            const resposta = await fetch('/clientes');
            const data = await resposta.json();

            selectClientes.innerHTML = data.clientes.map(cliente => `
                <option value="${cliente[0]}" data-telefone="${cliente[3] || ''}">
                    ${cliente[1]}
                </option>
            `).join('');

            // Configura o listener de mudança
            selectClientes.addEventListener('change', function () {
                const selectedOption = this.options[this.selectedIndex];
                const telefone = selectedOption.getAttribute('data-telefone') || '';

                const telefoneInput = document.getElementById('telefone_chamado');

                if (telefoneInput) telefoneInput.value = telefone;
            });

            // Aciona a mudança inicial se existirem opções
            if (selectClientes.options.length > 0) {
                selectClientes.dispatchEvent(new Event('change'));
            }

            resolve();
        } catch (erro) {
            console.error('Erro ao carregar clientes no select:', erro);
            exibirMensagem('Erro ao carregar lista de clientes', 'erro');
            reject(erro);
        }
    });
}

/**
 * Finaliza um chamado, alterando seu status para 'Finalizado'
 * @param {number} id - ID do chamado a ser finalizado
 */
async function finalizarChamado(id) {
    // Adiciona confirmação antes de finalizar o chamado
    if (!confirm("Tem certeza que deseja finalizar este chamado?")) {
        return; // Se o usuário cancelar, interrompe a execução
    }

    try {
        showLoading();
        const response = await fetch(`/chamados/${id}/finalizar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (response.ok) {
            exibirMensagem(data.mensagem || 'Chamado finalizado com sucesso!');

            // Recarrega a lista de chamados após finalizar
            if (paginaAtual === 'chamados') {
                carregarChamados('Aberto');
                carregarChamados('Finalizado');
            } else if (paginaAtual === 'detalhesChamado') {
                carregarDetalhesChamadoPage(id); // Recarrega os detalhes
            }
        } else {
            exibirMensagem(data.erro || 'Erro ao finalizar chamado', 'erro');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        exibirMensagem('Erro de conexão ao finalizar chamado', 'erro');
    }
}

/**
 * Exclui um chamado do sistema
 * @param {number} id - ID do chamado a ser excluído
 */
async function excluirChamado(id) {
    // Adiciona confirmação antes de excluir
    if (!confirm('Tem certeza que deseja excluir este chamado?')) {
        return; // Se o usuário clicar em "Cancelar", interrompe a execução
    }

    try {
        const resposta = await fetch(`/chamados/${id}`, {
            method: 'DELETE',
        });

        const data = await resposta.json();

        if (resposta.ok) {
            exibirMensagem('Chamado excluído com sucesso!');
            carregarChamados('Aberto');
            carregarChamados('Finalizado');
        } else {
            // Melhorias na exibição do erro
            let mensagemErro = data.erro || 'Erro ao excluir o chamado';
            if (data.detalhes) {
                mensagemErro += `\n\n${data.detalhes}`;
            }
            exibirMensagem(`Erro: ${mensagemErro}`, 'erro');
            console.error('Erro ao excluir chamado:', data);
        }
    } catch (erro) {
        console.error('Erro ao excluir chamado:', erro);
        exibirMensagem('Erro ao comunicar com o servidor', 'erro');
    }
}

/**
 * Busca clientes com base em um termo de pesquisa
 */
async function buscarClientes() {
    const termo = document.getElementById('busca-cliente').value;
    try {
        const resposta = await fetch(`/clientes/buscar?termo=${encodeURIComponent(termo)}`);
        const clientes = await resposta.json();

        const resultadoHTML = clientes.map(cliente => `
            <div class="card mb-2">
                <div class="card-body">
                    <h5>${cliente[1]}</h5>
                    <p>${cliente[2]} | ${cliente[3]}</p>
                    <button class="btn btn-sm btn-primary" onclick="carregarDetalhesCliente(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">Ver Detalhes</button>
                </div>
            </div>
        `).join('');

        document.getElementById('resultado-busca').innerHTML = resultadoHTML;
    } catch (erro) {
        console.error('Erro na busca de clientes:', erro);
        exibirMensagem('Erro na busca de clientes', 'erro');
    }
}

/**
 * Carrega os detalhes de um cliente em um modal
 * @param {object} cliente - O objeto do cliente cujos detalhes serão exibidos.
 */
function carregarDetalhesCliente(cliente) {
    document.getElementById('detalhes-cliente').innerHTML = `
        <p><strong>Nome:</strong> ${cliente[1]}</p>
        <p><strong>Nome Fantasia:</strong> ${cliente[2] || ''}</p>
        <p><strong>Email:</strong> ${cliente[3] || ''}</p>
        <p><strong>Telefone:</strong> ${cliente[4] || ''}</p>
    `;
    // Exibe o modal usando o Bootstrap 5
    let modalElement = document.getElementById('clienteModal');
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Carrega as estatísticas do sistema
 * @param {string} periodo - Período para filtrar estatísticas: 'total', 'mensal', 'semanal', 'diario'
 */
async function carregarEstatisticas(periodo = 'total') {
    try {
        const response = await fetch(`/estatisticas?periodo=${periodo}`);
        const dados = await response.json();

        if (dados) {
            // Atualiza os contadores
            document.getElementById('total-abertos').textContent = dados.chamados_abertos || 0;
            document.getElementById('total-fechados').textContent = dados.chamados_fechados || 0;

            // Atualiza o gráfico
            inicializarGrafico(dados);

            // Atualiza as estatísticas gerais
            const estatisticasGerais = document.getElementById('estatisticas-gerais');
            if (estatisticasGerais) {
                estatisticasGerais.innerHTML = `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Total de Clientes
                        <span class="badge bg-primary rounded-pill">${dados.total_clientes}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Chamados Abertos
                        <span class="badge bg-warning rounded-pill">${dados.chamados_abertos}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Chamados Fechados
                        <span class="badge bg-success rounded-pill">${dados.chamados_fechados}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Média Diária de Chamados
                        <span class="badge bg-info rounded-pill">${dados.media_diaria_chamados}</span>
                    </li>
                `;
            }

            // Exibe os últimos chamados
            const ultimosChamadosContainer = document.getElementById('ultimos-chamados');
            if (ultimosChamadosContainer) {
                ultimosChamadosContainer.innerHTML = '';

                if (dados.ultimos_chamados && dados.ultimos_chamados.length > 0) {
                    dados.ultimos_chamados.forEach(chamado => {
                        // Usa diretamente os dados que vêm do backend
                        const protocolo = chamado.protocolo || ''; // Se não existir, fica vazio em vez de gerar um
                        const cliente = chamado.cliente_nome || chamado.cliente || 'Cliente não informado';
                        const assunto = chamado.assunto || 'Sem assunto';
                        const status = chamado.status || 'Aberto';
                        const dataAbertura = chamado.data_abertura || '';
                        const id = chamado.id || 0;

                        // Determina o ícone e classe de acordo com o status
                        let statusIcon = status === 'Aberto' ? 'bi-exclamation-circle' : 'bi-check-circle';
                        let statusClass = status === 'Aberto' ? 'text-danger' : 'text-success';

                        // Formata a data para exibição
                        const dataFormatada = formatarData(dataAbertura);

                        // Cria o item da lista com layout melhorado
                        const item = document.createElement('div');
                        item.className = 'chamado-item p-2 mb-1 border-bottom';

                        // Condicionalmente inclui a linha do protocolo apenas se existir
                        const protocoloHTML = protocolo
                            ? `<small class="chamado-protocolo text-secondary"><i class="bi bi-hash"></i> ${protocolo}</small>`
                            : '';

                        item.innerHTML = `
                            <div class="d-flex align-items-center">
                                <div class="chamado-status me-2">
                                    <i class="bi ${statusIcon} ${statusClass}" title="${status}"></i>
                                </div>
                                <div class="chamado-info flex-grow-1">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <strong class="chamado-cliente text-truncate" style="max-width: 65%;" title="${cliente}">${cliente}</strong>
                                        <small class="chamado-data text-muted"><i class="bi bi-calendar2"></i> ${dataFormatada}</small>
                                    </div>
                                    <p class="chamado-assunto mb-1 text-truncate" title="${assunto}">${assunto}</p>
                                    <div class="d-flex justify-content-between">
                                        ${protocoloHTML}
                                        <button class="btn btn-sm btn-outline-primary py-0" onclick="abrirDetalhesChamado(${id})">
                                            <i class="bi bi-eye"></i> Visualizar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                        ultimosChamadosContainer.appendChild(item);
                    });
                } else {
                    ultimosChamadosContainer.innerHTML = '<div class="text-center text-muted p-3"><i class="bi bi-inbox"></i> Nenhum chamado registrado</div>';
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

/**
 * Inicializa o gráfico de chamados
 * @param {object} dados - Dados para o gráfico
 */
function inicializarGrafico(dados) {
    const ctx = document.getElementById('grafico-chamados').getContext('2d');

    // Destrói o gráfico anterior se existir
    if (graficoChamados) {
        graficoChamados.destroy();
    }

    // Prepara os dados para o gráfico
    const dadosGrafico = {
        labels: ['Chamados'],
        datasets: [
            {
                label: 'Abertos',
                data: [dados.chamados_abertos],
                backgroundColor: 'rgba(255, 193, 7, 0.6)',
                borderColor: 'rgb(255, 193, 7)',
                borderWidth: 1
            },
            {
                label: 'Fechados',
                data: [dados.chamados_fechados],
                backgroundColor: 'rgba(40, 167, 69, 0.6)',
                borderColor: 'rgb(40, 167, 69)',
                borderWidth: 1
            }
        ]
    };

    // Cria um novo gráfico
    graficoChamados = new Chart(ctx, {
        type: 'bar',
        data: dadosGrafico,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: getPeriodoText(document.getElementById('periodo-estatisticas')?.value || 'total'),
                    font: {
                        size: 14
                    }
                }
            }
        }
    });
}

/**
 * Retorna o texto formatado para o período selecionado
 * @param {string} periodo - Período selecionado
 * @returns {string} Texto formatado do período
 */
function getPeriodoText(periodo) {
    switch (periodo) {
        case 'mensal':
            return 'Estatísticas do Mês Atual';
        case 'semanal':
            return 'Estatísticas da Semana Atual';
        case 'diario':
            return 'Estatísticas do Dia Atual';
        default:
            return 'Estatísticas de Todo o Período';
    }
}

/**
 * Exibe a tela de carregamento
 */
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

/**
 * Oculta a tela de carregamento
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

/**
 * Realiza uma requisição fetch com tela de carregamento
 * @param {string} url - URL da requisição
 * @param {object} options - Opções da requisição
 * @returns {Promise<object>} Dados da resposta
 */
async function fetchWithLoading(url, options = {}) {
    // Apenas mostrar o spinner para requisições longas (como salvar/excluir)
    // Para atualizações automáticas de estatísticas, não mostramos o spinner
    const showSpinner = !url.includes('/estatisticas') || (options.method && options.method !== 'GET');

    if (showSpinner) {
        showLoading();
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.erro || 'Erro na requisição');
        }
        return await response.json();
    } catch (error) {
        // Para estatísticas, não exibimos mensagens de erro pop-up
        if (!url.includes('/estatisticas')) {
            exibirMensagem(error.message, 'erro');
        }
        throw error;
    } finally {
        if (showSpinner) {
            hideLoading();
        }
    }
}

/**
 * Avança para a próxima página de chamados
 * @param {string} status - Status dos chamados
 */
function proximaPaginaChamados(status = 'Aberto') {
    if (status === 'Aberto') {
        paginaAtualChamadosAbertos++;
    } else {
        paginaAtualChamadosFinalizados++;
    }
    carregarChamados(status);
}

/**
 * Retorna para a página anterior de chamados
 * @param {string} status - Status dos chamados
 */
function paginaAnteriorChamados(status = 'Aberto') {
    if (status === 'Aberto') {
        if (paginaAtualChamadosAbertos > 1) {
            paginaAtualChamadosAbertos--;
            carregarChamados(status);
        }
    } else {
        if (paginaAtualChamadosFinalizados > 1) {
            paginaAtualChamadosFinalizados--;
            carregarChamados(status);
        }
    }
}

// Declara a variável refreshInterval globalmente
let refreshInterval;
let paginaAtual = 'home'; // Variável para rastrear a página atual

/**
 * Carrega a página inicial do sistema
 */
function carregarHome() {
    updateActiveMenu('home');
    const template = document.getElementById('home-template');
    const content = template.content.cloneNode(true);
    document.getElementById('conteudo').innerHTML = '';
    document.getElementById('conteudo').appendChild(content);

    // Carrega as estatísticas apenas uma vez ao entrar na página inicial
    carregarEstatisticas('total');
    configurarDropdownPeriodo();
    configurarBuscaClientes();
}

/**
 * Inicia o ciclo de atualização automática das estatísticas
 */
function startAutoRefresh() {
    stopAutoRefresh();

    // Usa um intervalo mais longo (2 minutos = 120000ms) para reduzir requisições frequentes
    refreshInterval = setInterval(() => {
        // Apenas atualiza se a página estiver visível para o usuário e se estiver na página inicial
        if (document.visibilityState === 'visible' && paginaAtual === 'home') {
            carregarEstatisticas();
        }
    }, 120000); // Intervalo ajustado para 2 minutos
}

/**
 * Interrompe o ciclo de atualização automática das estatísticas
 */
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Aplica o tema salvo se existir
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').textContent = '🌙';
    }
    carregarHome();
    startAutoRefresh();
    exibirInfoUsuario();
    checkAdminStatus();
    startSessionMonitor();
    setupKonamiCode(); // Adiciona o detector do código Konami

    // Configurar o link para o Database Viewer
    const dbViewerLink = document.getElementById('menu-db-viewer');
    if (dbViewerLink) {
        dbViewerLink.addEventListener('click', function (e) {
            e.preventDefault();
            openDatabaseViewer();
        });
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && paginaAtual === 'home') {
        carregarEstatisticas();
    }
});

/**
 * Carrega a página para criar um novo cliente
 */
function carregarNovoClientePage() {
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-8 offset-md-2">
                <h2>Novo Cliente</h2>
                <ul class="nav nav-tabs" id="clienteTabs">
                    <li class="nav-item">
                        <a class="nav-link active" id="dados-tab" data-bs-toggle="tab" href="#dados" role="tab">Dados do Cliente</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" id="endereco-tab" data-bs-toggle="tab" href="#endereco" role="tab">Endereço</a>
                    </li>
                </ul>
                <div class="tab-content" id="clienteTabsContent">
                    <div class="tab-pane fade show active" id="dados" role="tabpanel">
                        <form id="novo-cliente-form">
                            <!-- Campos existentes do cliente -->
                            <div class="mb-3">
                                <label for="nome" class="form-label">Razão Social/Nome:</label>
                                <input type="text" id="nome" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label for="nome_fantasia" class="form-label">Nome Fantasia:</label>
                                <input type="text" id="nome_fantasia" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">E-mail:</label>
                                <input type="text" id="email" class="form-control">
                                <div class="form-text">Múltiplos e-mails separados por vírgula ou "/".</div>
                            </div>
                            <div class="mb-3">
                                <label for="telefone" class="form-label">Telefone:</label>
                                <input type="text" id="telefone" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="ativo" class="form-label">Ativo:</label>
                                <select id="ativo" class="form-select">
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="tipo_cliente" class="form-label">Tipo Cliente:</label>
                                <select id="tipo_cliente" class="form-select">
                                    <option value="Comercial">Comercial</option>
                                    <option value="Pessoa Física">Pessoa Física</option>
                                    <!-- adicione mais opções se necessário -->
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="cnpj_cpf" class="form-label">CNPJ/CPF:</label>
                                <input type="text" id="cnpj_cpf" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="ie_rg" class="form-label">IE/RG:</label>
                                <input type="text" id="ie_rg" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="contribuinte_icms" class="form-label">Contribuinte ICMS:</label>
                                <select id="contribuinte_icms" class="form-select">
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                    <option value="Isento">Isento</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="rg_orgao_emissor" class="form-label">RG Órgão Emissor:</label>
                                <input type="text" id="rg_orgao_emissor" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="nacionalidade" class="form-label">Nacionalidade:</label>
                                <input type="text" id="nacionalidade" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="naturalidade" class="form-label">Naturalidade:</label>
                                <input type="text" id="naturalidade" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="estado_nascimento" class="form-label">Estado de Nascimento:</label>
                                <input type="text" id="estado_nascimento" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="data_nascimento" class="form-label">Data de Nascimento:</label>
                                <input type="date" id="data_nascimento" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="sexo" class="form-label">Sexo:</label>
                                <select id="sexo" class="form-select">
                                    <option value="Feminino">Feminino</option>
                                    <option value="Masculino">Masculino</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="profissao" class="form-label">Profissão:</label>
                                <input type="text" id="profissao" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="estado_civil" class="form-label">Estado Civil:</label>
                                <input type="text" id="estado_civil" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="inscricao_municipal" class="form-label">Inscrição Municipal:</label>
                                <input type="text" id="inscricao_municipal" class="form-control">
                            </div>
                            <button type="submit" class="btn btn-primary">Cadastrar Cliente</button>
                        </form>
                    </div>
                    <div class="tab-pane fade" id="endereco" role="tabpanel">
                        <form id="novo-endereco-form">
                            <div class="mb-3">
                                <label for="cep" class="form-label">CEP:</label>
                                <input type="text" id="cep" class="form-control" placeholder="Digite o CEP">
                            </div>
                            <div class="mb-3">
                                <label for="rua" class="form-label">Rua:</label>
                                <input type="text" id="rua" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="numero" class="form-label">Número:</label>
                                <input type="text" id="numero" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="complemento" class="form-label">Complemento:</label>
                                <input type="text" id="complemento" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="bairro" class="form-label">Bairro:</label>
                                <input type="text" id="bairro" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="cidade" class="form-label">Cidade:</label>
                                <input type="text" id="cidade" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="estado" class="form-label">Estado:</label>
                                <input type="text" id="estado" class="form-control">
                            </div>
                            <div class="mb-3">
                                <label for="pais" class="form-label">País:</label>
                                <input type="text" id="pais" class="form-control">
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Adiciona o handler para busca de CEP
    document.getElementById('cep').addEventListener('blur', async () => {
        const cep = document.getElementById('cep').value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const dados = await resposta.json();
                if (!dados.erro) {
                    document.getElementById('rua').value = dados.logradouro || '';
                    document.getElementById('bairro').value = dados.bairro || '';
                    document.getElementById('cidade').value = dados.localidade || '';
                    document.getElementById('estado').value = dados.uf || '';
                    document.getElementById('pais').value = 'Brasil';
                } else {
                    exibirMensagem('CEP não encontrado', 'erro');
                }
            } catch (erro) {
                console.error('Erro ao buscar CEP:', erro);
                exibirMensagem('Erro ao buscar CEP', 'erro');
            }
        }
    });

    // Atualiza o handler do formulário para incluir os dados de endereço
    document.getElementById('novo-cliente-form').onsubmit = async (e) => {
        e.preventDefault();
        const novoCliente = {
            nome: document.getElementById('nome').value,
            nome_fantasia: document.getElementById('nome_fantasia').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            ativo: document.getElementById('ativo').value,
            tipo_cliente: document.getElementById('tipo_cliente').value,
            cnpj_cpf: document.getElementById('cnpj_cpf').value,
            ie_rg: document.getElementById('ie_rg').value,
            contribuinte_icms: document.getElementById('contribuinte_icms').value,
            rg_orgao_emissor: document.getElementById('rg_orgao_emissor').value,
            nacionalidade: document.getElementById('nacionalidade').value,
            naturalidade: document.getElementById('naturalidade').value,
            estado_nascimento: document.getElementById('estado_nascimento').value,
            data_nascimento: document.getElementById('data_nascimento').value,
            sexo: document.getElementById('sexo').value,
            profissao: document.getElementById('profissao').value,
            estado_civil: document.getElementById('estado_civil').value,
            inscricao_municipal: document.getElementById('inscricao_municipal').value,
            cep: document.getElementById('cep').value,
            rua: document.getElementById('rua').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complemento').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value,
            pais: document.getElementById('pais').value
        };
        try {
            const resposta = await fetch('/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoCliente)
            });
            if (resposta.ok) {
                exibirMensagem('Cliente cadastrado com sucesso!');
                carregarClientesPage();
            } else {
                const erro = await resposta.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao cadastrar cliente:', erro);
            exibirMensagem('Erro ao cadastrar cliente', 'erro');
        }
    }
}

/**
 * Carrega a página de detalhes de um chamado
 * @param {number} id - ID do chamado
 */
async function carregarDetalhesChamadoPage(id) {
    try {
        const response = await fetch(`/chamados/${id}`);
        const chamado = await response.json();
        if (chamado.erro) {
            exibirMensagem(chamado.erro, 'erro');
            return;
        }
        const isFinalizado = chamado.status === 'Finalizado';
        currentChamadoId = id; // Armazena o ID do chamado atual
        isDescriptionVisible = true; // Redefinir para descrição visível ao carregar

        // Renderiza o campo de cliente com botão para visualizar detalhes, se disponível
        const clienteHTML = `
            <div class="mb-3 col-md-6">
                <label for="cliente" class="form-label">Cliente:</label>
                <div class="input-group">
                    <input type="text" id="cliente" class="form-control" 
                        value="${chamado.cliente_nome ? chamado.cliente_nome : 'Cliente removido'}" readonly>
                    ${chamado.cliente_id ? `
                        <button type="button" class="btn btn-outline-secondary" 
                                onclick="mostrarDetalhesCliente(${chamado.cliente_id})">
                            Ver Cadastro
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Atualize o template para usar o novo clienteHTML
        document.getElementById('conteudo').innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <h2>Detalhes do Chamado</h2>
                    <form id="detalhes-chamado-form">
                        <div class="mb-3 col-md-6">
                            <label for="protocolo" class="form-label">Protocolo:</label>
                            <input type="text" id="protocolo" class="form-control" value="${chamado.protocolo}" readonly>
                        </div>
                        <div class="mb-3 col-md-6">
                            <label for="assunto" class="form-label">Assunto:</label>
                            <input type="text" id="assunto" class="form-control" value="${chamado.assunto || ''}" ${isFinalizado ? 'readonly' : ''}>
                        </div>
                        ${clienteHTML}
                        <div class="mb-3 col-md-6">
                            <label for="solicitante" class="form-label">Solicitante:</label>
                            <input type="text" id="solicitante" class="form-control" 
                                value="${chamado.solicitante || ''}" ${isFinalizado ? 'readonly' : ''} maxlength="70">
                            <div class="form-text">Máximo 70 caracteres</div>
                        </div>
                        <!-- Container para a seção de descrição e andamentos -->
                        <div id="description-and-andamentos-container" style="display: flex; overflow: hidden; width: 100%;">
                            <!-- Seção de Descrição Principal -->
                            <div id="description-section" style="flex: 1; transition: transform 0.5s ease;">
                                <div class="mb-3 col-md-6" style="width: 100%; margin-left: -18px;">
                                    <label for="descricao" class="form-label">Descrição:</label>
                                    <textarea id="descricao" class="form-control" rows="5" ${isFinalizado ? 'readonly' : ''}>${chamado.descricao}</textarea>
                                    <!-- Botão com novo texto -->
                                    <button type="button" class="btn btn-primary" style="float: right;" onclick="toggleDescriptionVisibility()">Andamentos</button>
                                </div>
                            </div>

                            <!-- Seção de Andamentos -->
                            <div id="andamentos-section" style="flex: 1; transition: transform 0.5s ease; transform: translateX(100%); position: absolute; top: 0; left: 0; width: 100%;">
                                <h2 style="text-align: center; font-size: 1.25rem; font-weight: normal;">Andamentos</h2>
                                <div id="andamentos-carousel" style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory;">
                                    <!-- Andamentos serão carregados aqui -->
                                </div>
                                <!-- Removed incorrectly placed buttons -->
                            </div>
                        </div>
                        <div class="mb-3 col-md-6">
                            <label for="status" class="form-label">Status:</label>
                            <input type="text" id="status" class="form-control" value="${chamado.status}" readonly>
                        </div>
                        <div class="mb-3 col-md-6">
                            <label for="data_abertura" class="form-label">Data de Abertura:</label>
                            <input type="text" id="data_abertura" class="form-control" value="${chamado.data_abertura}" readonly>
                        </div>
                        <div class="mb-3 col-md-6">
                            <label for="data_fechamento" class="form-label">Data de Fechamento:</label>
                            <input type="text" id="data_fechamento" class="form-control" value="${chamado.data_fechamento || ''}" readonly>
                        </div>
                        <div class="d-flex mt-3">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Salvar Alterações
                            </button>
                            ${chamado.status === 'Aberto' ? `
                                <button type="button" class="btn btn-success ms-2" onclick="finalizarEAtualizar(${id})">
                                    <i class="bi bi-check-circle"></i> Finalizar Chamado
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-success" onclick="generateServiceOrder(${chamado.id})">
                                <i class="bi bi-printer"></i> Ordem de Serviço
                            </button>
                        </div>
                        <input type="hidden" id="chamado_id" value="${chamado.id}">
                    </form>
                </div>
            </div>
        `;

        // Função para renderizar entradas de progresso
        function renderAndamentos() {
            const andamentosCarousel = document.getElementById('andamentos-carousel');
            const status = document.getElementById('status').value;
            andamentosCarousel.innerHTML = '';

            // Se finalizado, não adiciona a entrada vazia para novos andamentos
            const andamentosArray = status === 'Finalizado'
                ? chamado.andamentos
                : [...chamado.andamentos, { id: null, data_hora: '', texto: '' }];

            // Verificar se não há andamentos em um chamado finalizado
            if (status === 'Finalizado' && (!andamentosArray || andamentosArray.length === 0)) {
                const semAndamentosDiv = document.createElement('div');
                semAndamentosDiv.style.textAlign = 'center';
                semAndamentosDiv.style.padding = '20px';
                semAndamentosDiv.innerHTML = `
                    <p>Não há andamentos registrados para este chamado.</p>
                    <button class="btn btn-secondary" onclick="toggleDescriptionVisibility()">Voltar para Descrição</button>
                `;
                andamentosCarousel.appendChild(semAndamentosDiv);
                return;
            }

            andamentosArray.forEach((andamento, index) => {
                const andamentoDiv = document.createElement('div');
                andamentoDiv.style.flex = '0 0 auto';
                andamentoDiv.style.width = '100%';
                andamentoDiv.style.padding = '10px';
                andamentoDiv.style.marginRight = '10px';
                andamentoDiv.style.scrollSnapAlign = 'start';
                andamentoDiv.style.border = 'none';
                andamentoDiv.style.position = 'relative'; // Ensure relative positioning for the counter

                const texto = document.createElement('textarea');
                texto.value = andamento.texto;
                texto.rows = 5; // Adjusted to match description box
                texto.classList.add('form-control');
                texto.style.width = '100%'; // Match description box width
                // Se for a última caixa (entrada em branco), permita escrita; caso contrário, somente leitura
                texto.readOnly = index < andamentosArray.length - 1;
                andamentoDiv.appendChild(texto);

                // Add the new "Voltar para Descrição" button
                const voltarButton = document.createElement('button');
                voltarButton.textContent = 'Voltar para Descrição';
                voltarButton.classList.add('btn', 'btn-secondary');
                voltarButton.onclick = (event) => {
                    event.preventDefault();
                    toggleDescriptionVisibility();
                };
                andamentoDiv.appendChild(voltarButton);

                // Se o andamento existir (já salvo), adicionar botão de exclusão
                if (andamento.id) {
                    const excluirButton = document.createElement('button');
                    excluirButton.textContent = 'Excluir';
                    excluirButton.classList.add('btn', 'btn-danger');
                    excluirButton.onclick = () => excluirAndamento(andamento.id);
                    andamentoDiv.appendChild(excluirButton);
                }

                // Se for a caixa em branco final, adiciona o botão de salvar
                if (index === andamentosArray.length - 1) {
                    const salvarAndamentoButton = document.createElement('button');
                    salvarAndamentoButton.textContent = 'Salvar Andamento';
                    salvarAndamentoButton.classList.add('btn', 'btn-success');
                    salvarAndamentoButton.onclick = () => salvarAndamento(chamado.id, texto.value);
                    andamentoDiv.appendChild(salvarAndamentoButton);
                }

                // Add the progress entry counter
                const andamentoCounter = document.createElement('div');
                andamentoCounter.classList.add('andamento-counter');
                andamentoCounter.textContent = `Andamento ${index + 1}/${andamentosArray.length}`;
                andamentoDiv.appendChild(andamentoCounter);

                andamentosCarousel.appendChild(andamentoDiv);
            });

            // Inserção dos botões de navegação com scroll one-by-one
            const prevButton = document.createElement('button');
            prevButton.type = 'button';
            prevButton.classList.add('nav-button', 'left');
            prevButton.textContent = '<';
            // Posicionar um pouco mais afastado
            prevButton.style.position = 'absolute';
            prevButton.style.left = '20px';
            prevButton.style.top = '50%';
            prevButton.style.transform = 'translateY(-50%)';
            prevButton.onclick = function () {
                // Calcula a largura do primeiro item (incluindo margem, se necessário)
                const item = andamentosCarousel.firstElementChild;
                if (item) {
                    const itemWidth = item.offsetWidth + 10; // 10px de margem-right
                    andamentosCarousel.scrollBy({ left: -itemWidth, behavior: 'smooth' });
                }
            };

            const nextButton = document.createElement('button');
            nextButton.type = 'button';
            nextButton.classList.add('nav-button', 'right');
            nextButton.textContent = '>';
            // Posicionar um pouco mais afastado
            nextButton.style.position = 'absolute';
            nextButton.style.right = '20px';
            nextButton.style.top = '50%';
            nextButton.style.transform = 'translateY(-50%)';
            nextButton.onclick = function () {
                const item = andamentosCarousel.firstElementChild;
                if (item) {
                    const itemWidth = item.offsetWidth + 10;
                    andamentosCarousel.scrollBy({ left: itemWidth, behavior: 'smooth' });
                }
            };

            // Anexa os botões ao contêiner pai para que fiquem nas extremidades
            const parentContainer = andamentosCarousel.parentElement;
            parentContainer.appendChild(prevButton);
            parentContainer.appendChild(nextButton);
        }

        renderAndamentos();

        if (!isFinalizado) {
            document.getElementById('detalhes-chamado-form').onsubmit = async (e) => {
                e.preventDefault();

                const chamadoId = document.getElementById('chamado_id').value;
                const dadosAtualizados = {
                    assunto: document.getElementById('assunto').value,
                    solicitante: document.getElementById('solicitante').value,
                    status: document.getElementById('status').value,
                    descricao: document.getElementById('descricao').value
                };

                try {
                    const response = await fetch(`/chamados/${chamadoId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(dadosAtualizados)
                    });

                    if (!response.ok) {
                        throw new Error('Erro ao atualizar chamado');
                    }

                    const result = await response.json();
                    exibirMensagem(result.mensagem || 'Chamado atualizado com sucesso!', 'sucesso');

                    // Fecha o modal após salvar
                    const modal = bootstrap.Modal.getInstance(document.getElementById('chamadoModal'));
                    modal.hide();

                    // Recarrega a lista de chamados
                    carregarChamados(dadosAtualizados.status);

                } catch (erro) {
                    console.error('Erro ao atualizar chamado:', erro);
                }
            };
        }
    } catch (erro) {
        console.error('Erro ao carregar detalhes do chamado:', erro);
        exibirMensagem('Erro ao carregar detalhes do chamado', 'erro');
    }
}

// Adicionar esta nova função para finalizar e atualizar a interface
async function finalizarEAtualizar(id) {
    try {
        await finalizarChamado(id);
        // Recarrega os detalhes do chamado após finalizar
        const response = await fetch(`/chamados/${id}`);
        const chamado = await response.json();

        // Desabilita todos os campos do formulário
        const form = document.getElementById('detalhes-chamado-form');
        const campos = form.querySelectorAll('input, textarea, select, button[type="submit"]');
        campos.forEach(campo => campo.disabled = true);

        // Remove o botão de finalizar
        const btnFinalizar = form.querySelector('button[onclick^="finalizarEAtualizar"]');
        if (btnFinalizar) {
            btnFinalizar.remove();
        }

        // Exibe mensagem de sucesso
        exibirMensagem('Chamado finalizado com sucesso!', 'sucesso');

    } catch (erro) {
        console.error('Erro:', erro);
        exibirMensagem('Erro ao finalizar chamado', 'erro');
    }
}

/**
 * Alterna entre tema claro e escuro
 */
document.getElementById('theme-toggle').addEventListener('click', function () {
    const body = document.body;
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        this.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-mode');
        this.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
    // Atualiza a cor da legenda do gráfico imediatamente, se o gráfico existir
    if (graficoChamados) {
        const newColor = body.classList.contains('dark-mode') ? '#ffffff' : '#000000';
        graficoChamados.options.plugins.legend.labels.color = newColor;
        graficoChamados.update();
    }
});

/**
 * Ordena os chamados com base no campo especificado
 * @param {string} field - Campo pelo qual os chamados serão ordenados
 */
function sortChamados(field) {
    if (currentChamadoSortField === field) {
        currentChamadoSortOrder = (currentChamadoSortOrder === 'asc') ? 'desc' : 'asc';
    } else {
        currentChamadoSortField = field;
        currentChamadoSortOrder = 'asc';
    }
    carregarChamados('Aberto'); // Recarrega com a ordenação aplicada
}

/**
 * Abre a página de detalhes do chamado
 * @param {number} id - O ID do chamado a ser aberto
 */
function abrirDetalhesChamado(id) {
    if (id) {
        currentChamadoId = id; // Armazena o ID do chamado atual
        carregarDetalhesChamadoPage(id);
    } else {
        exibirMensagem('Selecione um chamado primeiro', 'erro');
    }
}

/**
 * Exclui o chamado selecionado
 */
function excluirChamadoSelecionado() {
    if (!selectedChamadoId) {
        exibirMensagem('Nenhum chamado selecionado!', 'erro');
        return;
    }
    excluirChamado(selectedChamadoId);
}

// Variáveis para controle de seleção de cliente
let selectedClienteId = null;
let selectedCliente = null;

/**
 * Carrega a página de edição do cliente selecionado
 */
function editarClienteSelecionado() {
    if (selectedClienteId) {
        carregarEditarClientePage(selectedCliente);
    } else {
        exibirMensagem('Selecione um cliente para editar.', 'erro');
    }
}

/**
 * Exclui o cliente selecionado após confirmação
 */
function excluirClienteSelecionado() {
    if (selectedClienteId) {
        confirmarExclusaoCliente(selectedClienteId);
    } else {
        exibirMensagem('Selecione um cliente para excluir.', 'erro');
    }
}

/**
 * Variável para controlar a visibilidade da descrição e dos andamentos
 * @type {boolean}
 */
let isDescriptionVisible = true;

/**
 * Variável para armazenar o índice do andamento atual
 * @type {number}
 */
let currentAndamentoIndex = -1;

/**
 * Variável para armazenar o ID do chamado atual
 * @type {number}
 */
let currentChamadoId = null;

/**
 * Alterna a visibilidade entre a seção de descrição e a seção de andamentos
 */
function toggleDescriptionVisibility() {
    const status = document.getElementById('status').value;

    const descriptionSection = document.getElementById('description-section');
    const andamentosSection = document.getElementById('andamentos-section');
    if (isDescriptionVisible) {
        descriptionSection.style.transform = 'translateX(-100%)';
        andamentosSection.style.transform = 'translateX(0)';
    } else {
        descriptionSection.style.transform = 'translateX(0)';
        andamentosSection.style.transform = 'translateX(100%)';
    }
    isDescriptionVisible = !isDescriptionVisible;
}

/**
 * Renderiza os andamentos de um chamado
 */
function renderAndamentos() {
    const andamentosCarousel = document.getElementById('andamentos-carousel');
    const status = document.getElementById('status').value;
    andamentosCarousel.innerHTML = '';

    // Se finalizado, não adiciona a entrada vazia para novos andamentos
    const andamentosArray = status === 'Finalizado'
        ? chamado.andamentos
        : [...chamado.andamentos, { id: null, data_hora: '', texto: '' }];

    // Verificar se não há andamentos em um chamado finalizado
    if (status === 'Finalizado' && (!andamentosArray || andamentosArray.length === 0)) {
        const semAndamentosDiv = document.createElement('div');
        semAndamentosDiv.style.textAlign = 'center';
        semAndamentosDiv.style.padding = '20px';
        semAndamentosDiv.innerHTML = `
            <p>Não há andamentos registrados para este chamado.</p>
            <button class="btn btn-secondary" onclick="toggleDescriptionVisibility()">Voltar para Descrição</button>
        `;
        andamentosCarousel.appendChild(semAndamentosDiv);
        return;
    }

    andamentosArray.forEach((andamento, index) => {
        const andamentoDiv = document.createElement('div');
        andamentoDiv.style.flex = '0 0 auto';
        andamentoDiv.style.width = '100%';
        andamentoDiv.style.padding = '10px';
        andamentoDiv.style.marginRight = '10px';
        andamentoDiv.style.scrollSnapAlign = 'start';
        andamentoDiv.style.border = 'none';
        andamentoDiv.style.position = 'relative'; // Ensure relative positioning for the counter

        const texto = document.createElement('textarea');
        texto.value = andamento.texto;
        texto.rows = 5; // Adjusted to match description box
        texto.classList.add('form-control');
        texto.style.width = '100%'; // Match description box width
        // Se for a última caixa (entrada em branco), permita escrita; caso contrário, somente leitura
        texto.readOnly = index < andamentosArray.length - 1;
        andamentoDiv.appendChild(texto);

        // Add the new "Voltar para Descrição" button
        const voltarButton = document.createElement('button');
        voltarButton.textContent = 'Voltar para Descrição';
        voltarButton.classList.add('btn', 'btn-secondary');
        voltarButton.onclick = (event) => {
            event.preventDefault();
            toggleDescriptionVisibility();
        };
        andamentoDiv.appendChild(voltarButton);

        // Se o andamento existir (já salvo), adicionar botão de exclusão
        if (andamento.id) {
            const excluirButton = document.createElement('button');
            excluirButton.textContent = 'Excluir';
            excluirButton.classList.add('btn', 'btn-danger');
            excluirButton.onclick = () => excluirAndamento(andamento.id);
            andamentoDiv.appendChild(excluirButton);
        }

        // Se for a caixa em branco final, adiciona o botão de salvar
        if (index === andamentosArray.length - 1) {
            const salvarAndamentoButton = document.createElement('button');
            salvarAndamentoButton.textContent = 'Salvar Andamento';
            salvarAndamentoButton.classList.add('btn', 'btn-success');
            salvarAndamentoButton.onclick = () => salvarAndamento(chamado.id, texto.value);
            andamentoDiv.appendChild(salvarAndamentoButton);
        }

        // Add the progress entry counter
        const andamentoCounter = document.createElement('div');
        andamentoCounter.classList.add('andamento-counter');
        andamentoCounter.textContent = `Andamento ${index + 1}/${andamentosArray.length}`;
        andamentoDiv.appendChild(andamentoCounter);

        andamentosCarousel.appendChild(andamentoDiv);
    });

    // Inserção dos botões de navegação com scroll one-by-one
    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.classList.add('nav-button', 'left');
    prevButton.textContent = '<';
    // Posicionar um pouco mais afastado
    prevButton.style.position = 'absolute';
    prevButton.style.left = '20px';
    prevButton.style.top = '50%';
    prevButton.style.transform = 'translateY(-50%)';
    prevButton.onclick = function () {
        // Calcula a largura do primeiro item (incluindo margem, se necessário)
        const item = andamentosCarousel.firstElementChild;
        if (item) {
            const itemWidth = item.offsetWidth + 10; // 10px de margem-right
            andamentosCarousel.scrollBy({ left: -itemWidth, behavior: 'smooth' });
        }
    };

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.classList.add('nav-button', 'right');
    nextButton.textContent = '>';
    // Posicionar um pouco mais afastado
    nextButton.style.position = 'absolute';
    nextButton.style.right = '20px';
    nextButton.style.top = '50%';
    nextButton.style.transform = 'translateY(-50%)';
    nextButton.onclick = function () {
        const item = andamentosCarousel.firstElementChild;
        if (item) {
            const itemWidth = item.offsetWidth + 10;
            andamentosCarousel.scrollBy({ left: itemWidth, behavior: 'smooth' });
        }
    };

    // Anexa os botões ao contêiner pai para que fiquem nas extremidades
    const parentContainer = andamentosCarousel.parentElement;
    parentContainer.appendChild(prevButton);
    parentContainer.appendChild(nextButton);
}

/**
 * Adiciona um novo andamento ao chamado
 * @param {number} chamadoId - ID do chamado
 */
window.adicionarNovoAndamento = async (chamadoId) => {
    const texto = prompt('Digite o novo andamento:');
    if (texto) {
        try {
            const response = await fetch(`/chamados/${chamadoId}/andamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto })
            });
            if (response.ok) {
                exibirMensagem('Andamento adicionado com sucesso!');
                carregarDetalhesChamadoPage(chamadoId); // Reload the page to show the new entry
            } else {
                const erro = await response.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao adicionar andamento:', erro);
            exibirMensagem('Erro ao adicionar andamento', 'erro');
        }
    }
};

/**
 * Exclui um andamento existente
 * @param {number} andamentoId - ID do andamento
 */
window.excluirAndamento = async (andamentoId) => {
    const status = document.getElementById('status').value;
    if (status === 'Finalizado') {
        exibirMensagem('Não é possível excluir andamentos em chamados finalizados', 'erro');
        return;
    }

    if (confirm('Confirma a exclusão deste andamento?')) {
        try {
            const response = await fetch(`/chamados/andamentos/${andamentoId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                exibirMensagem('Andamento excluído com sucesso!');
                carregarDetalhesChamadoPage(currentChamadoId); // Reload the page
            } else {
                const erro = await response.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao excluir andamento:', erro);
            exibirMensagem('Erro ao excluir andamento', 'erro');
        }
    }
};

/**
 * Salva um novo andamento para o chamado
 * @param {number} chamadoId - ID do chamado
 * @param {string} texto - Texto do andamento
 */
async function salvarAndamento(chamadoId, texto) {
    const status = document.getElementById('status').value;
    if (status === 'Finalizado') {
        exibirMensagem('Não é possível adicionar andamentos em chamados finalizados', 'erro');
        return;
    }

    if (!texto || !texto.trim()) {
        exibirMensagem('O texto do andamento é obrigatório', 'erro');
        return;
    }

    try {
        showLoading();
        const response = await fetch(`/chamados/${chamadoId}/andamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: texto.trim() })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao salvar andamento');
        }

        exibirMensagem('Andamento salvo com sucesso!');
        await carregarDetalhesChamadoPage(chamadoId); // Recarrega a página para mostrar o novo andamento
    } catch (erro) {
        console.error('Erro ao salvar andamento:', erro);
        exibirMensagem(`Erro: ${erro.message}`, 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Renderiza os andamentos no carrossel.
 * @function renderAndamentos
 * @param {Array} andamentos - Array de andamentos a serem exibidos.
 * @param {number} chamadoId - ID do chamado ao qual os andamentos pertencem.
 */
function renderAndamentos(andamentos, chamadoId) {
    const andamentosCarousel = document.getElementById('andamentos-carousel');
    if (!andamentosCarousel) return;

    andamentosCarousel.innerHTML = '';

    // Sempre adiciona um novo campo de andamento no final
    const andamentosArray = [...(andamentos || []), { id: null, data_hora: '', texto: '' }];

    andamentosArray.forEach((andamento, index) => {
        const andamentoDiv = document.createElement('div');
        andamentoDiv.className = 'andamento-item';

        if (andamento.id) { // Andamento existente
            andamentoDiv.innerHTML = `
                <textarea class="form-control mb-2" rows="5" readonly>${andamento.texto || ''}</textarea>
                <button class="btn btn-danger" onclick="excluirAndamento(${andamento.id})">Excluir</button>
            `;
        } else { // Novo andamento
            andamentoDiv.innerHTML = `
                <textarea class="form-control mb-2" rows="5" placeholder="Digite o novo andamento..."></textarea>
                <button class="btn btn-primary" onclick="salvarNovoAndamento('${chamadoId}', this)">Salvar</button>
                <button class="btn btn-secondary" onclick="toggleDescriptionVisibility()">Voltar</button>
            `;
        }

        andamentosCarousel.appendChild(andamentoDiv);
    });
}

/**
 * Salva um novo andamento após o usuário digitar e clicar em salvar.
 * @async
 * @function salvarNovoAndamento
 * @param {string} chamadoId - ID do chamado.
 * @param {HTMLElement} button - Botão que foi clicado para salvar.
 */
async function salvarNovoAndamento(chamadoId, button) {
    const textarea = button.previousElementSibling;
    const texto = textarea.value;
    await salvarAndamento(chamadoId, texto);
}

/**
 * Configura a busca de clientes na página inicial
 */
function configurarBuscaClientes() {
    const buscaInput = document.getElementById('busca-cliente');
    if (buscaInput) {
        let timeoutId;
        buscaInput.addEventListener('input', function () {
            // Limpa o timeout anterior para implementar debounce
            clearTimeout(timeoutId);

            // Define um novo timeout para buscar após o usuário parar de digitar
            timeoutId = setTimeout(function () {
                const termo = buscaInput.value.trim();
                // Só busca se tiver pelo menos 2 caracteres
                if (termo.length >= 2) {
                    buscarClientesAjax(termo);
                } else if (termo.length === 0) {
                    // Limpa os resultados se o campo estiver vazio
                    document.getElementById('resultado-busca').innerHTML = '';
                }
            }, 300); // Delay de 300ms para evitar muitas requisições
        });
    }
}

/**
 * Configura o dropdown de período para o gráfico de estatísticas
 */
function configurarDropdownPeriodo() {
    const dropdown = document.getElementById('periodo-estatisticas');
    if (dropdown) {
        dropdown.addEventListener('change', function () {
            carregarEstatisticas(this.value);
        });
    }
}

/**
 * Retorna o texto formatado para o período selecionado
 * @param {string} periodo - Período selecionado
 * @returns {string} Texto formatado do período
 */
function getPeriodoText(periodo) {
    switch (periodo) {
        case 'mensal':
            return 'Estatísticas do Mês Atual';
        case 'semanal':
            return 'Estatísticas da Semana Atual';
        case 'diario':
            return 'Estatísticas do Dia Atual';
        default:
            return 'Estatísticas de Todo o Período';
    }
}

/**
 * Configura o dropdown de período para o gráfico de estatísticas
 */
function configurarDropdownPeriodo() {
    const dropdown = document.getElementById('periodo-estatisticas');
    if (dropdown) {
        dropdown.addEventListener('change', function () {
            carregarEstatisticas(this.value);
        });
    }
}

/**
 * Busca clientes na API e exibe os resultados
 * @param {string} termo - Termo a ser buscado
 */
function buscarClientesAjax(termo) {
    fetch(`/clientes/buscar?termo=${encodeURIComponent(termo)}`)
        .then(response => response.json())
        .then(clientes => {
            const resultadoDiv = document.getElementById('resultado-busca');
            if (clientes.length === 0) {
                resultadoDiv.innerHTML = '<p class="text-muted">Nenhum cliente encontrado.</p>';
                return;
            }

            // Cria uma lista com os resultados
            let html = '<div class="list-group mt-2">';
            clientes.forEach(cliente => {
                html += `
                    <a href="#" class="list-group-item list-group-item-action" 
                        onclick="mostrarDetalhesCliente(${cliente[0]})">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${cliente[1]}</strong>
                                ${cliente[2] ? `<br><small>${cliente[2]}</small>` : ''}
                            </div>
                            <div class="text-muted">${cliente[4] || ''}</div>
                        </div>
                        <small class="text-muted">${cliente[3] || ''}</small>
                    </a>
                `;
            });
            html += '</div>';
            resultadoDiv.innerHTML = html;
        })
        .catch(erro => {
            console.error('Erro na busca de clientes:', erro);
            document.getElementById('resultado-busca').innerHTML =
                '<p class="text-danger">Erro ao buscar clientes. Tente novamente.</p>';
        });
}

/**
 * Busca clientes ao clicar no botão de busca
 */
function buscarClientes() {
    const termo = document.getElementById('busca-cliente').value.trim();
    if (termo.length > 0) {
        buscarClientesAjax(termo);
    }
}

/**
 * Exibe detalhes de um cliente em um modal
 * @param {number} clienteId - ID do cliente a ser exibido
 */
async function mostrarDetalhesCliente(clienteId) {
    try {
        const resposta = await fetch(`/clientes/${clienteId}`);
        if (!resposta.ok) {
            throw new Error('Cliente não encontrado');
        }

        const cliente = await resposta.json();
        carregarDetalhesCliente([
            cliente.id,
            cliente.nome,
            cliente.nome_fantasia,
            cliente.email,
            cliente.telefone
        ]);
    } catch (erro) {
        console.error('Erro ao buscar detalhes do cliente:', erro);
        exibirMensagem('Erro ao buscar detalhes do cliente', 'erro');
    }
}

/**
 * Verifica se o usuário é administrador após o login
 */
async function checkAdminStatus() {
    try {
        const response = await fetch('/auth/check-role');
        const data = await response.json();

        // Armazena o papel do usuário em sessionStorage para uso posterior
        sessionStorage.setItem('userRole', data.role);

        if (data.role === 'admin') {
            // Mostrar elementos para administradores
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';  // ou 'list-item' para itens de lista
            });

            // Verificar se o link para o Database Viewer existe e configurá-lo
            const dbViewerLink = document.getElementById('menu-db-viewer');
            if (dbViewerLink) {
                dbViewerLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    // Abrir o Database Viewer em uma nova janela
                    window.open('/db-viewer.html', '_blank');
                });
            }

            console.log('Configurações de administrador aplicadas');
        } else {
            // Esconder elementos admin
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    } catch (error) {
        console.error('Erro ao verificar papel do usuário:', error);
    }
}

/**
 * Carrega a página de gerenciamento de usuários
 */
function carregarUsuariosPage() {
    updateActiveMenu('usuarios');
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Gerenciamento de Usuários</h2>
                
                <!-- Toolbar moderna -->
                <div class="modern-toolbar">
                    <button id="btn-novo-usuario" class="btn btn-success" onclick="abrirModalNovoUsuario()">
                        <i class="bi bi-plus-lg"></i> Novo Usuário
                    </button>
                    <button id="btn-editar-usuario" class="btn btn-info" onclick="editarUsuarioSelecionado()" disabled>
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button id="btn-excluir-usuario" class="btn btn-danger" onclick="excluirUsuarioSelecionado()" disabled>
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>

                <!-- Tabela moderna -->
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Tipo</th>
                            <th>Data de Criação</th>
                        </tr>
                    </thead>
                    <tbody id="usuarios-list">
                        <!-- Dados serão renderizados aqui -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal para Novo/Editar Usuário (mantém o mesmo) -->
        <div class="modal fade" id="usuarioModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Novo Usuário</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="usuario-form">
                            <input type="hidden" id="usuario-id">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input type="text" class="form-control" id="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Senha</label>
                                <input type="password" class="form-control" id="password" required>
                            </div>
                            <div class="mb-3">
                                <label for="role" class="form-label">Tipo</label>
                                <select class="form-control" id="role" required>
                                    <option value="guest">Guest</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="salvarUsuario()">Salvar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    carregarUsuarios();
}

/**
 * Carrega a lista de usuários do sistema
 */
async function carregarUsuarios() {
    try {
        showLoading();
        const response = await fetch('/usuarios');
        if (!response.ok) {
            throw new Error('Falha ao carregar usuários');
        }
        const usuarios = await response.json();

        const tbody = document.getElementById('usuarios-list');
        tbody.innerHTML = usuarios.map(usuario => `
            <tr data-id="${usuario.id}" data-username="${usuario.username}" style="cursor:pointer;">
                <td>${usuario.username}</td>
                <td>${usuario.role}</td>
                <td>${new Date(usuario.created_at).toLocaleString()}</td>
            </tr>
        `).join('');

        // Adiciona eventos de clique nas linhas
        document.querySelectorAll("#usuarios-list tr").forEach(row => {
            row.addEventListener('click', function () {
                document.querySelectorAll("#usuarios-list tr").forEach(r => r.classList.remove('table-warning'));
                this.classList.add('table-warning');

                const username = this.getAttribute('data-username');
                const id = this.getAttribute('data-id');

                document.getElementById('btn-editar-usuario').disabled = false;

                // Desabilita o botão de excluir apenas para o admin
                document.getElementById('btn-excluir-usuario').disabled = (username === 'admin');

                selectedUserId = id;
                selectedUsername = username;
            });
        });

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        exibirMensagem('Erro ao carregar usuários: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Variáveis para controle de seleção de usuário
let selectedUserId = null;
let selectedUsername = null;

/**
 * Seleciona um usuário para edição
 */
function editarUsuarioSelecionado() {
    if (!selectedUserId) {
        exibirMensagem('Selecione um usuário para editar', 'erro');
        return;
    }
    editarUsuario(selectedUserId);
}

/**
 * Exclui o usuário selecionado após confirmação
 */
function excluirUsuarioSelecionado() {
    if (!selectedUserId) {
        exibirMensagem('Selecione um usuário para excluir', 'erro');
        return;
    }
    if (selectedUsername === 'admin') {
        exibirMensagem('O usuário admin não pode ser excluído', 'erro');
        return;
    }
    excluirUsuario(selectedUserId);
}

/**
 * Abre o modal para criar um novo usuário
 */
function abrirModalNovoUsuario() {
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-form').reset();
    document.querySelector('#usuarioModal .modal-title').textContent = 'Novo Usuário';
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

/**
 * Salva um usuário novo ou editado
 */
async function salvarUsuario() {
    const id = document.getElementById('usuario-id').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
        const url = id ? `/usuarios/${id}` : '/usuarios';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        if (response.ok) {
            exibirMensagem('Usuário salvo com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('usuarioModal')).hide();
            carregarUsuarios();
        } else {
            const error = await response.json();
            throw new Error(error.error);
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        exibirMensagem(error.message || 'Erro ao salvar usuário', 'erro');
    }
}

/**
 * Edita um usuário existente
 * @param {number} id - ID do usuário
 */
async function editarUsuario(id) {
    try {
        showLoading();
        const response = await fetch(`/usuarios/${id}`);

        // Verificar se foi redirecionado para login
        if (response.url.includes('login.html')) {
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Falha ao carregar usuário');
        }

        const usuario = await response.json();

        document.getElementById('usuario-id').value = usuario.id;
        document.getElementById('username').value = usuario.username;
        document.getElementById('role').value = usuario.role;
        document.getElementById('password').value = ''; // Não exibe a senha atual

        // Configura o modal baseado no tipo de usuário
        const usernameInput = document.getElementById('username');
        const roleSelect = document.getElementById('role');
        const modalTitle = document.querySelector('#usuarioModal .modal-title');

        if (usuario.username === 'admin') {
            // Para o admin, desabilita username e role, mostra apenas campo de senha
            usernameInput.value = 'admin';
            usernameInput.disabled = true;
            roleSelect.value = 'admin';
            roleSelect.disabled = true;
            modalTitle.textContent = 'Alterar Senha do Admin';
        } else {
            // Para outros usuários, habilita todos os campos
            usernameInput.disabled = false;
            roleSelect.disabled = false;
            modalTitle.textContent = 'Editar Usuário';
        }

        new bootstrap.Modal(document.getElementById('usuarioModal')).show();
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        exibirMensagem('Erro ao carregar usuário: ' + error.message, 'erro');
    } finally {
        hideLoading();
    }
}

/**
 * Exclui um usuário do sistema
 * @param {number} id - ID do usuário
 */
async function excluirUsuario(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
        const response = await fetch(`/usuarios/${id}`, { method: 'DELETE' });
        if (response.ok) {
            exibirMensagem('Usuário excluído com sucesso!');
            carregarUsuarios();
        } else {
            const error = await response.json();
            throw new Error(error.error);
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        exibirMensagem(error.message || 'Erro ao excluir usuário', 'erro');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus(); // Verifica se o usuário é admin ao carregar a página
});

/**
 * Abre o visualizador de banco de dados em uma nova janela/aba
 * Esta função só deve ser acessível por administradores
 */
function openDatabaseViewer() {
    // Verificar se o usuário é admin antes de abrir
    fetch('/auth/check-role')
        .then(response => response.json())
        .then(data => {
            if (data.role === 'admin') {
                window.open('/db-viewer.html', '_blank');
            } else {
                exibirMensagem('Apenas administradores podem acessar o Database Viewer', 'erro');
            }
        })
        .catch(error => {
            console.error('Erro ao verificar permissões:', error);
            exibirMensagem('Erro ao verificar permissões', 'erro');
        });
}

/**
 * Realiza o logout do usuário
 */
async function logout() {
    try {
        const response = await fetch('/auth/logout');
        if (response.ok) {
            window.location.href = '/login.html';
        } else {
            throw new Error('Falha ao fazer logout');
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        exibirMensagem('Erro ao fazer logout', 'erro');
    }
}

/**
 * Exibe informações do usuário logado na interface
 */
async function exibirInfoUsuario() {
    try {
        const response = await fetch('/auth/check-role');
        const data = await response.json();

        const usernameSpan = document.getElementById('usuario-logado');
        const roleSpan = document.getElementById('usuario-role');

        if (data.username && data.role) {
            usernameSpan.textContent = data.username;
            roleSpan.textContent = data.role;
            roleSpan.className = `badge rounded-pill bg-${data.role === 'admin' ? 'danger' : 'primary'}`;
        }
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}

/**
 * Reabre um chamado finalizado
 * @param {number} id - ID do chamado
 */
async function reabrirChamado(id) {
    // Adiciona confirmação antes de reabrir o chamado
    if (!confirm("Tem certeza que deseja reabrir este chamado?")) {
        return; // Se o usuário cancelar, interrompe a execução
    }

    try {
        showLoading();
        const response = await fetch(`/chamados/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'Aberto',
                data_fechamento: null
            })
        });

        const data = await response.json();
        hideLoading();

        if (response.ok) {
            exibirMensagem('Chamado reaberto com sucesso!');

            // Recarrega a lista de chamados após reabrir
            if (paginaAtual === 'chamados') {
                carregarChamados('Aberto');
                carregarChamados('Finalizado');
            } else if (paginaAtual === 'detalhesChamado') {
                carregarDetalhesChamadoPage(id);
            }
        } else {
            exibirMensagem(data.erro || 'Erro ao reabrir chamado', 'erro');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        exibirMensagem('Erro de conexão ao reabrir chamado', 'erro');
    }
}

// Função carregarChamadosFinalizados
function carregarChamadosFinalizados() {
    document.getElementById('chamados-content').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Chamados Finalizados</h2>
                
                <!-- Caixa de pesquisa para chamados -->
                <div class="modern-search mb-3">
                    <input type="text" id="pesquisa-chamados-finalizado" class="form-control" 
                        placeholder="Pesquisar por cliente, protocolo ou assunto...">
                </div>
                
                <!-- Toolbar moderna -->
                <div class="modern-toolbar">
                    <button id="btn-abrir" class="btn btn-info" onclick="abrirDetalhesChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-folder2-open"></i> Visualizar
                    </button>
                    <button id="btn-reabrir" class="btn btn-warning" onclick="reabrirChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-arrow-clockwise"></i> Reabrir
                    </button>
                    <button id="btn-excluir" class="btn btn-danger" onclick="excluirChamadoSelecionado()" disabled>
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>

                <!-- Tabela moderna -->
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>Protocolo</th>
                            <th>Cliente</th>
                            <th onclick="sortChamados('data')">Data</th>
                            <th>Assunto</th>
                            <th>Data Fechamento</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="chamados-finalizados">
                        <!-- Dados serão renderizados aqui -->
                    </tbody>
                </table>

                <!-- Paginação moderna -->
                <div class="modern-pagination">
                    <button id="btn-anterior-chamados-finalizado" onclick="paginaAnteriorChamados('Finalizado')">
                        <i class="bi bi-chevron-left"></i> Anterior
                    </button>
                    <span class="page-info" id="pagina-atual-chamados-finalizado">
                        Página ${paginaAtualChamadosFinalizados}
                    </span>
                    <button id="btn-proximo-chamados-finalizado" onclick="proximaPaginaChamados('Finalizado')">
                        Próxima <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    carregarChamados('Finalizado');

    // Configurar a pesquisa de chamados finalizados
    configurarPesquisaChamados('finalizado');
}

if (status === 'Finalizado') {
    document.querySelectorAll("#chamados-finalizados tr").forEach(row => {
        row.addEventListener('click', function () {
            document.querySelectorAll("#chamados-finalizados tr").forEach(r => r.classList.remove('table-warning'));
            this.classList.add('table-warning');
            selectedChamadoId = this.getAttribute('data-id');

            // Habilita os botões quando um chamado é selecionado
            document.getElementById('btn-abrir').disabled = false;
            document.getElementById('btn-reabrir').disabled = false;
            document.getElementById('btn-excluir').disabled = false;
        });
    });
}

/**
 * Exibe detalhes de um cliente em um modal
 * @param {number} clienteId - ID do cliente a ser exibido
 */
async function mostrarDetalhesCliente(clienteId) {
    try {
        const response = await fetch(`/clientes/${clienteId}`);
        if (!response.ok) {
            throw new Error('Cliente não encontrado');
        }

        const cliente = await response.json();

        // Cria um modal dinamicamente com dropdown em vez de tabs
        const modalHtml = `
            <div class="modal fade" id="clienteDetalhesModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalhes do Cliente #${cliente.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Dropdown para selecionar a seção -->
                            <div class="mb-3">
                                <select class="form-select" id="cliente-secao-dropdown" onchange="alternarSecaoCliente(this.value)">
                                    <option value="dados-cliente">Dados Principais</option>
                                    <option value="dados-complementares">Dados Complementares</option>
                                    <option value="documentos">Documentos</option>
                                    <option value="endereco-cliente">Endereço</option>
                                    <option value="notas">Informações Adicionais</option>
                                </select>
                            </div>

                            <!-- Conteúdo das seções -->
                            <div id="secao-cliente-conteudo">
                                <!-- Dados Principais (visível por padrão) -->
                                <div id="dados-cliente" class="secao-cliente">
                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <strong>Razão Social/Nome:</strong><br>
                                            ${cliente.nome || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Nome Fantasia:</strong><br>
                                            ${cliente.nome_fantasia || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Email:</strong><br>
                                            ${cliente.email || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Telefone:</strong><br>
                                            ${cliente.telefone || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Tipo Cliente:</strong><br>
                                            ${cliente.tipo_cliente || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Status Ativo:</strong><br>
                                            ${cliente.ativo || ''}
                                        </div>
                                    </div>
                                </div>

                                <!-- Dados Complementares (inicialmente oculto) -->
                                <div id="dados-complementares" class="secao-cliente" style="display: none;">
                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <strong>Nacionalidade:</strong><br>
                                            ${cliente.nacionalidade || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Naturalidade:</strong><br>
                                            ${cliente.naturalidade || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Estado de Nascimento:</strong><br>
                                            ${cliente.estado_nascimento || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Data de Nascimento:</strong><br>
                                            ${cliente.data_nascimento || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Sexo:</strong><br>
                                            ${cliente.sexo || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Profissão:</strong><br>
                                            ${cliente.profissao || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Estado Civil:</strong><br>
                                            ${cliente.estado_civil || ''}
                                        </div>
                                    </div>
                                </div>

                                <!-- Documentos (inicialmente oculto) -->
                                <div id="documentos" class="secao-cliente" style="display: none;">
                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <strong>CNPJ/CPF:</strong><br>
                                            ${cliente.cnpj_cpf || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>IE/RG:</strong><br>
                                            ${cliente.ie_rg || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Contribuinte ICMS:</strong><br>
                                            ${cliente.contribuinte_icms || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>RG Órgão Emissor:</strong><br>
                                            ${cliente.rg_orgao_emissor || ''}
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <strong>Inscrição Municipal:</strong><br>
                                            ${cliente.inscricao_municipal || ''}
                                        </div>
                                    </div>
                                </div>

                                <!-- Endereço (inicialmente oculto) -->
                                <div id="endereco-cliente" class="secao-cliente" style="display: none;">
                                    <div class="row">
                                        <div class="col-md-4 mb-2">
                                            <strong>CEP:</strong><br>
                                            ${cliente.cep || ''}
                                        </div>
                                        <div class="col-md-8 mb-2">
                                            <strong>Rua:</strong><br>
                                            ${cliente.rua || ''}
                                        </div>
                                        <div class="col-md-4 mb-2">
                                            <strong>Número:</strong><br>
                                            ${cliente.numero || ''}
                                        </div>
                                        <div class="col-md-8 mb-2">
                                            <strong>Complemento:</strong><br>
                                            ${cliente.complemento || ''}
                                        </div>
                                        <div class="col-md-4 mb-2">
                                            <strong>Bairro:</strong><br>
                                            ${cliente.bairro || ''}
                                        </div>
                                        <div class="col-md-4 mb-2">
                                            <strong>Cidade:</strong><br>
                                            ${cliente.cidade || ''}
                                        </div>
                                        <div class="col-md-2 mb-2">
                                            <strong>Estado:</strong><br>
                                            ${cliente.estado || ''}
                                        </div>
                                        <div class="col-md-2 mb-2">
                                            <strong>País:</strong><br>
                                            ${cliente.pais || ''}
                                        </div>
                                        <!-- Botão para Google Maps - CORRIGIDO -->
                                        <div class="col-12 mt-2">
                                            <button type="button" class="btn btn-sm btn-primary" 
                                                    onclick="abrirMapaCliente('${cliente.rua || ''} ${cliente.numero || ''}, ${cliente.bairro || ''}, ${cliente.cidade || ''} ${cliente.estado || ''}')">
                                                <i class="bi bi-map"></i> Ver no Google Maps
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Informações Adicionais (inicialmente oculto) -->
                                <div id="notas" class="secao-cliente" style="display: none;">
                                    <div class="notes-container">
                                        <div class="form-group">
                                            <div id="cliente-notas-view" class="form-control" style="min-height: 150px; overflow-y: auto;">
                                                ${cliente.notas || 'Nenhuma informação adicional cadastrada.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove o modal existente, se houver
        const existingModal = document.getElementById('clienteDetalhesModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Adiciona o modal ao documento
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Adiciona um atributo data-cliente-id ao modal para o client-notes.js poder acessar
        document.getElementById('clienteDetalhesModal').setAttribute('data-cliente-id', cliente.id);

        // Adiciona um listener para quando o dropdown for alterado para Informações Adicionais
        document.getElementById('cliente-secao-dropdown').addEventListener('change', function (e) {
            if (e.target.value === 'notas') {
                // Atualiza o conteúdo das notas diretamente (sem usar o editor)
                fetch(`/clientes/${cliente.id}/notas`)
                    .then(response => response.json())
                    .then(data => {
                        const notasView = document.getElementById('cliente-notas-view');
                        if (notasView) {
                            // Usar innerHTML para preservar a formatação HTML
                            notasView.innerHTML = data.notas || 'Nenhuma informação adicional cadastrada.';
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar notas:', error);
                    });
            }
        });

        // Mostra o modal
        const modal = new bootstrap.Modal(document.getElementById('clienteDetalhesModal'));
        modal.show();

    } catch (erro) {
        console.error('Erro ao carregar detalhes do cliente:', erro);
        exibirMensagem('Erro ao carregar detalhes do cliente', 'erro');
    }
}

/**
 * Alterna entre as seções do cliente no modal
 * @param {string} secaoId - ID da seção a ser exibida
 */
function alternarSecaoCliente(secaoId) {
    // Oculta todas as seções
    document.querySelectorAll('.secao-cliente').forEach(secao => {
        secao.style.display = 'none';
    });

    // Exibe a seção selecionada
    document.getElementById(secaoId).style.display = 'block';
}

/**
 * Abre o endereço do cliente no Google Maps
 * @param {string} endereco - Endereço completo do cliente
 */
function abrirMapaCliente(endereco) {
    if (!endereco || endereco.trim() === '') {
        exibirMensagem('Endereço incompleto para abrir no mapa', 'erro');
        return;
    }

    // Abre uma nova aba com o Google Maps usando o endereço do cliente
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
}

/**
 * Carrega a página de agenda de visitas
 */
function carregarAgendaPage() {
    updateActiveMenu('agenda');  // Add this line if it's not already present
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2>Agenda de Visitas Técnicas</h2>
                <div id="calendario"></div>
            </div>
        </div>
    `;
    configurarCalendario();
}

// Variável para armazenar o ID do agendamento atual
let currentAgendamentoId = null;

// Cache para armazenar instâncias de tooltips
const tooltipCache = new Map();

/**
 * Remove todos os tooltips ativos
 */
function destroyAllTooltips() {
    tooltipCache.forEach(tooltip => tooltip.destroy());
    tooltipCache.clear();
}

/**
 * Cria ou obtém um tooltip do cache
 * @param {HTMLElement} element - Elemento para adicionar o tooltip
 * @param {string} content - Conteúdo do tooltip
 * @returns {object} Instância do tooltip
 */
function getOrCreateTooltip(element, content) {
    if (tooltipCache.has(element)) {
        const tooltip = tooltipCache.get(element);
        tooltip.setContent(content);
        return tooltip;
    }

    const tooltip = tippy(element, {
        content: content,
        theme: 'light',
        animation: 'shift-away',
        interactive: true,
        appendTo: document.body,
        placement: 'top',
        arrow: true,
        maxWidth: 300,
        allowHTML: true,
        trigger: 'mouseenter',
        hideOnClick: false,
        onHide(instance) {
            // Previne que o tooltip fique preso na tela
            instance.setContent(instance.props.content);
        },
        onDestroy() {
            tooltipCache.delete(element);
        }
    });

    tooltipCache.set(element, tooltip);
    return tooltip;
}

/**
 * Formata o conteúdo do tooltip para agendamentos
 * @param {object} event - Evento do agendamento
 * @returns {string} HTML formatado para o tooltip
 */
function formatarTooltipAgendamento(event) {
    const props = event.extendedProps;
    return `
        <div class="agenda-tooltip">
            <div class="tooltip-header">
                <strong>${props.protocolo || 'N/A'}</strong>
            </div>
            <div class="tooltip-body">
                <p><strong>Cliente:</strong> ${props.cliente_nome || 'N/A'}</p>
                <p><strong>Assunto:</strong> ${props.assunto || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${props.cliente_telefone || 'N/A'}</p>
                <p><strong>Endereço:</strong> ${props.endereco || 'Não disponível'}</p>
            </div>
        </div>
    `;
}

/**
 * Recria os tooltips após mudanças no calendário
 */
function recriarTooltips() {
    const events = document.querySelectorAll('.fc-event');
    events.forEach(eventEl => {
        const fcEvent = calendar.getEventById(eventEl.getAttribute('data-event-id'));
        if (fcEvent) {
            getOrCreateTooltip(eventEl, formatarTooltipAgendamento(fcEvent));
        }
    });
}

/**
 * Configura o calendário para exibição dos agendamentos
 */
function configurarCalendario() {
    var calendarEl = document.getElementById('calendario');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'pt-br',
        timeZone: 'America/Sao_Paulo',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        selectable: true,
        selectMirror: true,
        editable: true,
        allDaySlot: false,
        forceEventDuration: true,
        defaultTimedEventDuration: '01:00:00',

        // handler de seleção para abrir o modal de agendamento
        select: function (info) {
            // Formata as datas para o formato esperado pelo input datetime-local
            const startStr = info.start.toISOString().slice(0, 16);
            const endStr = info.end ? info.end.toISOString().slice(0, 16) :
                new Date(info.start.getTime() + 60 * 60000).toISOString().slice(0, 16);

            // Abre o modal de agendamento com as datas selecionadas
            abrirModalAgendamento(startStr, endStr);
        },

        eventClick: function (info) {
            abrirModalDetalhesAgendamento(info.event);
        },

        eventDrop: async function (info) {
            try {
                await fetch(`/agendamentos/${info.event.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data_agendamento: info.event.start.toISOString(),
                        data_final_agendamento: info.event.end.toISOString()
                    })
                });
                exibirMensagem('Agendamento atualizado com sucesso!');

                // Recria os tooltips após o drop
                setTimeout(recriarTooltips, 100);
                refreshCalendar(); // Refresh calendar after drop
            } catch (erro) {
                console.error('Erro ao atualizar agendamento:', erro);
                exibirMensagem('Erro ao atualizar agendamento', 'erro');
                info.revert();
            }
        },

        eventResize: async function (info) {
            try {
                await fetch(`/agendamentos/${info.event.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data_agendamento: info.event.start.toISOString(),
                        data_final_agendamento: info.event.end.toISOString()
                    })
                });
                exibirMensagem('Agendamento atualizado com sucesso!');
                // Recria os tooltips após o resize
                setTimeout(recriarTooltips, 100);
                refreshCalendar(); // Refresh calendar after resize
            } catch (erro) {
                console.error('Erro ao atualizar agendamento:', erro);
                exibirMensagem('Erro ao atualizar agendamento', 'erro');
                info.revert();
            }
        },

        events: function (fetchInfo, successCallback, failureCallback) {
            carregarAgendamentos(successCallback, failureCallback);
        },

        eventDidMount: function (info) {
            info.el.setAttribute('data-event-id', info.event.id);
            const tooltip = getOrCreateTooltip(
                info.el,
                formatarTooltipAgendamento(info.event)
            );
        },

        eventWillUnmount: function (info) {
            const tooltip = tooltipCache.get(info.el);
            if (tooltip) {
                tooltip.destroy();
            }
        },

        eventMouseLeave: function (info) {
            const tooltip = tooltipCache.get(info.el);
            if (tooltip) {
                tooltip.hide();
            }
        },

        eventDragStart: function () {
            destroyAllTooltips();
        },

        eventResizeStart: function () {
            destroyAllTooltips();
        },
    });

    // Salva a referência ao calendário globalmente
    window.calendar = calendar;

    calendar.render();
}

/**
 * Atualiza a visualização do calendário
 */
function refreshCalendar() {
    setTimeout(() => {
        carregarAgendaPage();
    }, 300);
}

// Adicionar limpeza de tooltips quando os modais são abertos/fechados
document.addEventListener('DOMContentLoaded', function () {
    ['agendamentoModal', 'agendamentoDetalhesModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('show.bs.modal', destroyAllTooltips);
            modal.addEventListener('hidden.bs.modal', () => {
                setTimeout(() => {
                    const calendarEl = document.getElementById('calendario');
                    if (calendarEl && calendarEl.fullCalendar) {
                        calendarEl.fullCalendar.render();
                    }
                }, 100);
            });
        }
    });
});

/**
 * Abre o modal de agendamento com datas específicas
 * @param {string} startStr - Data/hora inicial formatada
 * @param {string} endStr - Data/hora final formatada
 */
function abrirModalAgendamento(startStr, endStr) {
    // Limpar todos os campos do formulário
    document.getElementById('agendamentoForm').reset();

    // Limpar explicitamente o campo de observações (para garantir)
    document.getElementById('observacoes_agendamento').value = '';

    // Limpar a lista de chamados e o chamado selecionado
    document.getElementById('lista-chamados').innerHTML = '';
    document.getElementById('chamado-selecionado').classList.add('d-none');
    document.getElementById('chamado-selecionado').innerHTML = '';

    // Agora atribuir os novos valores das datas
    document.getElementById('data_agendamento').value = startStr;
    document.getElementById('data_final_agendamento').value = endStr;

    // Configurar o campo de busca de chamados
    configurarBuscaChamadosAgendamento();

    // Configurar o botão de salvar
    document.getElementById('salvarAgendamento').onclick = salvarAgendamento;

    // Mostrar o modal
    const modal = new bootstrap.Modal(document.getElementById('agendamentoModal'));
    modal.show();
}

/**
 * Configura o campo de busca de chamados no modal de agendamento
 */
function configurarBuscaChamadosAgendamento() {
    const buscaChamadoInput = document.getElementById('busca-chamado');
    const listaChamadosDiv = document.getElementById('lista-chamados');
    const chamadoSelecionadoDiv = document.getElementById('chamado-selecionado');
    let timeoutId;

    // Função para buscar chamados
    async function buscarChamados(termo) {
        try {
            if (!termo || termo.trim().length < 2) {
                listaChamadosDiv.innerHTML = '';
                listaChamadosDiv.classList.remove('show');
                return;
            }

            const response = await fetch(`/chamados/buscar-abertos?termo=${encodeURIComponent(termo)}`);
            if (!response.ok) {
                throw new Error('Falha ao buscar chamados');
            }

            const chamados = await response.json();

            if (chamados.length === 0) {
                listaChamadosDiv.innerHTML = '<div class="list-group-item">Nenhum chamado encontrado</div>';
                listaChamadosDiv.classList.add('show');
                return;
            }

            const chamadosHtml = chamados.map(chamado => `
                <a href="#" class="list-group-item list-group-item-action" 
                    data-id="${chamado.id}" 
                    data-protocolo="${chamado.protocolo}"
                    data-assunto="${chamado.assunto || ''}"
                    data-cliente="${chamado.cliente_nome || 'Cliente removido'}">
                    ${chamado.protocolo} - ${chamado.cliente_nome || 'Cliente removido'} - ${chamado.assunto || 'Sem assunto'}
                </a>
            `).join('');

            listaChamadosDiv.innerHTML = chamadosHtml;
            listaChamadosDiv.classList.add('show');
        } catch (error) {
            console.error('Erro na busca de chamados:', error);
            listaChamadosDiv.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar chamados</div>';
            listaChamadosDiv.classList.add('show');
        }
    }

    // Event listener para o input de busca
    buscaChamadoInput.addEventListener('input', function () {
        clearTimeout(timeoutId);
        const termo = this.value.trim();

        // Só busca se tiver pelo menos 2 caracteres
        if (termo.length >= 2) {
            timeoutId = setTimeout(() => {
                buscarChamados(termo);
            }, 300);
        } else {
            listaChamadosDiv.innerHTML = '';
            listaChamadosDiv.classList.remove('show');
        }
    });

    // Event listener para selecionar um chamado
    listaChamadosDiv.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const chamadoId = e.target.dataset.id;
            const protocolo = e.target.dataset.protocolo;
            const assunto = e.target.dataset.assunto;
            const cliente = e.target.dataset.cliente;

            buscaChamadoInput.value = `${protocolo} - ${cliente}`;
            buscaChamadoInput.dataset.chamadoId = chamadoId;

            // Mostrar detalhes do chamado selecionado
            chamadoSelecionadoDiv.innerHTML = `
                <p><strong>Protocolo:</strong> ${protocolo}</p>
                <p><strong>Cliente:</strong> ${cliente}</p>
                <p><strong>Assunto:</strong> ${assunto}</p>
            `;
            chamadoSelecionadoDiv.classList.remove('d-none');

            // Esconde a lista de resultados
            listaChamadosDiv.classList.remove('show');
        }
    });

    // Esconde a lista quando clicar fora
    document.addEventListener('click', function (e) {
        if (!e.target.closest('#lista-chamados') && !e.target.closest('#busca-chamado')) {
            listaChamadosDiv.classList.remove('show');
        }
    });

    // Previne o fechamento da lista ao clicar nela
    listaChamadosDiv.addEventListener('click', function (e) {
        e.stopPropagation();
    });
}

/**
 * Salva um novo agendamento
 */
async function salvarAgendamento() {
    try {
        const chamadoId = document.getElementById('busca-chamado').dataset.chamadoId;
        const dataAgendamento = document.getElementById('data_agendamento').value;
        const dataFinalAgendamento = document.getElementById('data_final_agendamento').value;

        // Verificações de validação
        if (!chamadoId) {
            exibirMensagem('Selecione um chamado', 'erro');
            return;
        }

        if (!dataAgendamento || !dataFinalAgendamento) {
            exibirMensagem('Preencha as datas de início e fim', 'erro');
            return;
        }

        // Mostra a tela de carregamento
        showLoading();

        // Envia os dados para o servidor
        const response = await fetch('/agendamentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chamado_id: parseInt(chamadoId),
                data_agendamento: dataAgendamento,
                data_final_agendamento: dataFinalAgendamento,
                observacoes: document.getElementById('observacoes_agendamento')?.value || ''
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || 'Erro ao criar agendamento');
        }

        // Exibe mensagem de sucesso
        exibirMensagem('Agendamento criado com sucesso!');

        // Fecha o modal
        bootstrap.Modal.getInstance(document.getElementById('agendamentoModal')).hide();

        // Atualiza o calendário
        const calendarEl = document.getElementById('calendario');
        if (calendarEl && calendarEl.fullCalendar) {
            calendarEl.fullCalendar.refetchEvents();
        }
        refreshCalendar(); // Refresh calendar after saving

    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        exibirMensagem(error.message || 'Erro ao salvar agendamento', 'erro');
    } finally {
        // Esconde a tela de carregamento
        hideLoading();
    }
}

/**
 * Carrega os agendamentos da API
 * @param {Function} successCallback - Função de sucesso
 * @param {Function} failureCallback - Função de falha
 */
async function carregarAgendamentos(successCallback, failureCallback) {
    try {
        const response = await fetch('/agendamentos');
        if (!response.ok) {
            throw new Error('Falha ao carregar agendamentos');
        }

        const agendamentos = await response.json();

        // Converte os agendamentos para o formato que o FullCalendar espera
        const eventos = agendamentos.map(agendamento => {
            const titulo = `Visita Técnica - ${agendamento.protocolo}`;
            const status = agendamento.chamado_status || 'Aberto';

            // Define a cor com base no status
            let backgroundColor = '#0d6efd'; // Azul para agendamentos normais
            let borderColor = '#0a58ca';

            if (status === 'Finalizado') {
                backgroundColor = '#28a745'; // Verde para agendamentos finalizados
                borderColor = '#1e7e34';
            }

            // Cria a descrição formatada para exibir no calendário
            const description = `
                <strong>Cliente:</strong> ${agendamento.cliente_nome}<br>
                <strong>Assunto:</strong> ${agendamento.assunto || 'N/A'}<br>
                <strong>Endereço:</strong> ${agendamento.endereco || 'N/A'}<br>
                <strong>Telefone:</strong> ${agendamento.cliente_telefone || 'N/A'}
            `;

            return {
                id: agendamento.id,
                title: titulo,
                start: agendamento.data_agendamento,
                end: agendamento.data_final_agendamento,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                extendedProps: {
                    protocolo: agendamento.protocolo,
                    cliente_nome: agendamento.cliente_nome,
                    assunto: agendamento.assunto,
                    cliente_telefone: agendamento.cliente_telefone,
                    endereco: agendamento.endereco,
                    chamado_id: agendamento.chamado_id
                }
            };
        });

        successCallback(eventos);
    } catch (erro) {
        console.error('Erro ao carregar agendamentos:', erro);
        failureCallback(erro);
    }
}

/**
 * Abre o modal para finalizar um chamado via agendamento
 * @param {object} event - Evento do agendamento
 */
function abrirModalFinalizarChamado(event) {
    const chamadoId = event.extendedProps.chamado_id;
    currentAgendamentoId = event.id; // Armazena o ID do agendamento atual
    const modalFinalizar = new bootstrap.Modal(document.getElementById('finalizarChamadoModal'));

    // Clear previous data
    document.getElementById('relatorio_visita').value = '';
    modalFinalizar.show();

    document.getElementById('salvarFinalizacao').onclick = async function () {
        const relatorioVisita = document.getElementById('relatorio_visita').value;
        if (!relatorioVisita) {
            exibirMensagem('Preencha o relatório da visita!', 'erro');
            return;
        }

        try {
            // Adicionar andamento e finalizar chamado
            const resposta = await fetch(`/chamados/${chamadoId}/finalizar-ordem-servico`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    relatorio_visita: relatorioVisita
                })
            });

            if (resposta.ok) {
                exibirMensagem('Chamado finalizado com sucesso!');
                modalFinalizar.hide();
                configurarCalendario(); // Recarrega a agenda
            } else {
                const erro = await resposta.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao finalizar chamado:', erro);
            exibirMensagem('Erro ao finalizar chamado', 'erro');
        }
    };
}

/**
 * Exclui um agendamento da agenda
 * @param {number} agendamentoId - ID do agendamento
 */
async function excluirAgendamento(agendamentoId) {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        try {
            const resposta = await fetch(`/agendamentos/${agendamentoId}`, {
                method: 'DELETE'
            });

            if (resposta.ok) {
                exibirMensagem('Agendamento excluído com sucesso!');
                configurarCalendario(); // Recarrega a agenda
            } else {
                const erro = await resposta.json();
                exibirMensagem(`Erro: ${erro.erro}`, 'erro');
            }
        } catch (erro) {
            console.error('Erro ao excluir agendamento:', erro);
            exibirMensagem('Erro ao excluir agendamento', 'erro');
        }
    }
}

// Add function to handle scheduling deletion
async function excluirAgendamentoAtual() {
    if (!currentAgendamentoId) {
        exibirMensagem('Erro: Agendamento não identificado', 'erro');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        try {
            const response = await fetch(`/agendamentos/${currentAgendamentoId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                exibirMensagem('Agendamento excluído com sucesso');
                const modalFinalizacao = bootstrap.Modal.getInstance(document.getElementById('finalizarChamadoModal'));
                modalFinalizacao.hide();

                // Atualiza o calendário
                const calendar = document.querySelector('#calendario').FullCalendar;
                if (calendar) {
                    calendar.refetchEvents();
                } else {
                    carregarAgendaPage();
                }
            } else {
                const data = await response.json();
                exibirMensagem(data.erro || 'Erro ao excluir agendamento', 'erro');
            }
        } catch (erro) {
            console.error('Erro ao excluir agendamento:', erro);
            exibirMensagem('Erro ao excluir agendamento', 'erro');
        }
    }
}

document.getElementById('salvarFinalizacao').onclick = async function () {
    const relatorio = document.getElementById('relatorio_visita').value;
    if (!relatorio) {
        alert('Por favor, preencha o relatório da visita.');
        return;
    }

    try {
        const chamadoId = currentChamadoId;
        const agendamentoId = currentAgendamentoId;

        // Finaliza a ordem de serviço
        const response = await fetch(`/chamados/${chamadoId}/finalizar-ordem-servico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ relatorio_visita: relatorio })
        });

        if (!response.ok) {
            throw new Error('Erro ao finalizar ordem de serviço');
        }

        // Após finalizar com sucesso
        const modal = bootstrap.Modal.getInstance(document.getElementById('finalizarChamadoModal'));
        modal.hide();

        // Atualiza o calendário
        const calendarEl = document.getElementById('calendario');
        if (calendarEl) {
            const calendar = calendarEl.fullCalendar;
            if (calendar) {
                // Encontra o evento e atualiza sua cor
                const event = calendar.getEventById(agendamentoId);
                if (event) {
                    event.setProp('backgroundColor', '#28a745'); // Verde para finalizado
                    event.setProp('borderColor', '#28a745');
                }
            }
        }
        refreshCalendar(); // Atualiza o calendário após a exclusão
        exibirMensagem('Ordem de serviço finalizada com sucesso!', 'sucesso');

        // Limpa o formulário
        document.getElementById('relatorio_visita').value = '';

    } catch (erro) {
        console.error('Erro ao finalizar ordem de serviço:', erro);
        exibirMensagem('Erro ao finalizar ordem de serviço', 'erro');
    }
};

/**
 * Abre o modal de detalhes do agendamento
 * @param {object} event - Evento do agendamento
 */
async function abrirModalDetalhesAgendamento(event) {
    try {
        currentAgendamentoId = event.id;
        const chamadoId = event.extendedProps.chamado_id;

        // Obtém os detalhes completos do agendamento
        const response = await fetch(`/agendamentos/${event.id}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar detalhes do agendamento');
        }

        const agendamento = await response.json();

        // Atualiza os detalhes no modal
        document.getElementById('detalhe-protocolo').textContent = agendamento.protocolo || 'N/A';
        document.getElementById('detalhe-cliente').textContent = agendamento.cliente_nome || 'Cliente removido';
        document.getElementById('detalhe-assunto').textContent = agendamento.assunto || 'N/A';
        document.getElementById('detalhe-telefone').textContent = agendamento.cliente_telefone || 'N/A';
        document.getElementById('detalhe-endereco').textContent = agendamento.endereco || 'Endereço não disponível';
        document.getElementById('detalhe-status').textContent = agendamento.chamado_status || 'N/A';

        // Formatando as datas para exibição
        const dataInicio = new Date(agendamento.data_agendamento);
        const dataFim = new Date(agendamento.data_final_agendamento);

        document.getElementById('detalhe-data').textContent = dataInicio.toLocaleString('pt-BR');
        document.getElementById('detalhe-data-fim').textContent = dataFim.toLocaleString('pt-BR');

        // Exibe a descrição do chamado
        document.getElementById('detalhe-descricao').textContent = agendamento.descricao || 'Sem descrição';

        // Exibe as observações do agendamento
        document.getElementById('detalhe-observacoes').textContent = agendamento.observacoes || 'Sem observações';

        // Configura os IDs para o botão de finalização
        document.getElementById('detalhe-chamado-id').value = chamadoId;
        document.getElementById('detalhe-agendamento-id').value = event.id;

        // Ajusta a visibilidade dos botões conforme o status do chamado
        const isFinalizado = agendamento.chamado_status === 'Finalizado';
        document.getElementById('detalhe-section-finalizacao').style.display = isFinalizado ? 'none' : 'block';
        document.getElementById('detalhe-btn-finalizar').style.display = isFinalizado ? 'none' : 'block';
        document.getElementById('detalhe-finalizado-msg').style.display = isFinalizado ? 'block' : 'none';
        document.getElementById('relatorio_visita').value = '';

        // Abre o modal
        const detalhesModal = new bootstrap.Modal(document.getElementById('agendamentoDetalhesModal'));

        // Adiciona listener para quando o modal for fechado
        document.getElementById('agendamentoDetalhesModal').addEventListener('hidden.bs.modal', function () {
            setTimeout(recriarTooltips, 100);
        });

        detalhesModal.show();

    } catch (error) {
        console.error('Erro:', error);
        exibirMensagem('Erro ao carregar detalhes do agendamento', 'erro');
    }
}

/**
 * Finaliza o chamado e agendamento a partir do modal de detalhes
 */
async function finalizarOrdemServicoModal() {
    try {
        // Adicione logs para depuração
        console.log('Iniciando finalização de ordem de serviço');

        // Identificar corretamente o elemento de texto usando o contexto do modal
        const modal = document.getElementById('agendamentoDetalhesModal');
        const relatorioTextarea = modal.querySelector('#relatorio_visita');

        if (!relatorioTextarea) {
            console.error('Campo de relatório não encontrado!');
            exibirMensagem('Erro: campo de relatório não encontrado', 'erro');
            return;
        }

        // Capturar e validar o valor
        const relatorio = relatorioTextarea.value.trim();
        console.log('Valor do relatório capturado:', relatorio, 'Comprimento:', relatorio.length);

        const chamadoId = document.getElementById('detalhe-chamado-id').value;
        const agendamentoId = document.getElementById('detalhe-agendamento-id').value;

        // Validação mais robusta
        if (!relatorio || relatorio.length === 0) {
            console.error('Relatório vazio ou somente espaços');
            exibirMensagem('O relatório da visita é obrigatório', 'erro');
            return;
        }

        // Preparar dados para envio explicitamente
        const dadosEnvio = {
            relatorio_visita: relatorio,
            agendamento_id: agendamentoId
        };

        console.log('Dados a enviar:', dadosEnvio);

        const response = await fetch(`/chamados/${chamadoId}/finalizar-ordem-servico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosEnvio)
        });

        const data = await response.json();
        console.log('Resposta recebida:', data);

        if (response.ok) {
            exibirMensagem('Ordem de serviço finalizada com sucesso!', 'sucesso');
            // Fecha o modal
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('agendamentoDetalhesModal'));
            modalInstance.hide();
            // Atualiza o calendário
            refreshCalendar();
        } else {
            throw new Error(data.erro || 'Erro ao finalizar ordem de serviço');
        }
    } catch (error) {
        console.error('Erro ao finalizar ordem de serviço:', error);
        exibirMensagem('Erro ao finalizar ordem de serviço: ' + error.message, 'erro');
    }
}

/**
 * Exclui o agendamento a partir do modal de detalhes
 */
async function excluirAgendamentoModal() {
    const agendamentoId = document.getElementById('detalhe-agendamento-id').value;

    if (!agendamentoId) {
        exibirMensagem('ID do agendamento não encontrado', 'erro');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        try {
            showLoading();

            const response = await fetch(`/agendamentos/${agendamentoId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir agendamento');
            }

            // Fecha o modal
            bootstrap.Modal.getInstance(document.getElementById('agendamentoDetalhesModal')).hide();

            // Recarrega o calendário
            const calendarEl = document.getElementById('calendario');
            if (calendarEl && calendarEl.fullCalendar) {
                calendarEl.fullCalendar.refetchEvents();
            }

            exibirMensagem('Agendamento excluído com sucesso!', 'sucesso');
            refreshCalendar(); // Refresh calendar after deletion
        } catch (error) {
            console.error('Erro:', error);
            exibirMensagem('Erro ao excluir agendamento', 'erro');
        } finally {
            hideLoading();
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {

    // Adicione este bloco para garantir a limpeza ao fechar o modal
    const agendamentoModal = document.getElementById('agendamentoModal');
    if (agendamentoModal) {
        agendamentoModal.addEventListener('hidden.bs.modal', function () {
            // Limpar o formulário quando o modal é fechado
            document.getElementById('agendamentoForm').reset();
            document.getElementById('observacoes_agendamento').value = '';
            document.getElementById('lista-chamados').innerHTML = '';
            document.getElementById('chamado-selecionado').classList.add('d-none');
            document.getElementById('chamado-selecionado').innerHTML = '';
        });
    }

});

// Função para exibir notificação de backup
function exibirNotificacaoBackup(backupInfo) {
    if (!backupInfo) return;

    const mensagemDiv = document.getElementById('mensagem');
    const tipo = backupInfo.realizado ? 'success' : 'info';
    const icone = backupInfo.realizado ? 'check-circle' : 'info-circle';

    // Se foi realizado backup, exibe uma mensagem mais destacada
    if (backupInfo.realizado) {
        mensagemDiv.innerHTML = `
            <i class="bi bi-${icone}"></i> 
            <strong>Backup do sistema:</strong> ${backupInfo.mensagem}
        `;
        mensagemDiv.className = `alert alert-${tipo}`;
        mensagemDiv.style.display = 'block';

        // Mantém a mensagem por 6 segundos
        setTimeout(() => {
            mensagemDiv.style.display = 'none';
        }, 6000);
    } else {
        // Se o backup não foi feito, registra no console
        console.info('Sistema de backup:', backupInfo.mensagem);
    }
}

/**
 * Carrega as informações dos backups do sistema (apenas para administradores)
 */
async function carregarInfoBackups() {
    try {
        const response = await fetch('/system/backups');

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            return data;
        } else {
            console.error('Erro ao carregar informações de backup:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Erro ao carregar informações de backup:', error);
        return null;
    }
}

// Modifica a função auth_login original para processar a resposta de backup
document.addEventListener('DOMContentLoaded', () => {
    // Aplicação do tema atual
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    carregarHome();
    startAutoRefresh();
    exibirInfoUsuario();
    checkAdminStatus();
    startSessionMonitor();
});

// Modificar a página de login para processar informações de backup após o login bem-sucedido
async function handleLogin(e) {
    e.preventDefault();

    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validação básica
    if (!username || !password) {
        errorDiv.textContent = 'Usuário e senha são obrigatórios';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
        errorDiv.style.display = 'none';

        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Armazena informações de backup se houver
            if (data.backup_info) {
                localStorage.setItem('backup_info', JSON.stringify(data.backup_info));
            }
            // Redireciona para a página principal
            window.location.href = '/';
        } else {
            errorDiv.textContent = data.error || 'Credenciais inválidas';
            errorDiv.style.display = 'block';
            // Limpa apenas a senha em caso de erro
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Erro de login:', error);
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.style.display = 'block';
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLogin); // Remove handler anterior se existir
        loginForm.addEventListener('submit', handleLogin); // Adiciona o novo handler
    }

});


// Adicionar às funções executadas após o carregamento do DOM
document.addEventListener('DOMContentLoaded', function () {
    // Verificar se há informações de backup no localStorage
    const backupInfo = localStorage.getItem('backup_info');
    if (backupInfo) {
        // Exibe a notificação e remove a informação do localStorage
        exibirNotificacaoBackup(JSON.parse(backupInfo));
        localStorage.removeItem('backup_info');
    }

});

// Adicionar seção de backups à área de administração
function carregarBackupsPage() {
    // Verifica o papel do usuário usando session storage em vez de session.get
    const userRole = sessionStorage.getItem('userRole');

    if (userRole !== 'admin') {
        exibirMensagem('Acesso restrito a administradores', 'erro');
        return;
    }

    updateActiveMenu('backups');
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Gerenciamento de Backups</h2>
                
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Informações de Backup do Sistema</h5>
                    </div>
                    <div class="card-body">
                        <p class="mb-3">O sistema realiza automaticamente um backup diário do banco de dados durante o primeiro login do dia.</p>
                        <p class="mb-3">São mantidos os backups dos últimos 14 dias no servidor.</p>
                        <div id="backup-info" class="mt-4">
                            <div class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Carregando informações de backup...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Carregar informações dos backups
    carregarInfoBackups().then(data => {
        if (!data) {
            document.getElementById('backup-info').innerHTML = `
                <div class="alert alert-danger">
                    Não foi possível carregar as informações de backup.
                </div>
            `;
            return;
        }

        let html = `
            <div class="backup-summary mb-3">
                <p><strong>Total de backups:</strong> ${data.total_backups}</p>
                <p><strong>Diretório:</strong> ${data.diretorio}</p>
            </div>
            
            <h5>Backups Disponíveis:</h5>
            <div class="table-responsive">
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>Arquivo</th>
                            <th>Data de Criação</th>
                            <th>Tamanho</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.backups.length === 0) {
            html += `
                <tr>
                    <td colspan="3" class="text-center">Nenhum backup encontrado</td>
                </tr>
            `;
        } else {
            data.backups.forEach(backup => {
                html += `
                    <tr>
                        <td>${backup.nome}</td>
                        <td>${backup.data_criacao}</td>
                        <td>${backup.tamanho}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('backup-info').innerHTML = html;
    });
}

/**
 * Gerencia o login do usuário
 * @param {Event} e - Evento do formulário
 */
async function handleLogin(e) {
    e.preventDefault();

    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validação básica
    if (!username || !password) {
        errorDiv.textContent = 'Usuário e senha são obrigatórios';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
        errorDiv.style.display = 'none';

        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Armazena informações de backup se houver
            if (data.backup_info) {
                localStorage.setItem('backup_info', JSON.stringify(data.backup_info));
            }
            // Redireciona para a página principal
            window.location.href = '/';
        } else {
            errorDiv.textContent = data.error || 'Credenciais inválidas';
            errorDiv.style.display = 'block';
            // Limpa apenas a senha em caso de erro
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Erro de login:', error);
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.style.display = 'block';
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
}

// Adiciona o event listener para o formulário de login quando a página for carregada
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLogin); // Limpa listeners duplicados
        loginForm.addEventListener('submit', handleLogin);
    }

    // Verificar se há informações de backup no localStorage para exibir
    const backupInfo = localStorage.getItem('backup_info');
    if (backupInfo) {
        // Exibe a notificação e remove a informação do localStorage
        exibirNotificacaoBackup(JSON.parse(backupInfo));
        localStorage.removeItem('backup_info');
    }

    // Resto do código para inicialização
    if (document.body.classList.contains('index-page')) {
        // Aplica o tema salvo se existir
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }

        carregarHome();
        startAutoRefresh();
        exibirInfoUsuario();
        checkAdminStatus();
        startSessionMonitor();
    }
});

/**
 * Exibe notificação sobre o backup do sistema
 * @param {Object} backupInfo - Informações do backup
 */
function exibirNotificacaoBackup(backupInfo) {
    if (!backupInfo) return;

    const mensagemDiv = document.getElementById('mensagem');
    if (!mensagemDiv) return;

    const tipo = backupInfo.realizado ? 'success' : 'info';
    const icone = backupInfo.realizado ? 'check-circle' : 'info-circle';

    // Se foi realizado backup, exibe uma mensagem mais destacada
    if (backupInfo.realizado) {
        mensagemDiv.innerHTML = `
            <i class="bi bi-${icone}"></i> 
            <strong>Backup do sistema:</strong> ${backupInfo.mensagem}
        `;
        mensagemDiv.className = `alert alert-${tipo}`;
        mensagemDiv.style.display = 'block';

        // Mantém a mensagem por 6 segundos
        setTimeout(() => {
            if (mensagemDiv) mensagemDiv.style.display = 'none';
        }, 6000);
    } else {
        // Se o backup não foi feito, registra no console
        console.info('Sistema de backup:', backupInfo.mensagem);
    }
}

/**
 * Configura o campo de pesquisa para filtrar chamados em tempo real
 * @param {string} tipo - Tipo de chamados ('aberto' ou 'finalizado')
 */
function configurarPesquisaChamados(tipo) {
    const inputId = `pesquisa-chamados-${tipo}`;
    const input = document.getElementById(inputId);

    if (!input) return;

    let timeoutId;

    input.addEventListener('input', function () {
        // Limpa o timeout anterior para evitar múltiplas pesquisas
        clearTimeout(timeoutId);

        // Define um novo timeout para filtrar apenas quando o usuário parar de digitar
        timeoutId = setTimeout(() => {
            const termo = input.value.toLowerCase().trim();

            if (termo.length === 0) {
                // Se o campo estiver vazio, recarrega a listagem normal
                const status = tipo === 'aberto' ? 'Aberto' : 'Finalizado';
                if (status === 'Aberto') {
                    paginaAtualChamadosAbertos = 1;
                } else {
                    paginaAtualChamadosFinalizados = 1;
                }
                carregarChamados(status);

                // Mostrar controles de paginação normais
                document.getElementById(`btn-anterior-chamados-${tipo}`).style.display = '';
                document.getElementById(`btn-proximo-chamados-${tipo}`).style.display = '';
                document.getElementById(`pagina-atual-chamados-${tipo}`).style.display = '';
            } else {
                // Se tiver termo de busca, faz busca no servidor
                buscarChamadosPorTermo(termo, tipo);
            }
        }, 300); // 300ms de delay
    });
}

/**
 * Busca chamados no servidor com base no termo de pesquisa
 * @param {string} termo - Termo de pesquisa
 * @param {string} tipo - Tipo de chamados ('aberto' ou 'finalizado')
 */
async function buscarChamadosPorTermo(termo, tipo) {
    try {
        const status = tipo === 'aberto' ? 'Aberto' : 'Finalizado';
        const tableId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';

        // Mostrar indicador de carregamento
        document.getElementById(tableId).innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Buscando...</span>
                    </div>
                </td>
            </tr>
        `;

        // Fazer requisição à API para buscar chamados em todas as páginas
        const response = await fetch(`/chamados/buscar?termo=${encodeURIComponent(termo)}&status=${status}`);

        if (!response.ok) {
            throw new Error('Erro na busca de chamados');
        }

        const data = await response.json();

        // Esconder controles de paginação durante a busca
        document.getElementById(`btn-anterior-chamados-${tipo}`).style.display = 'none';
        document.getElementById(`btn-proximo-chamados-${tipo}`).style.display = 'none';
        document.getElementById(`pagina-atual-chamados-${tipo}`).style.display = 'none';

        // Renderizar os resultados da busca
        renderizarResultadosBusca(data.chamados, tipo);

    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        exibirMensagem('Erro ao buscar chamados: ' + error.message, 'erro');
    }
}

/**
 * Renderiza os resultados da busca de chamados na tabela
 * @param {Array} chamados - Lista de chamados encontrados
 * @param {string} tipo - Tipo de chamados ('aberto' ou 'finalizado')
 */
function renderizarResultadosBusca(chamados, tipo) {
    const tableId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';
    const tbody = document.getElementById(tableId);

    // Se não encontrou resultados
    if (chamados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Nenhum chamado encontrado. Tente outro termo de pesquisa.
                </td>
            </tr>
        `;
        return;
    }

    // Gerar HTML com os resultados encontrados
    if (tipo === 'aberto') {
        tbody.innerHTML = chamados.map(chamado => `
            <tr data-id="${chamado[0]}" style="cursor:pointer;">
                <td>${chamado[6] || 'N/A'}</td>
                <td>${chamado[0]}</td>
                <td>${chamado[10] || 'Cliente removido'}</td>
                <td>${formatarData(chamado[4])}</td>
                <td>${chamado[7] || ''}</td>
                <td><span class="badge status-badge status-${chamado[3].toLowerCase()}">${chamado[3]}</span></td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = chamados.map(chamado => `
            <tr data-id="${chamado[0]}" style="cursor:pointer;">
                <td>${chamado[6] || 'N/A'}</td>
                <td>${chamado[10] || 'Cliente removido'}</td>
                <td>${formatarData(chamado[4])}</td>
                <td>${chamado[7] || ''}</td>
                <td>${formatarData(chamado[5])}</td>
                <td><span class="badge status-badge status-${chamado[3].toLowerCase()}">${chamado[3]}</span></td>
            </tr>
        `).join('');
    }

    // Adicionar event listeners para selecionar linhas
    const tabelaId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';
    document.querySelectorAll(`#${tabelaId} tr`).forEach(row => {
        row.addEventListener('click', function () {
            // Remover seleção anterior
            document.querySelectorAll(`#${tabelaId} tr`).forEach(r => r.classList.remove('table-warning'));

            // Adicionar seleção à linha clicada
            this.classList.add('table-warning');

            // Armazenar ID do chamado selecionado
            selectedChamadoId = this.getAttribute('data-id');

            // Habilitar botões de ação
            const btnPrefix = tipo === 'aberto' ? '' : '';
            document.getElementById('btn-abrir').disabled = false;
            if (tipo === 'aberto') {
                document.getElementById('btn-finalizar').disabled = false;
                document.getElementById('btn-excluir').disabled = false;
            } else {
                document.getElementById('btn-reabrir').disabled = false;
                document.getElementById('btn-excluir').disabled = false;
            }
        });
    });
}

// Adicionar à função carregarBackupsPage
function carregarBackupsPage() {
    updateActiveMenu('backups');
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Gerenciamento de Backups</h2>
                
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="bi bi-gear-fill"></i> Configurações</h5>
                    </div>
                    <div class="card-body">
                        <form id="config-backup-form">
                            <div class="mb-3">
                                <label for="backup-dir" class="form-label">Diretório para salvar backups:</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="backup-dir" placeholder="/caminho/para/backups">
                                    <button class="btn btn-primary" type="submit">Salvar</button>
                                </div>
                                <div class="form-text">
                                    <i class="bi bi-info-circle"></i> O caminho deve ser um diretório válido com permissões de escrita.
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0"><i class="bi bi-info-circle"></i> Informações sobre Backups</h5>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-primary">
                            <h6><i class="bi bi-clock-history"></i> Como funciona o backup automático:</h6>
                            <ul>
                                <li>O sistema realiza automaticamente um backup diário do banco de dados durante o primeiro login do dia.</li>
                                <li>São mantidos os backups dos últimos 14 dias no servidor, sendo os mais antigos substituídos pelos novos.</li>
                                <li>Cada backup é um arquivo completo do banco de dados, contendo todos os dados do sistema no momento em que foi gerado.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0"><i class="bi bi-archive-fill"></i> Backups Disponíveis</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="backup-info">
                                <i class="bi bi-folder"></i> Diretório atual: <span id="backup-dir-atual">Carregando...</span>
                            </div>
                            <button class="btn btn-success" onclick="realizarBackupManual()">
                                <i class="bi bi-cloud-arrow-up"></i> Realizar Backup Agora
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="modern-table">
                                <thead>
                                    <tr>
                                        <th>Nome do Arquivo</th>
                                        <th>Data de Criação</th>
                                        <th>Tamanho</th>
                                    </tr>
                                </thead>
                                <tbody id="lista-backups">
                                    <tr>
                                        <td colspan="3" class="text-center">Carregando backups...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Carregar as informações de backup
    carregarInfoBackups();

    // Configurar o formulário de configuração de backup
    document.getElementById('config-backup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const diretorio = document.getElementById('backup-dir').value.trim();
        if (!diretorio) {
            exibirMensagem('Por favor, informe um diretório válido', 'erro');
            return;
        }
        await salvarConfiguracaoBackup(diretorio);
    });
}

/**
 * Carrega as configurações atuais de backup
 */
async function carregarConfiguracoesBackup() {
    try {
        const response = await fetchWithLoading('/system/backup-config');
        if (response.success) {
            document.getElementById('backup-dir').value = response.diretorio_atual;
            document.getElementById('backup-dir-atual').textContent = response.diretorio_atual;
        } else {
            exibirMensagem('Erro ao carregar configurações de backup', 'erro');
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de backup:', error);
        exibirMensagem('Erro ao carregar configurações de backup', 'erro');
    }
}

/**
 * Salva uma nova configuração de diretório de backup
 * @param {string} diretorio - Novo diretório para salvar backups
 */
async function salvarConfiguracaoBackup(diretorio) {
    try {
        const response = await fetchWithLoading('/system/backup-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ diretorio })
        });

        if (response.success) {
            exibirMensagem('Configuração de backup atualizada com sucesso', 'sucesso');
            document.getElementById('backup-dir-atual').textContent = response.diretorio_atual;
            // Recarrega a lista de backups com o novo diretório
            carregarInfoBackups();
        } else {
            exibirMensagem(response.error || 'Erro ao salvar configuração', 'erro');
        }
    } catch (error) {
        console.error('Erro ao salvar configuração de backup:', error);
        exibirMensagem('Erro ao salvar configuração de backup', 'erro');
    }
}

/**
 * Carrega as informações dos backups existentes
 */
async function carregarInfoBackups() {
    try {
        const response = await fetchWithLoading('/system/backups');

        if (response.success) {
            const backups = response.backups;
            const diretorio = response.diretorio;
            const totalBackups = response.total_backups;

            // Atualiza o diretório exibido
            document.getElementById('backup-dir-atual').textContent = diretorio;
            document.getElementById('backup-dir').value = diretorio;

            // Renderiza a lista de backups
            const listaBackups = document.getElementById('lista-backups');
            if (backups.length === 0) {
                listaBackups.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center">Nenhum backup encontrado</td>
                    </tr>
                `;
            } else {
                listaBackups.innerHTML = backups.map(backup => `
                    <tr>
                        <td>${backup.nome}</td>
                        <td>${backup.data_criacao}</td>
                        <td>${backup.tamanho}</td>
                    </tr>
                `).join('');
            }

        } else {
            exibirMensagem('Erro ao carregar informações de backup', 'erro');
        }
    } catch (error) {
        console.error('Erro ao carregar informações de backup:', error);
        exibirMensagem('Erro ao carregar informações de backup', 'erro');
    }
}

/**
 * Realiza um backup manual do sistema
 */
async function realizarBackupManual() {
    try {
        exibirMensagem('Realizando backup. Por favor, aguarde...', 'sucesso');

        // Realiza o backup manual via API
        const response = await fetchWithLoading('/system/backup/manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.success) {
            exibirMensagem(`Backup realizado com sucesso!`, 'sucesso');
            // Recarrega a lista após o backup bem-sucedido
            carregarInfoBackups();
        } else {
            exibirMensagem(`Erro ao realizar backup: ${response.error || 'Erro desconhecido'}`, 'erro');
        }
    } catch (error) {
        console.error('Erro ao realizar backup manual:', error);
        exibirMensagem('Erro ao realizar backup', 'erro');
    }
}

// Adicionar à função carregarBackupsPage
function carregarBackupsPage() {
    updateActiveMenu('backups');
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Gerenciamento de Backups</h2>
                
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0"><i class="bi bi-gear-fill"></i> Configurações</h5>
                    </div>
                    <div class="card-body">
                        <form id="config-backup-form">
                            <div class="mb-3">
                                <label for="backup-dir" class="form-label">Diretório para salvar backups:</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="backup-dir" placeholder="/caminho/para/backups">
                                    <button class="btn btn-primary" type="submit">Salvar</button>
                                </div>
                                <div class="form-text">
                                    <i class="bi bi-info-circle"></i> O caminho deve ser um diretório válido com permissões de escrita.
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0"><i class="bi bi-info-circle"></i> Informações sobre Backups</h5>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-primary">
                            <h6><i class="bi bi-clock-history"></i> Como funciona o backup automático:</h6>
                            <ul>
                                <li>O sistema realiza automaticamente um backup diário do banco de dados durante o primeiro login do dia.</li>
                                <li>São mantidos os backups dos últimos 14 dias no servidor, sendo os mais antigos substituídos pelos novos.</li>
                                <li>Cada backup é um arquivo completo do banco de dados, contendo todos os dados do sistema no momento em que foi gerado.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0"><i class="bi bi-archive-fill"></i> Backups Disponíveis</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="backup-info">
                                <i class="bi bi-folder"></i> Diretório atual: <span id="backup-dir-atual">Carregando...</span>
                            </div>
                            <button class="btn btn-success" onclick="realizarBackupManual()">
                                <i class="bi bi-cloud-arrow-up"></i> Realizar Backup Agora
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="modern-table">
                                <thead>
                                    <tr>
                                        <th>Nome do Arquivo</th>
                                        <th>Data de Criação</th>
                                        <th>Tamanho</th>
                                    </tr>
                                </thead>
                                <tbody id="lista-backups">
                                    <tr>
                                        <td colspan="3" class="text-center">Carregando backups...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Carregar as informações de backup
    carregarInfoBackups();

    // Configurar o formulário de configuração de backup
    document.getElementById('config-backup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const diretorio = document.getElementById('backup-dir').value.trim();
        if (!diretorio) {
            exibirMensagem('Por favor, informe um diretório válido', 'erro');
            return;
        }
        await salvarConfiguracaoBackup(diretorio);
    });
}

/**
 * Implementação do detector do código Konami para acessar o easter egg
 * Sequência: ↑ ↑ ↓ ↓ ← → ← → B A
 */
function setupKonamiCode() {
    // Sequência do código Konami
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    // Índice atual na sequência
    let konamiIndex = 0;

    // Adiciona o event listener para detectar o código Konami
    document.addEventListener('keydown', function (e) {
        // Converte a tecla pressionada para minúsculo para comparação
        const key = e.key.toLowerCase();

        // Verifica se a tecla corresponde à sequência esperada
        if (key === konamiCode[konamiIndex].toLowerCase()) {
            konamiIndex++;

            // Se completou toda a sequência
            if (konamiIndex === konamiCode.length) {
                // Reseta o índice
                konamiIndex = 0;
                // Redireciona para o jogo Snake
                window.open('/snake.html', '_blank');
                // Alternativa: window.location.href = '/snake.html';
            }
        } else {
            // Reseta o índice se errar a sequência
            konamiIndex = 0;
        }
    });
}

// Adicione a chamada para configurar o detector de código Konami
// à lista de funções executadas quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Aplica o tema salvo se existir
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="bi bi-moon"></i>';
    }
    carregarHome();
    startAutoRefresh();
    exibirInfoUsuario();
    checkAdminStatus();
    startSessionMonitor();
    setupKonamiCode(); // Adiciona o detector do código Konami
});

/**
 * Gerencia o login do usuário
 * @param {Event} e - Evento do formulário
 */
async function handleLogin(e) {
    e.preventDefault();

    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validação básica
    if (!username || !password) {
        errorDiv.textContent = 'Usuário e senha são obrigatórios';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
        errorDiv.style.display = 'none';

        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Armazena informações de backup se houver
            if (data.backup_info) {
                localStorage.setItem('backup_info', JSON.stringify(data.backup_info));
            }
            // Redireciona para a página principal
            window.location.href = '/';
        } else {
            errorDiv.textContent = data.error || 'Credenciais inválidas';
            errorDiv.style.display = 'block';
            // Limpa apenas a senha em caso de erro
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Erro de login:', error);
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.style.display = 'block';
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
}

// Adiciona o event listener para o formulário de login quando a página for carregada
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLogin); // Limpa listeners duplicados
        loginForm.addEventListener('submit', handleLogin);
    }

    // Verificar se há informações de backup no localStorage para exibir
    const backupInfo = localStorage.getItem('backup_info');
    if (backupInfo) {
        // Exibe a notificação e remove a informação do localStorage
        exibirNotificacaoBackup(JSON.parse(backupInfo));
        localStorage.removeItem('backup_info');
    }

    // Resto do código para inicialização
    if (document.body.classList.contains('index-page')) {
        // Aplica o tema salvo se existir
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }

        carregarHome();
        startAutoRefresh();
        exibirInfoUsuario();
        checkAdminStatus();
        startSessionMonitor();
    }
});

/**
 * Exibe notificação sobre o backup do sistema
 * @param {Object} backupInfo - Informações do backup
 */
function exibirNotificacaoBackup(backupInfo) {
    if (!backupInfo) return;

    const mensagemDiv = document.getElementById('mensagem');
    if (!mensagemDiv) return;

    const tipo = backupInfo.realizado ? 'success' : 'info';
    const icone = backupInfo.realizado ? 'check-circle' : 'info-circle';

    // Se foi realizado backup, exibe uma mensagem mais destacada
    if (backupInfo.realizado) {
        mensagemDiv.innerHTML = `
            <i class="bi bi-${icone}"></i> 
            <strong>Backup do sistema:</strong> ${backupInfo.mensagem}
        `;
        mensagemDiv.className = `alert alert-${tipo}`;
        mensagemDiv.style.display = 'block';

        // Mantém a mensagem por 6 segundos
        setTimeout(() => {
            if (mensagemDiv) mensagemDiv.style.display = 'none';
        }, 6000);
    } else {
        // Se o backup não foi feito, registra no console
        console.info('Sistema de backup:', backupInfo.mensagem);
    }
}

/**
 * Configura o campo de pesquisa para filtrar chamados em tempo real
 * @param {string} tipo - Tipo de chamados ('aberto' ou 'finalizado')
 */
function configurarPesquisaChamados(tipo) {
    const inputId = `pesquisa-chamados-${tipo}`;
    const input = document.getElementById(inputId);

    if (!input) return;

    let timeoutId;

    input.addEventListener('input', function () {
        // Limpa o timeout anterior para evitar múltiplas pesquisas
        clearTimeout(timeoutId);

        // Define um novo timeout para filtrar apenas quando o usuário parar de digitar
        timeoutId = setTimeout(() => {
            const termo = input.value.toLowerCase().trim();

            if (termo.length === 0) {
                // Se o campo estiver vazio, recarrega a listagem normal
                const status = tipo === 'aberto' ? 'Aberto' : 'Finalizado';
                if (status === 'Aberto') {
                    paginaAtualChamadosAbertos = 1;
                } else {
                    paginaAtualChamadosFinalizados = 1;
                }
                carregarChamados(status);

                // Mostrar controles de paginação normais
                document.getElementById(`btn-anterior-chamados-${tipo}`).style.display = '';
                document.getElementById(`btn-proximo-chamados-${tipo}`).style.display = '';
                document.getElementById(`pagina-atual-chamados-${tipo}`).style.display = '';
            } else {
                // Se tiver termo de busca, faz busca no servidor
                buscarChamadosPorTermo(termo, tipo);
            }
        }, 300); // 300ms de delay
    });
}

/**
 * Busca chamados no servidor com base no termo de pesquisa
 * @param {string} termo - Termo de pesquisa
 * @param {string} tipo - Tipo de chamados ('aberto' ou 'finalizado')
 */
async function buscarChamadosPorTermo(termo, tipo) {
    try {
        const status = tipo === 'aberto' ? 'Aberto' : 'Finalizado';
        const tableId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';

        // Mostrar indicador de carregamento
        document.getElementById(tableId).innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Buscando...</span>
                    </div>
                </td>
            </tr>
        `;

        // Fazer requisição à API para buscar chamados em todas as páginas
        const response = await fetch(`/chamados/buscar?termo=${encodeURIComponent(termo)}&status=${status}`);

        if (!response.ok) {
            throw new Error('Erro na busca de chamados');
        }

        const data = await response.json();

        // Esconder controles de paginação durante a busca
        document.getElementById(`btn-anterior-chamados-${tipo}`).style.display = 'none';
        document.getElementById(`btn-proximo-chamados-${tipo}`).style.display = 'none';
        document.getElementById(`pagina-atual-chamados-${tipo}`).style.display = 'none';

        // Renderizar os resultados da busca
        renderizarResultadosBusca(data.chamados, tipo);

    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        exibirMensagem('Erro ao buscar chamados: ' + error.message, 'erro');
    }
}

/**
 * Renderiza os resultados da busca de chamados na tabela
 * @param {Array} chamados - Lista de chamados encontrados
 * @param {string} tipo - Tipo de chamados ('aberto' ou 'finalizado')
 */
function renderizarResultadosBusca(chamados, tipo) {
    const tableId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';
    const tbody = document.getElementById(tableId);

    // Se não encontrou resultados
    if (chamados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Nenhum chamado encontrado. Tente outro termo de pesquisa.
                </td>
            </tr>
        `;
        return;
    }

    // Gerar HTML com os resultados encontrados
    if (tipo === 'aberto') {
        tbody.innerHTML = chamados.map(chamado => `
            <tr data-id="${chamado[0]}" style="cursor:pointer;">
                <td>${chamado[6] || 'N/A'}</td>
                <td>${chamado[0]}</td>
                <td>${chamado[10] || 'Cliente removido'}</td>
                <td>${formatarData(chamado[4])}</td>
                <td>${chamado[7] || ''}</td>
                <td><span class="badge status-badge status-${chamado[3].toLowerCase()}">${chamado[3]}</span></td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = chamados.map(chamado => `
            <tr data-id="${chamado[0]}" style="cursor:pointer;">
                <td>${chamado[6] || 'N/A'}</td>
                <td>${chamado[10] || 'Cliente removido'}</td>
                <td>${formatarData(chamado[4])}</td>
                <td>${chamado[7] || ''}</td>
                <td>${formatarData(chamado[5])}</td>
                <td><span class="badge status-badge status-${chamado[3].toLowerCase()}">${chamado[3]}</span></td>
            </tr>
        `).join('');
    }

    // Adicionar event listeners para selecionar linhas
    const tabelaId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';
    document.querySelectorAll(`#${tabelaId} tr`).forEach(row => {
        row.addEventListener('click', function () {
            // Remover seleção anterior
            document.querySelectorAll(`#${tabelaId} tr`).forEach(r => r.classList.remove('table-warning'));

            // Adicionar seleção à linha clicada
            this.classList.add('table-warning');

            // Armazenar ID do chamado selecionado
            selectedChamadoId = this.getAttribute('data-id');

            // Habilitar botões de ação
            const btnPrefix = tipo === 'aberto' ? '' : '';
            document.getElementById('btn-abrir').disabled = false;
            if (tipo === 'aberto') {
                document.getElementById('btn-finalizar').disabled = false;
                document.getElementById('btn-excluir').disabled = false;
            } else {
                document.getElementById('btn-reabrir').disabled = false;
                document.getElementById('btn-excluir').disabled = false;
            }
        });
    });
}

/**
 * Abre o Google Maps com a rota para o endereço do cliente
 * usando a localização atual do usuário como ponto de partida
 */
function abrirRotaGoogleMaps() {
    // Obtém e clona o template do loading
    const template = document.getElementById('loading-maps-template');
    const loadingElement = document.createElement('div');
    loadingElement.appendChild(template.content.cloneNode(true));
    document.body.appendChild(loadingElement);

    // Captura os valores dos campos de endereço
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;
    const bairro = document.getElementById('bairro').value;
    const cidade = document.getElementById('cidade').value;
    const estado = document.getElementById('estado').value;

    // Monta o endereço completo
    const enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade} - ${estado}`;

    // Codifica o endereço para URL
    const enderecoURL = encodeURIComponent(enderecoCompleto);

    // Verifica se o navegador suporta geolocalização
    if (navigator.geolocation) {
        // Define um timeout para a obtenção da localização
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,        // 10 segundos
            maximumAge: 0          // Sempre obter uma posição nova
        };

        // Tenta obter a localização atual
        navigator.geolocation.getCurrentPosition(
            // Sucesso na obtenção da localização
            function (position) {
                // Remove o indicador de carregamento
                document.body.removeChild(loadingElement);

                // Obtém as coordenadas
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Define a origem como as coordenadas obtidas
                const origin = `${lat},${lng}`;

                // Abre o Google Maps com as coordenadas exatas e o destino
                window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${enderecoURL}&travelmode=driving`, '_blank');
            },
            // Erro na obtenção da localização
            function (error) {
                // Remove o indicador de carregamento
                document.body.removeChild(loadingElement);

                console.warn("Erro ao obter localização:", error.message);

                // Exibe mensagem de erro adequada
                let mensagemErro;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        mensagemErro = "Você negou a permissão para obter sua localização. Utilizando modo de rota padrão.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        mensagemErro = "Informações de localização indisponíveis. Utilizando modo de rota padrão.";
                        break;
                    case error.TIMEOUT:
                        mensagemErro = "Tempo esgotado ao tentar obter sua localização. Utilizando modo de rota padrão.";
                        break;
                    default:
                        mensagemErro = "Erro desconhecido ao obter sua localização. Utilizando modo de rota padrão.";
                }

                // Exibe a mensagem de erro para o usuário
                if (typeof exibirMensagem === 'function') {
                    exibirMensagem(mensagemErro, 'erro');
                } else {
                    alert(mensagemErro);
                }

                // Abre o Google Maps sem origem específica
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${enderecoURL}&travelmode=driving`, '_blank');
            },
            geoOptions
        );
    } else {
        // Remove o indicador de carregamento
        document.body.removeChild(loadingElement);

        // Navegador não suporta geolocalização
        const mensagem = "Seu navegador não suporta geolocalização. Utilizando modo de rota padrão.";

        if (typeof exibirMensagem === 'function') {
            exibirMensagem(mensagem, 'erro');
        } else {
            alert(mensagem);
        }

        // Abre o Google Maps sem origem específica
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${enderecoURL}&travelmode=driving`, '_blank');
    }
}
