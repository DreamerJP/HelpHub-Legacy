/* ===== FUNÇÕES ESPECÍFICAS PARA A PÁGINA HOME ===== */

// Variáveis globais para a home
let graficoChamados; // Para armazenar a instância do gráfico de chamados
let refreshInterval; // Para controle de atualização automática

/**
 * Carrega a página home com todas as funcionalidades
 */
function carregarHome() {
    // Carrega as estatísticas apenas uma vez ao entrar na página inicial
    carregarEstatisticas('total');
    configurarDropdownPeriodo();
    configurarBuscaClientes();
    configurarCampoBuscaCliente();
}

/**
 * Carrega as estatísticas do sistema
 * @param {string} periodo - Período das estatísticas (total, mensal, semanal, diario)
 */
async function carregarEstatisticas(periodo = 'total') {
    try {
        showLoading();
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
            const ultimosChamadosContainer = document.getElementById('ultimos-chamados-lista');
            if (ultimosChamadosContainer) {
                if (dados.ultimos_chamados && dados.ultimos_chamados.length > 0) {
                    renderizarUltimosChamados(dados.ultimos_chamados);
                } else {
                    ultimosChamadosContainer.innerHTML = '<div class="text-center text-muted">Nenhum chamado registrado</div>';
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    } finally {
        hideLoading();
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
        labels: ['Abertos', 'Fechados'],
        datasets: [{
            label: 'Chamados',
            data: [dados.chamados_abertos, dados.chamados_fechados],
            backgroundColor: ['#FFD600', '#43A047'],
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    // Cria um novo gráfico
    graficoChamados = new Chart(ctx, {
        type: 'bar',
        data: dadosGrafico,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Configura o dropdown de período das estatísticas
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
 * Retorna o texto descritivo do período
 * @param {string} periodo - Período selecionado
 * @returns {string} Texto descritivo
 */
function getPeriodoText(periodo) {
    const periodos = {
        'total': 'Todo o período',
        'mensal': 'Mês atual',
        'semanal': 'Semana atual',
        'diario': 'Hoje'
    };
    return periodos[periodo] || 'Todo o período';
}

/**
 * Configura a busca de clientes na home
 */
function configurarBuscaClientes() {
    const searchInput = document.getElementById('busca-cliente');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const termo = this.value.trim();
            if (termo.length >= 3) {
                buscarClientesAjax(termo);
            } else {
                document.getElementById('resultado-busca').innerHTML = '';
            }
        });
    }
}

/**
 * Realiza busca de clientes via AJAX
 * @param {string} termo - Termo de busca
 */
async function buscarClientesAjax(termo) {
    try {
        const response = await fetch(`/buscar-clientes?termo=${encodeURIComponent(termo)}`);
        const clientes = await response.json();

        const resultadoBusca = document.getElementById('resultado-busca');
        resultadoBusca.innerHTML = '';

        if (clientes.length > 0) {
            const lista = document.createElement('div');
            lista.className = 'list-group';

            clientes.slice(0, 5).forEach(cliente => {
                const item = document.createElement('a');
                item.href = '#';
                item.className = 'list-group-item list-group-item-action';
                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${cliente.nome}</strong>
                            <br>
                            <small class="text-muted">ID: ${cliente.id}</small>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="novoChamadoCliente(${cliente.id})">
                            <i class="bi bi-plus-circle"></i> Novo Chamado
                        </button>
                    </div>
                `;
                item.addEventListener('click', function (e) {
                    e.preventDefault();
                    mostrarDetalhesCliente(cliente.id);
                });
                lista.appendChild(item);
            });

            resultadoBusca.appendChild(lista);
        } else {
            resultadoBusca.innerHTML = '<div class="text-muted p-2">Nenhum cliente encontrado</div>';
        }
    } catch (error) {
        console.error('Erro na busca de clientes:', error);
    }
}

/**
 * Configura os eventos do campo de busca de clientes na home (autocomplete, limpar, atalho para detalhes)
 */
function configurarCampoBuscaCliente() {
    const searchInput = document.getElementById('busca-cliente');
    const clearButton = document.getElementById('clear-search');
    const resultadoBusca = document.getElementById('resultado-busca');

    if (!searchInput || !clearButton || !resultadoBusca) return;

    // Remove event listeners anteriores para evitar duplicação
    const newClearButton = clearButton.cloneNode(true);
    clearButton.parentNode.replaceChild(newClearButton, clearButton);

    // Configura novo event listener para o input
    searchInput.addEventListener('input', async function () {
        newClearButton.style.display = this.value ? 'block' : 'none';
        if (!this.value || this.value.trim().length < 3) {
            resultadoBusca.innerHTML = '';
            return;
        }
        try {
            showLoading();
            const res = await fetch(`/clientes/buscar?termo=${encodeURIComponent(this.value)}`);
            if (!res.ok) throw new Error('Erro ao buscar clientes');
            const clientes = await res.json();
            if (!Array.isArray(clientes) || clientes.length === 0) {
                resultadoBusca.innerHTML = '<div class="text-muted small p-2">Nenhum cliente encontrado</div>';
                return;
            }
            resultadoBusca.innerHTML = clientes.map(c => `
                <div class="list-group-item list-group-item-action" style="cursor:pointer" onclick="mostrarDetalhesCliente(${c.id})">
                    <strong>#${c.id}</strong> - ${c.nome} <span class="text-muted">${c.email || ''}</span>
                </div>
            `).join('');
        } catch (e) {
            resultadoBusca.innerHTML = '<div class="text-danger small p-2">Erro ao buscar clientes</div>';
        } finally {
            hideLoading();
        }
    });

    // Configura novo event listener para o botão limpar
    newClearButton.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        resultadoBusca.innerHTML = '';
        this.style.display = 'none';
    });

    // Define estado inicial do botão
    newClearButton.style.display = searchInput.value ? 'block' : 'none';
}

/**
 * Inicia o ciclo de atualização automática das estatísticas
 */
function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            carregarEstatisticas(document.getElementById('periodo-estatisticas')?.value || 'total');
        }
    }, 120000); // 2 minutos
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

/**
 * Formata uma data para exibição
 * @param {string} dataString - Data em formato string
 * @returns {string} Data formatada
 */
function formatarData(dataString) {
    if (!dataString) return '';

    const data = new Date(dataString);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    if (data.toDateString() === hoje.toDateString()) {
        return `Hoje às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (data.toDateString() === ontem.toDateString()) {
        return `Ontem às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/** Exibe o spinner de loading global */
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

/** Oculta o spinner de loading global */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// ===== INICIALIZAÇÃO QUANDO A PÁGINA CARREGA =====

document.addEventListener('DOMContentLoaded', function () {
    // Carrega a página home
    carregarHome();

    // Inicia atualização automática
    startAutoRefresh();
});

// Atualiza estatísticas quando a página fica visível
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        carregarEstatisticas(document.getElementById('periodo-estatisticas')?.value || 'total');
    }
});

// Funções que podem ser chamadas de outras páginas
window.carregarHome = carregarHome;
window.carregarEstatisticas = carregarEstatisticas;
window.abrirDetalhesChamado = async function (id) {
    try {
        showLoading();
        const resp = await fetch(`/chamados/${id}`);
        const data = await resp.json();
        if (!data.erro && typeof mostrarModalChamado === 'function') {
            mostrarModalChamado(data);
        } else {
            alert('Não foi possível abrir o chamado.');
        }
    } catch (e) {
        alert('Erro ao buscar detalhes do chamado.');
    } finally {
        hideLoading();
    }
};
window.novoChamadoCliente = function (clienteId) {
    // Redireciona para criar novo chamado
    window.location.href = `/novo-chamado?cliente=${clienteId}`;
};
window.mostrarDetalhesCliente = async function (id) {
    try {
        showLoading();
        const resp = await fetch(`/clientes/${id}`);
        if (!resp.ok) throw new Error('Erro ao buscar cliente');
        const cliente = await resp.json();
        const modalBody = document.getElementById('modal-detalhe-cliente-body');
        const btnCadastro = document.getElementById('btn-acessar-cadastro-cliente');
        if (!cliente || cliente.erro) {
            modalBody.innerHTML = '<div class="text-danger">Não foi possível carregar os dados do cliente.</div>';
            if (btnCadastro) btnCadastro.style.display = 'none';
        } else {
            modalBody.innerHTML = `
                <div class="row mb-2">
                    <div class="col-md-6"><strong>Nome:</strong> ${cliente.nome || '-'}</div>
                    <div class="col-md-6"><strong>Email:</strong> ${cliente.email || '-'}</div>
                </div>
                <div class="row mb-2">
                    <div class="col-md-6"><strong>Telefone:</strong> ${cliente.telefone || '-'}</div>
                    <div class="col-md-6"><strong>Empresa:</strong> ${cliente.empresa || '-'}</div>
                </div>
                <div class="row mb-2">
                    <div class="col-md-6"><strong>Endereço:</strong> ${cliente.endereco || '-'}</div>
                    <div class="col-md-6"><strong>Cidade:</strong> ${cliente.cidade || '-'}</div>
                </div>
                <div class="row mb-2">
                    <div class="col-md-6"><strong>ID:</strong> ${cliente.id || '-'}</div>
                </div>
            `;
            if (btnCadastro) {
                btnCadastro.style.display = '';
                btnCadastro.onclick = function () {
                    window.location.href = `/p/clientes-detalhes?id=${cliente.id}`;
                };
            }
        }
        const modal = new bootstrap.Modal(document.getElementById('modal-detalhe-cliente'));
        modal.show();
    } catch (e) {
        const modalBody = document.getElementById('modal-detalhe-cliente-body');
        modalBody.innerHTML = '<div class="text-danger">Erro ao buscar dados do cliente.</div>';
        const btnCadastro = document.getElementById('btn-acessar-cadastro-cliente');
        if (btnCadastro) btnCadastro.style.display = 'none';
        const modal = new bootstrap.Modal(document.getElementById('modal-detalhe-cliente'));
        modal.show();
    } finally {
        hideLoading();
    }
};

// Função para exibir modal de detalhes do chamado (dashboard)
function mostrarModalChamado(chamado) {
    let modal = document.getElementById('modal-detalhe-chamado');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-detalhe-chamado';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-folder2-open"></i> Detalhes do Chamado</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-2">
                        <div class="col-md-6"><strong>Protocolo:</strong> ${chamado.protocolo || '-'}</div>
                        <div class="col-md-6"><strong>Status:</strong> ${chamado.status || '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6"><strong>Cliente:</strong> ${chamado.cliente_nome || '-'}</div>
                        <div class="col-md-6"><strong>Assunto:</strong> ${chamado.assunto || '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6"><strong>Descrição:</strong> ${chamado.descricao || '-'}</div>
                        <div class="col-md-6"><strong>Telefone:</strong> ${chamado.telefone || '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6"><strong>Solicitante:</strong> ${chamado.solicitante || '-'}</div>
                        <div class="col-md-6"><strong>Data de Abertura:</strong> ${chamado.data_abertura || '-'}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6"><strong>Data de Fechamento:</strong> ${chamado.data_fechamento || '-'}</div>
                    </div>
                    <hr>
                    <h6>Andamentos / Histórico</h6>
                    <ul class="timeline list-unstyled" id="detalhe-chamado-andamentos">
                        ${(chamado.andamentos && chamado.andamentos.length > 0)
            ? chamado.andamentos.map(a => `
                                <li class="mb-3">
                                    <div><span class="badge bg-secondary">${a.data_hora}</span></div>
                                    <div class="mt-1">${a.texto}</div>
                                </li>
                            `).join('')
            : '<li class="text-muted">Nenhum andamento registrado.</li>'}
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    <button type="button" class="btn btn-primary" id="btn-acessar-chamado">Acessar Chamado</button>
                </div>
            </div>
        </div>`;
    const bsModal = new bootstrap.Modal(modal);
    setTimeout(() => {
        const btnAcessar = document.getElementById('btn-acessar-chamado');
        if (btnAcessar) {
            btnAcessar.onclick = function () {
                window.location.href = `/p/chamados?id=${chamado.id}`;
            };
        }
    }, 100);
    bsModal.show();
}

// Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A
(function () {
    const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    let pos = 0;
    window.addEventListener('keydown', function (e) {
        if (e.keyCode === konami[pos]) {
            pos++;
            if (pos === konami.length) {
                window.open('/p/snake', '_blank');
                pos = 0;
            }
        } else {
            pos = 0;
        }
    });
})();

function renderizarUltimosChamados(chamados) {
    const lista = document.getElementById('ultimos-chamados-lista');
    lista.innerHTML = '';

    if (!chamados || chamados.length === 0) {
        lista.innerHTML = '<div class="text-center text-muted">Nenhum chamado registrado</div>';
        return;
    }

    chamados.slice(0, 5).forEach(chamado => {
        const item = document.createElement('div');
        item.className = 'ultimo-chamado-item';
        item.innerHTML = `
            <div class="ultimo-chamado-info">
                <div class="ultimo-chamado-cliente">${chamado.cliente_nome || chamado.cliente || 'Cliente não informado'}</div>
                <div class="ultimo-chamado-assunto">${chamado.assunto || 'Sem assunto'}</div>
                <div class="ultimo-chamado-data">${formatarData(chamado.data_abertura)}</div>
            </div>
            <button class="ultimo-chamado-btn" onclick="abrirDetalhesChamado(${chamado.id})">Visualizar</button>
        `;
        lista.appendChild(item);
    });
} 