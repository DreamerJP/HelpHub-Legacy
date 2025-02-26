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

let totalPaginasClientes = 1; // Nova variável global para total de páginas

// Adicione esta função no início do arquivo
let sessionCheckInterval;
let lastUserActivity = Date.now();
const SESSION_WARNING_TIME = 30;  // 30 minutos
const SESSION_TIMEOUT = 480;   // 8 horas em minutos

// Monitora atividade do usuário
document.addEventListener('mousemove', updateUserActivity);
document.addEventListener('keypress', updateUserActivity);
document.addEventListener('click', updateUserActivity);

function updateUserActivity() {
    lastUserActivity = Date.now();
}

function startSessionMonitor() {
    sessionCheckInterval = setInterval(checkSession, 60000); // Verifica a cada minuto
}

function checkSession() {
    const timeSinceLastActivity = (Date.now() - lastUserActivity) / (60 * 1000); // Em minutos

    // Avisa quando faltar 30 minutos para expirar
    if (timeSinceLastActivity >= (SESSION_TIMEOUT - SESSION_WARNING_TIME)) {
        const timeLeft = SESSION_TIMEOUT - timeSinceLastActivity;
        if (timeLeft > 0) {
            const warningModal = new bootstrap.Modal(document.getElementById('sessionWarningModal'));
            document.getElementById('timeLeft').textContent = Math.ceil(timeLeft);
            warningModal.show();
        } else {
            // Se o tempo acabou, força o logout
            window.location.href = '/auth/logout';
        }
    }

    // Se passou do tempo limite, força logout
    if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        window.location.href = '/auth/logout';
    }
}

// Função para renovar a sessão
async function renewSession() {
    try {
        const response = await fetch('/auth/renew-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            lastUserActivity = Date.now(); // Atualiza o timestamp da última atividade
            const warningModal = bootstrap.Modal.getInstance(document.getElementById('sessionWarningModal'));
            warningModal.hide();
        } else {
            // Se a renovação falhar, redireciona para o logout
            window.location.href = '/auth/logout';
        }
    } catch (error) {
        console.error('Erro ao renovar sessão:', error);
        window.location.href = '/auth/logout';
    }
}

// Atualiza o modal para forçar logout ao clicar em "Sair"
document.querySelector('#sessionWarningModal .btn-secondary').onclick = function() {
    window.location.href = '/auth/logout';
};

// Função para exibir mensagens de feedback ao usuário
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const mensagemDiv = document.getElementById('mensagem'); // Obtém o elemento para exibir a mensagem
    mensagemDiv.textContent = mensagem; // Define o texto da mensagem
    mensagemDiv.className = `alert alert-${tipo === 'sucesso' ? 'success' : 'danger'}`; // Define as classes CSS para o tipo de mensagem
    mensagemDiv.style.display = 'block'; // Exibe a mensagem

    setTimeout(() => {
        mensagemDiv.style.display = 'none'; // Oculta a mensagem após 3 segundos
    }, 3000);
}

// Funções de navegação
// Atualiza o menu ativo, destacando a página atual
function updateActiveMenu(selected) {
    const menus = ['menu-home', 'menu-clientes', 'menu-chamados', 'menu-usuarios'];
    menus.forEach(function(id) {
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

// Carrega a página inicial
function carregarHome() {
    updateActiveMenu('home'); // Atualiza o menu ativo
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-body">
                        <h2>Buscar Cliente</h2>
                        <div class="input-group mb-3">
                            <input type="text" id="busca-cliente" class="form-control" placeholder="Digite nome ou email...">
                            <button class="btn btn-primary" onclick="buscarClientes()">Buscar</button>
                        </div>
                        <div id="resultado-busca"></div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5>Estatísticas de Chamados</h5>
                                <div class="chart-container">
                                    <canvas id="grafico-chamados"></canvas>
                                </div>
                                <div class="mt-3">
                                    <p>Total de Chamados Abertos: <span id="total-abertos">0</span></p>
                                    <p>Total de Chamados Fechados: <span id="total-fechados">0</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5>Últimos Chamados</h5>
                                <div id="ultimos-chamados" class="list-group"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5> Resumo do Sistema</h5>
                        <ul class="list-group" id="estatisticas-gerais"></ul>
                    </div>
                </div>
                <div class="card mt-4">
                    <div class="card-body">
                        <h5>Ações Rápidas</h5>
                        <button class="btn btn-success mb-2 w-100" onclick="carregarNovoClientePage()">Novo Cliente</button>
                        <button class="btn btn-primary w-100" onclick="carregarChamadosPage()">Novo Chamado</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    carregarEstatisticas(); // Carrega as estatísticas na página inicial
    configurarBuscaClientes(); // Configura a busca de clientes na página inicial
}

// Carrega a página de clientes, exibindo a lista em formato de tabela
function carregarClientesPage() {
    updateActiveMenu('clientes'); // Atualiza o menu ativo
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Clientes Cadastrados</h2>
                
                <!-- Barra de pesquisa moderna -->
                <div class="modern-search">
                    <input type="text" id="pesquisa-cliente" class="form-control" 
                           placeholder="Pesquisar por nome, ID ou e-mail...">
                </div>
                
                <!-- Toolbar moderna -->
                <div class="modern-toolbar">
                    <button id="btn-novo-cliente" class="btn btn-success" onclick="carregarNovoClientePage()">
                        <i class="bi bi-plus-lg"></i> Novo Cliente
                    </button>
                    <button id="btn-editar-cliente" class="btn btn-info" onclick="editarClienteSelecionado()" disabled>
                        <i class="bi bi-pencil"></i> Visualizar
                    </button>
                    <button id="btn-excluir-cliente" class="btn btn-danger" onclick="excluirClienteSelecionado()" disabled>
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>

                <!-- Tabela moderna -->
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th onclick="ordenarClientes('id')">ID - Nome</th>
                            <th>Nome Fantasia</th>
                            <th>E-mail</th>
                            <th>Telefone</th>
                        </tr>
                    </thead>
                    <tbody id="clientes">
                        <!-- Dados serão renderizados aqui -->
                    </tbody>
                </table>

                <!-- Paginação moderna -->
                <div class="modern-pagination">
                    <button id="btn-anterior" onclick="paginaAnteriorClientes()">
                        <i class="bi bi-chevron-left"></i> Anterior
                    </button>
                    <span class="page-info" id="pagina-atual">
                        Página ${paginaAtualClientes}/${totalPaginasClientes}
                    </span>
                    <button id="btn-proximo" onclick="proximaPaginaClientes()">
                        Próxima <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    carregarClientes(); // Carrega a lista de clientes
    configurarPesquisaClientes(); // Configura a pesquisa de clientes
}

// Função para pesquisar clientes
async function pesquisarClientes() {
    const termo = document.getElementById('pesquisa-cliente').value; // Obtém o termo de pesquisa
    try {
        const resposta = await fetch(`http://localhost:5000/clientes/buscar?termo=${encodeURIComponent(termo)}`); // Envia a requisição para a API
        const clientes = await resposta.json(); // Converte a resposta para JSON

        const tbody = document.getElementById('clientes'); // Obtém o corpo da tabela
        tbody.innerHTML = clientes.map(cliente => `
            <tr data-id="${cliente[0]}" data-cliente='${JSON.stringify(cliente).replace(/"/g,'&quot;')}' style="cursor:pointer;">
                <td>#${cliente[0]} - ${cliente[1]}</td>
                <td>${cliente[2] || ''}</td>
                <td>${cliente[3] || ''}</td>
                <td>${cliente[4] || ''}</td>
            </tr>
        `).join(''); // Renderiza os clientes na tabela

        // Adiciona evento de clique para selecionar a linha
        document.querySelectorAll("#clientes tr").forEach(row => {
            row.addEventListener('click', function() {
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

// Adiciona evento de keyup para pesquisa em tempo real
function configurarPesquisaClientes() {
    const input = document.getElementById('pesquisa-cliente'); // Obtém o campo de pesquisa
    if (input) {
        input.addEventListener('keyup', function(e) {
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

// Função para buscar clientes (usada na home e na página de clientes cadastrados)
async function buscarClientes(termo) {
    try {
        const resposta = await fetch(`http://localhost:5000/clientes/buscar?termo=${encodeURIComponent(termo)}`); // Envia a requisição para a API
        const clientes = await resposta.json(); // Converte a resposta para JSON

        const resultadoHTML = clientes.map(cliente => `
            <tr data-id="${cliente[0]}" data-telefone="${cliente[4] || ''}" data-cliente='${JSON.stringify(cliente).replace(/"/g,'&quot;')}' style="cursor:pointer;">
                <td>${cliente[1]}</td>
                <td>${cliente[2] || ''}</td>
                <td>${cliente[3] || ''}</td>
                <td>${cliente[4] || ''}</td>
            </tr>
        `).join(''); // Renderiza os clientes na tabela

        document.getElementById('clientes').innerHTML = resultadoHTML; // Define o HTML da tabela

        // Adiciona evento de clique para selecionar a linha
        document.querySelectorAll("#clientes tr").forEach(row => {
            row.addEventListener('click', function() {
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

// Carrega a página de chamados
async function carregarChamadosPage() {
    try {
        updateActiveMenu('chamados'); // Atualiza o menu ativo
        document.getElementById('conteudo').innerHTML = `
            <div id="chamados-subnav" class="mb-3">
                <ul class="nav nav-tabs">
                    <li class="nav-item">
                        <a id="tab-abrir" class="nav-link active" href="#" 
                           onclick="event.preventDefault(); selecionarAbaChamados('abrir'); carregarAbrirChamado();">
                           Novo Chamado
                        </a>
                    </li>
                    <li class="nav-item">
                        <a id="tab-abertos" class="nav-link" href="#" 
                           onclick="event.preventDefault(); selecionarAbaChamados('abertos'); carregarChamadosAbertos();">
                           Chamados Abertos
                        </a>
                    </li>
                    <li class="nav-item">
                        <a id="tab-finalizados" class="nav-link" href="#" 
                           onclick="event.preventDefault(); selecionarAbaChamados('finalizados'); carregarChamadosFinalizados();">
                           Chamados Finalizados
                        </a>
                    </li>
                </ul>
            </div>
            <div id="chamados-content"></div>
        `;
        selecionarAbaChamados('abrir'); // Seleciona a aba "Abrir Chamado"
        await carregarAbrirChamado(); // Carrega o conteúdo da aba "Abrir Chamado"
    } catch (erro) {
        console.error('Erro ao carregar página de chamados:', erro); // Exibe o erro no console
        exibirMensagem('Erro ao carregar página de chamados', 'erro'); // Exibe a mensagem de erro
    }
}

// Seleciona a aba de chamados, destacando a aba ativa
function selecionarAbaChamados(aba) {
    const tabs = ['tab-abrir', 'tab-abertos', 'tab-finalizados']; // Lista de IDs das abas
    tabs.forEach(function(id) {
        document.getElementById(id).classList.remove('active'); // Remove a classe 'active' de todas as abas
    });
    document.getElementById('tab-' + aba).classList.add('active'); // Adiciona a classe 'active' à aba selecionada
}

// Carrega a subpágina para abrir um novo chamado
function carregarAbrirChamado() {
    return new Promise((resolve) => {
        document.getElementById('chamados-content').innerHTML = `
            <div class="row">
                <div class="col-md-12">
                    <h2>Abrir Chamado</h2>
                    <div class="card">
                        <div class="card-body">
                            <form id="chamado-form">
                                <div class="mb-3">
                                    <label for="protocolo" class="form-label">Protocolo:</label>
                                    <input type="text" id="protocolo" class="form-control" readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="assunto" class="form-label">Assunto:</label>
                                    <input type="text" id="assunto" class="form-control" placeholder="Digite o assunto">
                                </div>
                                <div class="mb-3">
                                    <label for="cliente_busca" class="form-label">Buscar Cliente:</label>
                                    <div class="input-group">
                                        <input type="text" id="cliente_busca" class="form-control" 
                                               placeholder="Digite ID ou nome do cliente">
                                        <input type="hidden" id="cliente_id">
                                    </div>
                                    <div id="resultados_cliente" class="list-group mt-2" style="max-height: 200px; overflow-y: auto;">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="telefone_chamado" class="form-label">Telefone:</label>
                                    <input type="text" id="telefone_chamado" class="form-control" placeholder="Telefone automatizado">
                                </div>
                                <div class="mb-3">
                                    <label for="descricao" class="form-label">Descrição:</label>
                                    <textarea id="descricao" class="form-control" rows="3" required></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">Abrir Chamado</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Aguarda o próximo ciclo de eventos para garantir que o DOM seja atualizado
        setTimeout(async () => {
            try {
                await configurarFormularioChamado(); // Configura o formulário de chamado
                configurarBuscaClienteChamado(); // Configura a busca de cliente no formulário de chamado
                resolve(); // Resolve a Promise
            } catch (erro) {
                console.error('Erro ao carregar formulário de chamado:', erro); // Exibe o erro no console
                exibirMensagem('Erro ao carregar formulário', 'erro'); // Exibe a mensagem de erro
            }
        }, 0);
    });
}

// Configura a busca de cliente no formulário de chamado
function configurarBuscaClienteChamado() {
    const clienteBusca = document.getElementById('cliente_busca'); // Obtém o campo de busca de cliente
    const resultadosDiv = document.getElementById('resultados_cliente'); // Obtém a div para exibir os resultados
    
    let timeoutId; // Variável para controlar o timeout da busca

    clienteBusca.addEventListener('input', function() {
        clearTimeout(timeoutId); // Limpa o timeout anterior
        timeoutId = setTimeout(async () => {
            const termo = this.value.trim(); // Obtém o termo de pesquisa
            if (termo.length < 1) {
                resultadosDiv.innerHTML = ''; // Limpa os resultados se o termo for vazio
                return;
            }

            try {
                const resposta = await fetch(`http://localhost:5000/clientes/buscar?termo=${encodeURIComponent(termo)}`); // Envia a requisição para a API
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

// Seleciona o cliente no formulário de chamado
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

// Configura o formulário de chamado para enviar os dados para a API
function configurarFormularioChamado() {
    document.getElementById('chamado-form').onsubmit = async (event) => {
        event.preventDefault(); // Previne o comportamento padrão do formulário
        const assunto = document.getElementById('assunto').value; // Obtém o assunto
        const cliente_id = document.getElementById('cliente_id').value; // Obtém o ID do cliente
        const telefone = document.getElementById('telefone_chamado').value; // Obtém o telefone
        const descricao = document.getElementById('descricao').value; // Obtém a descrição
        
        if (!cliente_id) {
            exibirMensagem('Selecione um cliente', 'erro'); // Exibe a mensagem de erro
            return;
        }
        
        // Monta os dados para o chamado
        const dadosChamado = {
            assunto,
            cliente_id: parseInt(cliente_id),
            telefone,
            descricao
        };

        try {
            const resposta = await fetch('http://localhost:5000/chamados', { // Envia a requisição para a API
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

// Carrega a subpágina de chamados abertos, exibindo a lista em formato de tabela com cabeçalho
function carregarChamadosAbertos() {
    document.getElementById('chamados-content').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Chamados Abertos</h2>
                
                <!-- Toolbar moderna -->
                <div class="modern-toolbar">
                    <button id="btn-abrir" class="btn btn-info" onclick="abrirDetalhesChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-folder2-open"></i> Visualizar
                    </button>
                    <button id="btn-finalizar" class="btn btn-success" onclick="finalizarChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-check-lg"></i> Finalizar
                    </button>
                    <button id="btn-excluir" class="btn btn-danger" onclick="excluirChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>

                <!-- Tabela moderna -->
                <table class="modern-table">
                    <thead>
                        <tr>
                            <th>Protocolo</th>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th onclick="sortChamados('data')">Data</th>
                            <th>Assunto</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="chamados-list">
                        <!-- Dados serão renderizados aqui -->
                    </tbody>
                </table>

                <!-- Paginação moderna -->
                <div class="modern-pagination">
                    <button id="btn-anterior-chamados-aberto" onclick="paginaAnteriorChamados('Aberto')">
                        <i class="bi bi-chevron-left"></i> Anterior
                    </button>
                    <span class="page-info" id="pagina-atual-chamados-aberto">
                        Página ${paginaAtualChamadosAbertos}
                    </span>
                    <button id="btn-proximo-chamados-aberto" onclick="proximaPaginaChamados('Aberto')">
                        Próxima <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    carregarChamados('Aberto'); // Carrega os chamados com status "Aberto"
}

// Carrega a subpágina de chamados finalizados
function carregarChamadosFinalizados() {
    document.getElementById('chamados-content').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Chamados Finalizados</h2>
                
                <!-- Toolbar moderna -->
                <div class="modern-toolbar">
                    <button id="btn-abrir" class="btn btn-info" onclick="abrirDetalhesChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-folder2-open"></i> Visualizar
                    </button>
                    <button id="btn-reabrir" class="btn btn-warning" onclick="reabrirChamado(selectedChamadoId)" disabled>
                        <i class="bi bi-arrow-clockwise"></i> Reabrir
                    </button>
                    <button id="btn-excluir" class="btn btn-danger" onclick="excluirChamado(selectedChamadoId)" disabled>
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
    carregarChamados('Finalizado'); // Carrega os chamados com status "Finalizado"
}

// Funções de paginação
// Avança para a próxima página de clientes
function proximaPaginaClientes() {
    paginaAtualClientes++; // Incrementa o número da página atual
    carregarClientes(); // Carrega os clientes da nova página
}

// Retorna para a página anterior de clientes
function paginaAnteriorClientes() {
    if (paginaAtualClientes > 1) { // Verifica se não está na primeira página
        paginaAtualClientes--; // Decrementa o número da página atual
        carregarClientes(); // Carrega os clientes da nova página
    }
}

// Funções para carregar dados
// Carrega a lista de clientes
async function carregarClientes() {
    try {
        const url = `http://localhost:5000/clientes?pagina=${paginaAtualClientes}&limite=${limitePorPagina}&order_field=${currentSortField}&order_order=${currentSortOrder}`;
        const data = await fetchWithLoading(url); // Envia a requisição para a API com tela de carregamento
        
        const tbody = document.getElementById('clientes'); // Obtém o corpo da tabela
        tbody.innerHTML = data.clientes.map(cliente => `
            <tr data-id="${cliente[0]}" data-cliente='${JSON.stringify(cliente).replace(/"/g,'&quot;')}' style="cursor:pointer;">
                <td>#${cliente[0]} - ${cliente[1]}</td>
                <td>${cliente[2] || ''}</td>
                <td>${cliente[3] || ''}</td>
                <td>${cliente[4] || ''}</td>
            </tr>
        `).join(''); // Renderiza os clientes na tabela

        // Adiciona evento de clique para selecionar a linha
        document.querySelectorAll("#clientes tr").forEach(row => {
            row.addEventListener('click', function() {
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

// Define função para alterar o critério de ordenação
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

// Altere o processamento em carregarChamados para detectar se o container é uma tabela (tbody)
function carregarChamados(status = 'Aberto') {
    try {
        const paginaAtual = status === 'Aberto' ? paginaAtualChamadosAbertos : paginaAtualChamadosFinalizados;
        const url = `http://localhost:5000/chamados?pagina=${paginaAtual}&limite=${limiteChamados}&status=${status}`; // Define a URL da API
        console.log('Carregando chamados da URL:', url); // Adicionado log
        fetchWithLoading(url) // Envia a requisição para a API com tela de carregamento
            .then(data => {
                console.log('Resposta da API:', data); // Adicionado log
                // Alterado para verificar explicitamente undefined
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
                            const clienteNome = chamado[9] || 'Cliente removido'; // Obtém o nome do cliente (vindo do JOIN)
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
                            row.addEventListener('click', function() {
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
                            const clienteNome = chamado[9] || 'Cliente removido'; // Obtém o nome do cliente (vindo do JOIN)
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
                            row.addEventListener('click', function() {
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

// Funções de formulário
function configurarFormularioCliente() {
    document.getElementById('cliente-form').onsubmit = async (event) => {
        event.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value;

        try {
            const resposta = await fetch('http://localhost:5000/clientes', {
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

// Funções de edição
// Remova ou comente a função antiga:
// function abrirFormularioEdicaoCliente(cliente) { ... }

// Nova função para editar cliente via formulário completo
function carregarEditarClientePage(cliente) {
    document.getElementById('conteudo').innerHTML = `
        <div class="row">
            <div class="col-md-8 offset-md-2">
                <h2>Editar Cliente</h2>
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
                        <form id="editar-cliente-form">
                            <div class="mb-3">
                                <label for="id" class="form-label">ID:</label>
                                <input type="text" id="id" class="form-control" value="#${cliente[0]}" readonly>
                            </div>
                            <div class="mb-3">
                                <label for="nome" class="form-label">Razão Social/Nome:</label>
                                <input type="text" id="nome" class="form-control" value="${cliente[1] || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label for="nome_fantasia" class="form-label">Nome Fantasia:</label>
                                <input type="text" id="nome_fantasia" class="form-control" value="${cliente[2] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">E-mail:</label>
                                <input type="email" id="email" class="form-control" value="${cliente[3] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="telefone" class="form-label">Telefone:</label>
                                <input type="text" id="telefone" class="form-control" value="${cliente[4] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="ativo" class="form-label">Ativo:</label>
                                <select id="ativo" class="form-select">
                                    <option value="Sim" ${cliente[5]==='Sim'?'selected':''}>Sim</option>
                                    <option value="Não" ${cliente[5]==='Não'?'selected':''}>Não</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="tipo_cliente" class="form-label">Tipo Cliente:</label>
                                <select id="tipo_cliente" class="form-select">
                                    <option value="Comercial" ${cliente[6]==='Comercial'?'selected':''}>Comercial</option>
                                    <option value="Pessoa Física" ${cliente[6]==='Pessoa Física'?'selected':''}>Pessoa Física</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="cnpj_cpf" class="form-label">CNPJ/CPF:</label>
                                <input type="text" id="cnpj_cpf" class="form-control" value="${cliente[7] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="ie_rg" class="form-label">IE/RG:</label>
                                <input type="text" id="ie_rg" class="form-control" value="${cliente[8] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="contribuinte_icms" class="form-label">Contribuinte ICMS:</label>
                                <select id="contribuinte_icms" class="form-select">
                                    <option value="Sim" ${cliente[9]==='Sim'?'selected':''}>Sim</option>
                                    <option value="Não" ${cliente[9]==='Não'?'selected':''}>Não</option>
                                    <option value="Isento" ${cliente[9]==='Isento'?'selected':''}>Isento</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="rg_orgao_emissor" class="form-label">RG Órgão Emissor:</label>
                                <input type="text" id="rg_orgao_emissor" class="form-control" value="${cliente[10] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="nacionalidade" class="form-label">Nacionalidade:</label>
                                <input type="text" id="nacionalidade" class="form-control" value="${cliente[11] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="naturalidade" class="form-label">Naturalidade:</label>
                                <input type="text" id="naturalidade" class="form-control" value="${cliente[12] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="estado_nascimento" class="form-label">Estado de Nascimento:</label>
                                <input type="text" id="estado_nascimento" class="form-control" value="${cliente[13] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="data_nascimento" class="form-label">Data de Nascimento:</label>
                                <input type="date" id="data_nascimento" class="form-control" value="${cliente[14] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="sexo" class="form-label">Sexo:</label>
                                <select id="sexo" class="form-select">
                                    <option value="Feminino" ${cliente[15]==='Feminino'?'selected':''}>Feminino</option>
                                    <option value="Masculino" ${cliente[15]==='Masculino'?'selected':''}>Masculino</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="profissao" class="form-label">Profissão:</label>
                                <input type="text" id="profissao" class="form-control" value="${cliente[16] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="estado_civil" class="form-label">Estado Civil:</label>
                                <input type="text" id="estado_civil" class="form-control" value="${cliente[17] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="inscricao_municipal" class="form-label">Inscrição Municipal:</label>
                                <input type="text" id="inscricao_municipal" class="form-control" value="${cliente[18] || ''}">
                            </div>
                            <button type="submit" class="btn btn-primary">Atualizar Cliente</button>
                        </form>
                    </div>
                    <div class="tab-pane fade" id="endereco" role="tabpanel">
                        <form id="editar-endereco-form">
                            <div class="mb-3">
                                <label for="cep" class="form-label">CEP:</label>
                                <input type="text" id="cep" class="form-control" value="${cliente[19] || ''}" placeholder="Digite o CEP">
                            </div>
                            <div class="mb-3">
                                <label for="rua" class="form-label">Rua:</label>
                                <input type="text" id="rua" class="form-control" value="${cliente[20] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="numero" class="form-label">Número:</label>
                                <input type="text" id="numero" class="form-control" value="${cliente[21] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="complemento" class="form-label">Complemento:</label>
                                <input type="text" id="complemento" class="form-control" value="${cliente[22] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="bairro" class="form-label">Bairro:</label>
                                <input type="text" id="bairro" class="form-control" value="${cliente[23] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="cidade" class="form-label">Cidade:</label>
                                <input type="text" id="cidade" class="form-control" value="${cliente[24] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="estado" class="form-label">Estado:</label>
                                <input type="text" id="estado" class="form-control" value="${cliente[25] || ''}">
                            </div>
                            <div class="mb-3">
                                <label for="pais" class="form-label">País:</label>
                                <input type="text" id="pais" class="form-control" value="${cliente[26] || ''}">
                            </div>
                            <button type="submit" class="btn btn-primary">Atualizar Endereço</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
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
            const resposta = await fetch(`http://localhost:5000/clientes/${cliente[0]}`, {
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
            const resposta = await fetch(`http://localhost:5000/clientes/${cliente[0]}/endereco`, {
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
}

// Nova função para confirmar a exclusão de um cliente
function confirmarExclusaoCliente(id) {
    if (confirm('Confirma exclusão do cliente?')) {
        excluirCliente(id);
    }
}

// Nova função para abrir o prompt de edição de chamado
function abrirFormularioEdicaoChamado(id, descricao, status) {
    let novoDescricao = prompt('Editar descrição:', descricao);
    if (novoDescricao !== null) {
        editarChamado(id, novoDescricao, status);
    }
}

// Nova função para atualizar chamado via API
async function editarChamado(id, descricao, status) {
    try {
        const resposta = await fetch(`http://localhost:5000/chamados/${id}`, {
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

async function editarCliente(id, nome, email, telefone, endereco) {
    try {
        const resposta = await fetch(`http://localhost:5000/clientes/${id}`, {
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

async function excluirCliente(id) {
    try {
        const resposta = await fetch(`http://localhost:5000/clientes/${id}`, {
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

// Funções para chamados
/**
 * Carrega as opções de clientes em um elemento select.
 * @async
 * @function carregarClientesSelect
 * @returns {Promise<void>} Uma Promise que resolve após carregar os clientes ou rejeita em caso de erro.
 * @throws {Error} Se o elemento select de clientes não for encontrado.
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

            const resposta = await fetch('http://localhost:5000/clientes');
            const data = await resposta.json();
            
            selectClientes.innerHTML = data.clientes.map(cliente => `
                <option value="${cliente[0]}" data-telefone="${cliente[3] || ''}">
                    ${cliente[1]}
                </option>
            `).join('');

            // Configura o listener de mudança
            selectClientes.addEventListener('change', function() {
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
 * Finaliza um chamado, alterando seu status para 'Finalizado'.
 * @async
 * @function finalizarChamado
 * @param {number} id - O ID do chamado a ser finalizado.
 * @returns {Promise<void>} Uma Promise que resolve após a finalização do chamado ou rejeita em caso de erro.
 */
async function finalizarChamado(id) {
    try {
        const resposta = await fetch(`http://localhost:5000/chamados/${id}/finalizar`, {
            method: 'PUT',
        });

        if (resposta.ok) {
            exibirMensagem('Chamado finalizado com sucesso!');
            carregarChamados(); // Recarrega a lista de chamados abertos
            carregarChamados('Finalizado'); // Recarrega a lista de chamados finalizados
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao finalizar chamado:', erro);
        exibirMensagem('Erro ao finalizar chamado', 'erro');
    }
}

/**
 * Exclui um chamado do sistema.
 * @async
 * @function excluirChamado
 * @param {number} id - O ID do chamado a ser excluído.
 * @returns {Promise<void>} Uma Promise que resolve após a exclusão do chamado ou rejeita em caso de erro.
 */
async function excluirChamado(id) {
    // Adiciona confirmação antes de excluir
    if (!confirm('Tem certeza que deseja excluir este chamado?')) {
        return; // Se o usuário clicar em "Cancelar", interrompe a execução
    }

    try {
        const resposta = await fetch(`http://localhost:5000/chamados/${id}`, {
            method: 'DELETE',
        });

        if (resposta.ok) {
            exibirMensagem('Chamado excluído com sucesso!');
            carregarChamados('Aberto');
            carregarChamados('Finalizado');
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao excluir chamado:', erro);
        exibirMensagem('Erro ao excluir chamado', 'erro');
    }
}

// Funções de busca e estatísticas
/**
 * Busca clientes com base em um termo de pesquisa.
 * @async
 * @function buscarClientes
 * @returns {Promise<void>} Uma Promise que resolve após a busca de clientes ou rejeita em caso de erro.
 */
async function buscarClientes() {
    const termo = document.getElementById('busca-cliente').value;
    try {
        const resposta = await fetch(`http://localhost:5000/clientes/buscar?termo=${encodeURIComponent(termo)}`);
        const clientes = await resposta.json();

        const resultadoHTML = clientes.map(cliente => `
            <div class="card mb-2">
                <div class="card-body">
                    <h5>${cliente[1]}</h5>
                    <p>${cliente[2]} | ${cliente[3]}</p>
                    <!-- Alterado para passar o cliente inteiro -->
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
 * Carrega os detalhes de um cliente em um modal.
 * @function carregarDetalhesCliente
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
 * Carrega as estatísticas do sistema, como total de clientes e chamados.
 * @async
 * @function carregarEstatisticas
 * @returns {Promise<void>} Uma Promise que resolve após carregar as estatísticas ou rejeita em caso de erro.
 */
async function carregarEstatisticas() {
    try {
        const resposta = await fetch('http://localhost:5000/estatisticas');
        const dados = await resposta.json();

        // Atualiza estatísticas gerais (Resumo do Sistema)
        const estatisticasGerais = document.getElementById('estatisticas-gerais');
        if (estatisticasGerais) {
            estatisticasGerais.innerHTML = `
                <li class="list-group-item">Total de Clientes: ${dados.total_clientes}</li>
                <li class="list-group-item">Chamados Abertos: ${dados.chamados_status.Aberto || 0}</li>
                <li class="list-group-item">Chamados Finalizados: ${dados.chamados_status.Finalizado || 0}</li>
            `;
        }

        // Atualiza contadores na seção do gráfico
        const totalAbertos = document.getElementById('total-abertos');
        const totalFechados = document.getElementById('total-fechados');
        if (totalAbertos) totalAbertos.textContent = dados.chamados_status.Aberto || 0;
        if (totalFechados) totalFechados.textContent = dados.chamados_status.Finalizado || 0;

        // Atualiza últimos chamados
        const ultimosChamados = document.getElementById('ultimos-chamados');
        if (ultimosChamados) {
            const ultimosChamadosHTML = dados.ultimos_chamados.map(chamado => `
                <div class="list-group-item">
                    <strong>#${chamado[0]}</strong> - ${chamado[2].substring(0, 30)}...
                    <span class="badge bg-${chamado[3] === 'Aberto' ? 'warning' : 'success'} float-end">
                        ${chamado[3]}
                    </span>
                </div>
            `).join('');
            ultimosChamados.innerHTML = ultimosChamadosHTML;
        }

        // Inicializa o gráfico apenas se o elemento canvas existir
        const canvas = document.getElementById('grafico-chamados');
        if (canvas) {
            inicializarGrafico(dados);
        }
    } catch (erro) {
        console.error('Erro ao carregar estatísticas:', erro);
    }
}

/**
 * Inicializa o gráfico de chamados com os dados fornecidos.
 * @function inicializarGrafico
 * @param {object} dados - Os dados para inicializar o gráfico.
 */
function inicializarGrafico(dados) {
    const ctx = document.getElementById('grafico-chamados').getContext('2d');
    if (graficoChamados) {
        graficoChamados.destroy();
    }
    // Define legend color based on dark mode status
    const legendColor = document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000';
    graficoChamados = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Abertos', 'Finalizados'],
            datasets: [{
                data: [dados.chamados_status.Aberto || 0, dados.chamados_status.Finalizado || 0],
                backgroundColor: ['#ff6384', '#36a2eb']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: legendColor
                    }
                }
            }
        }
    });
}

// Utilitários
/**
 * Exibe a tela de carregamento.
 * @function showLoading
 */
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

/**
 * Oculta a tela de carregamento.
 * @function hideLoading
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

/**
 * Realiza uma requisição fetch com tela de carregamento.
 * @async
 * @function fetchWithLoading
 * @param {string} url - A URL da requisição.
 * @param {object} options - As opções da requisição fetch.
 * @returns {Promise<object>} Uma Promise que resolve com os dados da resposta ou rejeita em caso de erro.
 * @throws {Error} Se a resposta não for ok ou se ocorrer um erro na requisição.
 */
async function fetchWithLoading(url, options = {}) {
    showLoading();
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.erro || 'Erro na requisição');
        }
        return await response.json();
    } catch (error) {
        exibirMensagem(error.message, 'erro');
        throw error;
    } finally {
        hideLoading();
    }
}

// Novas funções de paginação para chamados
/**
 * Avança para a próxima página de chamados.
 * @function proximaPaginaChamados
 * @param {string} [status='Aberto'] - O status dos chamados a serem carregados.
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
 * Retorna para a página anterior de chamados.
 * @function paginaAnteriorChamados
 * @param {string} [status='Aberto'] - O status dos chamados a serem carregados.
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

// Atualizações automáticas
let refreshInterval;

/**
 * Inicia o ciclo de atualização automática das estatísticas.
 * @function startAutoRefresh
 */
function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            carregarEstatisticas();
        }
    }, 30000); // Atualiza a cada 30 segundos
}

/**
 * Interrompe o ciclo de atualização automática das estatísticas.
 * @function stopAutoRefresh
 */
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Aplique o tema salvo se existir
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').textContent = '🌙';
    }
    carregarHome();
    startAutoRefresh();
    exibirInfoUsuario(); // Adiciona esta linha
    checkAdminStatus();
    startSessionMonitor();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        carregarEstatisticas();
    }
});

/**
 * Carrega a página para criar um novo cliente.
 * @function carregarNovoClientePage
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
                                <input type="email" id="email" class="form-control">
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
            const resposta = await fetch('http://localhost:5000/clientes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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
 * Carrega a página de detalhes de um chamado específico.
 * @async
 * @function carregarDetalhesChamadoPage
 * @param {number} id - O ID do chamado a ser carregado.
 */
async function carregarDetalhesChamadoPage(id) {
    try {
        const response = await fetch(`http://localhost:5000/chamados/${id}`);
        const chamado = await response.json();
        if (chamado.erro) {
            exibirMensagem(chamado.erro, 'erro');
            return;
        }
        const isFinalizado = chamado.status === 'Finalizado';
        currentChamadoId = id; // Store the current chamado ID
        isDescriptionVisible = true; // Reset to description visible on load

        // Replace the cliente input group with this new version
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

        // Update the template to use the new clienteHTML
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
                        ${!isFinalizado ? `
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                        ` : ''}
                    </form>
                </div>
            </div>
        `;

        // Function to render progress entries
        function renderAndamentos() {
            const andamentosCarousel = document.getElementById('andamentos-carousel');
            const status = document.getElementById('status').value;
            andamentosCarousel.innerHTML = '';

            // If finalized, don't add the empty entry for new progress
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
            prevButton.onclick = function() {
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
            nextButton.onclick = function() {
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
                const chamadoAtualizado = {
                    assunto: document.getElementById('assunto').value,
                    descricao: document.getElementById('descricao').value,
                    telefone: document.getElementById('telefone_chamado').value,
                    status: chamado.status
                };
                try {
                    const resposta = await fetch(`http://localhost:5000/chamados/${chamado.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(chamadoAtualizado)
                    });
                    if (response.ok) {
                        exibirMensagem('Chamado atualizado com sucesso!');
                        carregarChamadosPage();
                    } else {
                        const erro = await resposta.json();
                        exibirMensagem(`Erro: ${erro.erro}`, 'erro');
                    }
                } catch (erro) {
                    console.error('Erro ao atualizar chamado:', erro);
                    exibirMensagem('Erro ao atualizar chamado', 'erro');
                }
            };
        }
    } catch (erro) {
        console.error('Erro ao carregar detalhes do chamado:', erro);
        exibirMensagem('Erro ao carregar detalhes do chamado', 'erro');
    }
}

/**
 * Lógica para alternar tema entre dark e light mode.
 * @function
 */
document.getElementById('theme-toggle').addEventListener('click', function() {
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
 * Ordena os chamados com base no campo especificado.
 * @function sortChamados
 * @param {string} field - O campo pelo qual os chamados serão ordenados.
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
 * Abre a página de detalhes do chamado.
 * @function abrirDetalhesChamado
 * @param {number} id - O ID do chamado a ser aberto.
 */
function abrirDetalhesChamado(id) {
    if (id) {
        carregarDetalhesChamadoPage(id);
    } else {
        exibirMensagem('Selecione um chamado', 'erro');
    }
}

/**
 * Exclui o chamado selecionado.
 * @function excluirChamadoSelecionado
 */
function excluirChamadoSelecionado() {
    if (!selectedChamadoId) {
        exibirMensagem('Nenhum chamado selecionado!', 'erro');
        return;
    }
    excluirChamado(selectedChamadoId);
}

let selectedClienteId = null;
let selectedCliente = null;

/**
 * Carrega a página de edição do cliente selecionado.
 * @function editarClienteSelecionado
 */
function editarClienteSelecionado() {
    if (selectedClienteId) {
        carregarEditarClientePage(selectedCliente);
    } else {
        exibirMensagem('Selecione um cliente para editar.', 'erro');
    }
}

/**
 * Exclui o cliente selecionado após confirmação.
 * @function excluirClienteSelecionado
 */
function excluirClienteSelecionado() {
    if (selectedClienteId) {
        confirmarExclusaoCliente(selectedClienteId);
    } else {
        exibirMensagem('Selecione um cliente para excluir.', 'erro');
    }
}

/**
 * Variável global para controlar a visibilidade da descrição e dos andamentos.
 * @type {boolean}
 */
let isDescriptionVisible = true;

/**
 * Variável global para armazenar o índice do andamento atual.
 * @type {number}
 */
let currentAndamentoIndex = -1;

/**
 * Variável global para armazenar o ID do chamado atual.
 * @type {number}
 */
let currentChamadoId = null;

/**
 * Alterna a visibilidade entre a seção de descrição e a seção de andamentos.
 * @function toggleDescriptionVisibility
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
 * Renderiza os andamentos do chamado.
 * @function renderAndamentos
 */
function renderAndamentos() {
    const andamentosCarousel = document.getElementById('andamentos-carousel');
    const status = document.getElementById('status').value;
    andamentosCarousel.innerHTML = '';

    // If finalized, don't add the empty entry for new progress
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
    prevButton.onclick = function() {
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
    nextButton.onclick = function() {
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
 * Adiciona um novo andamento ao chamado.
 * @async
 * @function adicionarNovoAndamento
 * @param {number} chamadoId - O ID do chamado ao qual o andamento será adicionado.
 */
window.adicionarNovoAndamento = async (chamadoId) => {
    const texto = prompt('Digite o novo andamento:');
    if (texto) {
        try {
            const response = await fetch(`http://localhost:5000/chamados/${chamadoId}/andamentos`, {
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
 * Exclui um andamento existente do chamado.
 * @async
 * @function excluirAndamento
 * @param {number} andamentoId - O ID do andamento a ser excluído.
 */
window.excluirAndamento = async (andamentoId) => {
    const status = document.getElementById('status').value;
    if (status === 'Finalizado') {
        exibirMensagem('Não é possível excluir andamentos em chamados finalizados', 'erro');
        return;
    }

    if (confirm('Confirma a exclusão deste andamento?')) {
        try {
            const response = await fetch(`http://localhost:5000/chamados/andamentos/${andamentoId}`, {
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
 * Salva um novo andamento para o chamado.
 * Verifica o status antes de salvar.
 * @async
 * @function salvarAndamento
 * @param {number} chamadoId - O ID do chamado.
 * @param {string} texto - O texto do andamento a ser salvo.
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
        const response = await fetch(`http://localhost:5000/chamados/${chamadoId}/andamentos`, {
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
 * Configura a busca de clientes no campo de busca.
 * @function configurarBuscaClientes
 */
function configurarBuscaClientes() {
    const buscaInput = document.getElementById('busca-cliente');
    if (buscaInput) {
        buscaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarClientes();
            }
        });
    }
}

// Função para verificar se o usuário é admin após o login
async function checkAdminStatus() {
    const response = await fetch('/auth/check-role');
    const data = await response.json();
    if (data.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    }
}

// Função para carregar a página de gerenciamento de usuários
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

// Função para carregar a lista de usuários
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
            row.addEventListener('click', function() {
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

// Adicione estas novas funções para manipular a seleção
let selectedUserId = null;
let selectedUsername = null;

function editarUsuarioSelecionado() {
    if (!selectedUserId) {
        exibirMensagem('Selecione um usuário para editar', 'erro');
        return;
    }
    editarUsuario(selectedUserId);
}

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

// Função para abrir o modal de novo usuário
function abrirModalNovoUsuario() {
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-form').reset();
    document.querySelector('#usuarioModal .modal-title').textContent = 'Novo Usuário';
    new bootstrap.Modal(document.getElementById('usuarioModal')).show();
}

// Função para salvar usuário (novo ou edição)
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

// Função para editar usuário
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

// Função para excluir usuário
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

// Adicione esta linha ao final do evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    checkAdminStatus(); // Verifica se o usuário é admin ao carregar a página
});

// Função para fazer logout
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

// Função para exibir informações do usuário logado
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

// Adicione esta nova função
async function reabrirChamado(id) {
    try {
        const resposta = await fetch(`http://localhost:5000/chamados/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'Aberto',
                data_fechamento: null 
            })
        });

        if (resposta.ok) {
            exibirMensagem('Chamado reaberto com sucesso!');
            carregarChamados('Finalizado');
            carregarChamados('Aberto');
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao reabrir chamado:', erro);
        exibirMensagem('Erro ao reabrir chamado', 'erro');
    }
}

// Modifique a função carregarChamadosFinalizados
function carregarChamadosFinalizados() {
    document.getElementById('chamados-content').innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h2 class="mb-4">Chamados Finalizados</h2>
                
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
}

// Modifique a parte do código que adiciona os event listeners nas linhas da tabela
// Dentro da função carregarChamados, na parte que trata chamados finalizados:
if (status === 'Finalizado') {
    document.querySelectorAll("#chamados-finalizados tr").forEach(row => {
        row.addEventListener('click', function() {
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

// Add this new function to show client details in a modal
async function mostrarDetalhesCliente(clienteId) {
    try {
        const response = await fetch(`http://localhost:5000/clientes/${clienteId}`);
        if (!response.ok) {
            throw new Error('Cliente não encontrado');
        }
        
        const cliente = await response.json();
        
        // Create a modal dynamically with all client fields
        const modalHtml = `
            <div class="modal fade" id="clienteDetalhesModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalhes do Cliente #${cliente.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="nav nav-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#dados-cliente">
                                        Dados Principais
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#dados-complementares">
                                        Dados Complementares
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#documentos">
                                        Documentos
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#endereco-cliente">
                                        Endereço
                                    </a>
                                </li>
                            </ul>
                            <div class="tab-content pt-3">
                                <div class="tab-pane fade show active" id="dados-cliente">
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

                                <div class="tab-pane fade" id="dados-complementares">
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

                                <div class="tab-pane fade" id="documentos">
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

                                <div class="tab-pane fade" id="endereco-cliente">
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

        // Remove existing modal if any
        const existingModal = document.getElementById('clienteDetalhesModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add the modal to the document
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('clienteDetalhesModal'));
        modal.show();

    } catch (erro) {
        console.error('Erro ao carregar detalhes do cliente:', erro);
        exibirMensagem('Erro ao carregar detalhes do cliente', 'erro');
    }
}
