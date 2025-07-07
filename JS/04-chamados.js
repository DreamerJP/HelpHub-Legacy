// Variáveis globais de chamados
let paginaAtualChamadosAbertos = 1;
let paginaAtualChamadosFinalizados = 1;
const limiteChamados = 10;
let selectedChamadoId = null;
let currentChamadoSortField = '';
let currentChamadoSortOrder = 'asc';
let currentChamadoId = null;
let lastSelectedChamadoId = null;

// Inicialização ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('chamado-form')) {
        configurarFormularioChamado();
        configurarBuscaClienteChamado();
        // Preencher cliente automaticamente se cliente_id na query
        const params = new URLSearchParams(window.location.search);
        const clienteId = params.get('cliente_id');
        if (clienteId) {
            fetch(`/clientes/${clienteId}`)
                .then(res => res.json())
                .then(cliente => {
                    if (cliente && cliente.id && cliente.nome) {
                        document.getElementById('cliente_busca').value = cliente.nome;
                        document.getElementById('cliente_id').value = cliente.id;
                    }
                });
        }
    }
    if (document.getElementById('chamados-list')) {
        carregarChamados('Aberto');
        configurarPesquisaChamados('aberto');
    }
    if (document.getElementById('chamados-finalizados')) {
        carregarChamados('Finalizado');
        configurarPesquisaChamados('finalizado');
    }
    // Abrir modal automaticamente se chamado_id ou id na query string
    const params = new URLSearchParams(window.location.search);
    const chamadoId = params.get('chamado_id') || params.get('id');
    if (chamadoId) {
        setTimeout(() => {
            fetch(`/chamados/${chamadoId}`)
                .then(r => r.json())
                .then(data => {
                    if (!data.erro) mostrarModalChamado(data);
                });
        }, 500);
    }
});

// Função para carregar chamados (abertos ou finalizados)
function carregarChamados(status = 'Aberto') {
    try {
        const paginaAtual = status === 'Aberto' ? paginaAtualChamadosAbertos : paginaAtualChamadosFinalizados;
        const url = `/chamados?pagina=${paginaAtual}&limite=${limiteChamados}&status=${status}`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.chamados === undefined) throw new Error('Formato de resposta inválido');
                let chamadosArray = data.chamados.slice();
                if (currentChamadoSortField) {
                    chamadosArray.sort((a, b) => {
                        let fieldIndex;
                        if (currentChamadoSortField === 'protocolo') fieldIndex = 6;
                        else if (currentChamadoSortField === 'cliente') fieldIndex = 1;
                        else if (currentChamadoSortField === 'data') fieldIndex = 4;
                        else if (currentChamadoSortField === 'assunto') fieldIndex = 7;
                        let A = a[fieldIndex] ? a[fieldIndex].toString().toUpperCase() : '';
                        let B = b[fieldIndex] ? b[fieldIndex].toString().toUpperCase() : '';
                        if (currentChamadoSortField === 'data') {
                            A = new Date(a[fieldIndex]);
                            B = new Date(b[fieldIndex]);
                        }
                        if (A < B) return currentChamadoSortOrder === 'asc' ? -1 : 1;
                        if (A > B) return currentChamadoSortOrder === 'asc' ? 1 : -1;
                        return 0;
                    });
                }
                if (status === 'Aberto') {
                    renderizarChamadosAbertos(chamadosArray, data.total_paginas, paginaAtual);
                } else {
                    renderizarChamadosFinalizados(chamadosArray, data.total_paginas, paginaAtual);
                }
            })
            .catch(erro => {
                exibirMensagem('Erro ao carregar chamados', 'erro');
                console.error(erro);
            });
    } catch (e) {
        exibirMensagem('Erro ao carregar chamados', 'erro');
        console.error(e);
    }
}

function renderizarChamadosAbertos(chamados, totalPaginas, paginaAtual) {
    const container = document.getElementById('chamados-list');
    if (!container) return;
    container.innerHTML = chamados.map(chamado => {
        const protocolo = chamado[6] ? chamado[6].replace(/\D/g, '') : 'N/A';
        const clienteId = chamado[1] || 'N/A';
        const clienteNome = chamado[10] || 'Cliente removido';
        const dataAbertura = chamado[4];
        const assunto = chamado[7] || '';
        return `<tr data-id="${chamado[0]}" style="cursor:pointer;">
                    <td>${protocolo}</td>
                    <td>#${clienteId}</td>
                    <td>${clienteNome}</td>
                    <td>${dataAbertura}</td>
                    <td>${assunto}</td>
                    <td><span class="status-badge status-${chamado[3].toLowerCase()}">${chamado[3]}</span></td>
                </tr>`;
    }).join('');
    document.getElementById('btn-abrir').disabled = true;
    document.getElementById('btn-ordem-servico').disabled = true;
    document.getElementById('btn-finalizar').disabled = true;
    document.getElementById('btn-excluir').disabled = true;
    document.querySelectorAll('#chamados-list tr').forEach(row => {
        row.addEventListener('click', function () {
            document.querySelectorAll('#chamados-list tr').forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
            selectedChamadoId = this.getAttribute('data-id');
            lastSelectedChamadoId = selectedChamadoId;
            document.getElementById('btn-abrir').disabled = false;
            document.getElementById('btn-ordem-servico').disabled = false;
            document.getElementById('btn-finalizar').disabled = false;
            document.getElementById('btn-excluir').disabled = false;
        });
        if (row.getAttribute('data-id') === lastSelectedChamadoId) {
            row.classList.add('selected');
            document.getElementById('btn-abrir').disabled = false;
            document.getElementById('btn-ordem-servico').disabled = false;
            document.getElementById('btn-finalizar').disabled = false;
            document.getElementById('btn-excluir').disabled = false;
        }
    });
    document.getElementById('btn-anterior-chamados-aberto').disabled = paginaAtual === 1;
    document.getElementById('btn-proximo-chamados-aberto').disabled = paginaAtual >= totalPaginas;
    document.getElementById('pagina-atual-chamados-aberto').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
}

function renderizarChamadosFinalizados(chamados, totalPaginas, paginaAtual) {
    const container = document.getElementById('chamados-finalizados');
    if (!container) return;
    container.innerHTML = chamados.map(chamado => {
        const protocolo = chamado[6] ? chamado[6].replace(/\D/g, '') : 'N/A';
        const clienteId = chamado[1] || 'N/A';
        const clienteNome = chamado[10] || 'Cliente removido';
        const dataAbertura = chamado[4];
        const dataFechamento = chamado[5] || '';
        const assunto = chamado[7] || '';
        return `<tr data-id="${chamado[0]}" style="cursor:pointer;">
                    <td>${protocolo}</td>
                    <td>#${clienteId}</td>
                    <td>${clienteNome}</td>
                    <td>${dataAbertura}</td>
                    <td>${assunto}</td>
                    <td>${dataFechamento}</td>
                    <td><span class="status-badge status-${chamado[3].toLowerCase()}">${chamado[3]}</span></td>
                </tr>`;
    }).join('');
    document.getElementById('btn-abrir-finalizado').disabled = true;
    document.getElementById('btn-ordem-servico-finalizado').disabled = true;
    document.getElementById('btn-reabrir').disabled = true;
    document.getElementById('btn-excluir-finalizado').disabled = true;
    document.querySelectorAll('#chamados-finalizados tr').forEach(row => {
        row.addEventListener('click', function () {
            document.querySelectorAll('#chamados-finalizados tr').forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
            selectedChamadoId = this.getAttribute('data-id');
            lastSelectedChamadoId = selectedChamadoId;
            document.getElementById('btn-abrir-finalizado').disabled = false;
            document.getElementById('btn-ordem-servico-finalizado').disabled = false;
            document.getElementById('btn-reabrir').disabled = false;
            document.getElementById('btn-excluir-finalizado').disabled = false;
        });
        if (row.getAttribute('data-id') === lastSelectedChamadoId) {
            row.classList.add('selected');
            document.getElementById('btn-abrir-finalizado').disabled = false;
            document.getElementById('btn-ordem-servico-finalizado').disabled = false;
            document.getElementById('btn-reabrir').disabled = false;
            document.getElementById('btn-excluir-finalizado').disabled = false;
        }
    });
    document.getElementById('btn-anterior-chamados-finalizado').disabled = paginaAtual === 1;
    document.getElementById('btn-proximo-chamados-finalizado').disabled = paginaAtual >= totalPaginas;
    document.getElementById('pagina-atual-chamados-finalizado').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
}

function proximaPaginaChamados(status = 'Aberto') {
    if (status === 'Aberto') {
        paginaAtualChamadosAbertos++;
    } else {
        paginaAtualChamadosFinalizados++;
    }
    carregarChamados(status);
}

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

function sortChamados(field) {
    if (field !== 'data') return; // Só permite ordenação por data
    if (currentChamadoSortField === field) {
        currentChamadoSortOrder = currentChamadoSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentChamadoSortField = field;
        currentChamadoSortOrder = 'asc';
    }
    if (document.getElementById('conteudo-abertos').style.display !== 'none') {
        carregarChamados('Aberto');
    } else {
        carregarChamados('Finalizado');
    }
}

function abrirDetalhesChamado(id) {
    if (id) {
        currentChamadoId = id;
        fetch(`/chamados/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.id) {
                    mostrarModalChamado(data);
                } else {
                    exibirMensagem('Detalhes do chamado não encontrados', 'erro');
                }
            })
            .catch(() => {
                exibirMensagem('Erro ao buscar detalhes do chamado', 'erro');
            });
    } else {
        exibirMensagem('Selecione um chamado primeiro', 'erro');
    }
}

// Função para exibir os detalhes do chamado em um modal aprimorado
function mostrarModalChamado(chamado) {
    let modal = document.getElementById('modal-detalhe-chamado');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-detalhe-chamado';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        document.body.appendChild(modal);
    }
    // Montar conteúdo do modal
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-folder2-open"></i> Detalhes do Chamado</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="detalhe-chamado-campos"></div>
                    <hr>
                    <h6>Andamentos / Histórico</h6>
                    <ul class="timeline list-unstyled" id="detalhe-chamado-andamentos"></ul>
                    ${chamado.status === 'Aberto' ? `
                    <div class="mt-3">
                        <textarea class="form-control" id="novo-andamento-texto" rows="2" placeholder="Adicionar novo andamento..."></textarea>
                        <button class="btn btn-outline-primary mt-2" id="btn-adicionar-andamento"><i class="bi bi-plus-circle"></i> Adicionar Andamento</button>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Fechar</button>
                    ${chamado.status === 'Aberto' ? `
                        <button type="button" class="btn btn-primary" id="btn-finalizar-chamado"><i class="bi bi-check-circle"></i> Finalizar Chamado</button>
                        <button type="button" class="btn btn-primary" id="btn-editar-chamado"><i class="bi bi-pencil"></i> Editar</button>
                    ` : ''}
            </div>
            </div>
        </div>`;
    // Preencher campos principais
    const campos = [
        { label: 'Descrição', value: chamado.descricao, id: 'campo-descricao', editable: true, tipo: 'textarea' },
        { label: 'Protocolo', value: chamado.protocolo },
        { label: 'Status', value: chamado.status },
        { label: 'Cliente', value: chamado.cliente_nome },
        { label: 'Assunto', value: chamado.assunto, id: 'campo-assunto', editable: true },
        { label: 'Telefone', value: chamado.telefone, id: 'campo-telefone', editable: true },
        { label: 'Solicitante', value: chamado.solicitante, id: 'campo-solicitante', editable: true },
        { label: 'Data de Abertura', value: chamado.data_abertura },
        { label: 'Data de Fechamento', value: chamado.data_fechamento || '-' }
    ];
    document.getElementById('detalhe-chamado-campos').innerHTML = `
        <div class="row">
            ${campos.map((c, idx) => {
        if (c.id === 'campo-descricao') {
            if (c.editable && chamado.status === 'Aberto') {
                return `<div class="col-12 mb-2"><strong>${c.label}:</strong> <textarea class="form-control form-control-sm" id="${c.id}" rows="4" style="resize:vertical;">${c.value || ''}</textarea></div>`;
            } else {
                return `<div class="col-12 mb-2"><strong>${c.label}:</strong> <div class="form-control-plaintext" style="min-height:3em;">${c.value || '-'}</div></div>`;
            }
        } else if (c.editable && chamado.status === 'Aberto') {
            return `<div class="col-md-6 mb-2"><strong>${c.label}:</strong> <input type="text" class="form-control form-control-sm" id="${c.id}" value="${c.value || ''}"></div>`;
        } else {
            return `<div class="col-md-6 mb-2"><strong>${c.label}:</strong> <span>${c.value || '-'}</span></div>`;
        }
    }).join('')}
        </div>
    `;
    // Preencher histórico/andamentos
    const andamentos = chamado.andamentos || [];
    const ul = document.getElementById('detalhe-chamado-andamentos');
    function renderAndamentos(andamentosArr) {
        if (!andamentosArr || andamentosArr.length === 0) {
            ul.innerHTML = '<li class="text-muted">Nenhum andamento registrado.</li>';
        } else {
            ul.innerHTML = andamentosArr.map(a => `
                <li class="mb-3 d-flex align-items-start justify-content-between" data-andamento-id="${a.id}">
                    <div>
                        <div><span class="badge bg-secondary">${a.data_hora}</span> <span class="text-muted ms-2">${a.username || 'Usuário não registrado'}</span></div>
                        <div class="mt-1">${a.texto}</div>
                    </div>
                    ${chamado.status === 'Aberto' ? `<button class="btn btn-sm btn-link text-danger btn-excluir-andamento" title="Excluir andamento" data-andamento-id="${a.id}"><i class="bi bi-trash"></i></button>` : ''}
                </li>
            `).join('');
            // Adicionar listeners de exclusão
            if (chamado.status === 'Aberto') {
                ul.querySelectorAll('.btn-excluir-andamento').forEach(btn => {
                    btn.onclick = async function (e) {
                        e.preventDefault();
                        const andamentoId = this.getAttribute('data-andamento-id');
                        if (!andamentoId) return;
                        if (!confirm('Deseja realmente excluir este andamento?')) return;
                        try {
                            showLoading();
                            const res = await fetch(`/chamados/andamentos/${andamentoId}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (res.ok) {
                                exibirMensagem('Andamento excluído com sucesso!');
                                // Remover andamento da lista e atualizar
                                const novaLista = (andamentosArr || []).filter(x => x.id != andamentoId);
                                renderAndamentos(novaLista);
                            } else {
                                exibirMensagem(data.erro || 'Erro ao excluir andamento', 'erro');
                            }
                        } catch (e) {
                            exibirMensagem('Erro ao excluir andamento', 'erro');
                        } finally {
                            hideLoading();
                        }
                    };
                });
            }
        }
    }
    renderAndamentos(andamentos);
    // Exibir modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    // Lógica de edição
    if (chamado.status === 'Aberto') {
        const btnEditar = document.getElementById('btn-editar-chamado');
        if (btnEditar) {
            btnEditar.onclick = async function () {
                const assunto = document.getElementById('campo-assunto').value;
                const descricao = document.getElementById('campo-descricao').value;
                const telefone = document.getElementById('campo-telefone').value;
                const solicitante = document.getElementById('campo-solicitante').value;
                if (!assunto || assunto.length > 70) {
                    exibirMensagem('Assunto é obrigatório e deve ter até 70 caracteres.', 'erro');
                    return;
                }
                try {
                    showLoading();
                    const resposta = await fetch(`/chamados/${chamado.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ assunto, descricao, telefone, solicitante })
                    });
                    const data = await resposta.json();
                    if (resposta.ok) {
                        exibirMensagem('Chamado atualizado com sucesso!');
                        bsModal.hide();
                        carregarChamados('Aberto');
                    } else {
                        exibirMensagem(data.erro || 'Erro ao atualizar chamado', 'erro');
                    }
                } catch (e) {
                    exibirMensagem('Erro ao atualizar chamado', 'erro');
                } finally {
                    hideLoading();
                }
            };
        }
        // Adicionar andamento
        const btnAddAndamento = document.getElementById('btn-adicionar-andamento');
        if (btnAddAndamento) {
            btnAddAndamento.onclick = async function () {
                const texto = document.getElementById('novo-andamento-texto').value.trim();
                if (!texto) {
                    exibirMensagem('Digite o texto do andamento.', 'erro');
                    return;
                }
                try {
                    showLoading();
                    const res = await fetch(`/chamados/${chamado.id}/andamentos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ texto })
                    });
                    const data = await res.json();
                    if (res.ok && data.andamento) {
                        exibirMensagem('Andamento adicionado com sucesso!');
                        document.getElementById('novo-andamento-texto').value = '';
                        // Atualizar a linha do tempo imediatamente
                        renderAndamentos([...(andamentos || []), data.andamento]);
                        // Também atualizar a lista de chamados se necessário
                    } else {
                        exibirMensagem(data.erro || 'Erro ao adicionar andamento', 'erro');
                    }
                } catch (e) {
                    exibirMensagem('Erro ao adicionar andamento', 'erro');
                } finally {
                    hideLoading();
                }
            };
        }
        // Botão finalizar chamado
        const btnFinalizar = document.getElementById('btn-finalizar-chamado');
        if (btnFinalizar) {
            btnFinalizar.onclick = async function () {
                if (!confirm('Deseja realmente finalizar este chamado?')) return;
                try {
                    showLoading();
                    const resposta = await fetch(`/chamados/${chamado.id}/finalizar`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await resposta.json();
                    if (resposta.ok) {
                        exibirMensagem('Chamado finalizado com sucesso!');
                        bsModal.hide();
                        carregarChamados('Aberto');
                        // Opcional: recarregar lista de finalizados
                    } else {
                        exibirMensagem(data.erro || 'Erro ao finalizar chamado', 'erro');
                    }
                } catch (e) {
                    exibirMensagem('Erro ao finalizar chamado', 'erro');
                } finally {
                    hideLoading();
                }
            };
        }
    }
}

async function finalizarChamado(id) {
    if (!confirm('Tem certeza que deseja finalizar este chamado?')) return;
    try {
        const response = await fetch(`/chamados/${id}/finalizar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
        const data = await response.json();
        if (response.ok) {
            exibirMensagem(data.mensagem || 'Chamado finalizado com sucesso!');
            carregarChamados('Aberto');
            carregarChamados('Finalizado');
        } else {
            exibirMensagem(data.erro || 'Erro ao finalizar chamado', 'erro');
        }
    } catch (error) {
        exibirMensagem('Erro de conexão ao finalizar chamado', 'erro');
    }
}

async function excluirChamado(id) {
    if (!confirm('Tem certeza que deseja excluir este chamado?')) return;
    try {
        const resposta = await fetch(`/chamados/${id}`, { method: 'DELETE' });
        const data = await resposta.json();
        if (resposta.ok) {
            exibirMensagem('Chamado excluído com sucesso!');
            carregarChamados('Aberto');
            carregarChamados('Finalizado');
        } else {
            let mensagemErro = data.erro || 'Erro ao excluir o chamado';
            if (data.detalhes) mensagemErro += `\n\n${data.detalhes}`;
            exibirMensagem(`Erro: ${mensagemErro}`, 'erro');
        }
    } catch (erro) {
        exibirMensagem('Erro ao comunicar com o servidor', 'erro');
    }
}

async function reabrirChamado(id) {
    if (!confirm('Tem certeza que deseja reabrir este chamado?')) return;
    try {
        const response = await fetch(`/chamados/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Aberto', data_fechamento: null }) });
        const data = await response.json();
        if (response.ok) {
            exibirMensagem('Chamado reaberto com sucesso!');
            carregarChamados('Aberto');
            carregarChamados('Finalizado');
        } else {
            exibirMensagem(data.erro || 'Erro ao reabrir chamado', 'erro');
        }
    } catch (error) {
        exibirMensagem('Erro de conexão ao reabrir chamado', 'erro');
    }
}

// Adiciona spinner de loading global
function showLoading() {
    let loading = document.getElementById('loading');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading';
        loading.style.position = 'fixed';
        loading.style.top = '0';
        loading.style.left = '0';
        loading.style.width = '100vw';
        loading.style.height = '100vh';
        loading.style.background = 'rgba(255,255,255,0.6)';
        loading.style.display = 'flex';
        loading.style.alignItems = 'center';
        loading.style.justifyContent = 'center';
        loading.style.zIndex = '9999';
        loading.innerHTML = '<div class="spinner-border text-primary" style="width:3rem;height:3rem;"></div>';
        document.body.appendChild(loading);
    }
    loading.style.display = 'flex';
}
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// Busca em tempo real para chamados abertos/finalizados
function configurarPesquisaChamados(tipo) {
    const input = document.getElementById(tipo === 'aberto' ? 'pesquisa-chamados-aberto' : 'pesquisa-chamados-finalizado');
    if (!input) return;
    let timeoutId;
    input.addEventListener('input', function (e) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            buscarChamadosPorTermo(e.target.value, tipo);
        }, 300);
    });
}

async function buscarChamadosPorTermo(termo, tipo) {
    showLoading();
    try {
        const status = tipo === 'aberto' ? 'Aberto' : 'Finalizado';
        const url = `/chamados/buscar?termo=${encodeURIComponent(termo)}&status=${status}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.chamados) {
            if (status === 'Aberto') {
                renderizarChamadosAbertos(data.chamados, 1, 1);
            } else {
                renderizarChamadosFinalizados(data.chamados, 1, 1);
            }
        }
    } catch (e) {
        exibirMensagem('Erro ao buscar chamados', 'erro');
    } finally {
        hideLoading();
    }
}

function renderizarResultadosBusca(chamados, tipo) {
    const tableId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';
    const tbody = document.getElementById(tableId);
    if (chamados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum chamado encontrado. Tente outro termo de pesquisa.</td></tr>`;
        return;
    }
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
    const tabelaId = tipo === 'aberto' ? 'chamados-list' : 'chamados-finalizados';
    document.querySelectorAll(`#${tabelaId} tr`).forEach(row => {
        row.addEventListener('click', function () {
            document.querySelectorAll(`#${tabelaId} tr`).forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');
            selectedChamadoId = this.getAttribute('data-id');
            if (tipo === 'aberto') {
                document.getElementById('btn-abrir').disabled = false;
                document.getElementById('btn-finalizar').disabled = false;
                document.getElementById('btn-excluir').disabled = false;
            } else {
                document.getElementById('btn-abrir-finalizado').disabled = false;
                document.getElementById('btn-reabrir').disabled = false;
                document.getElementById('btn-excluir-finalizado').disabled = false;
            }
        });
    });
}

// Busca dinâmica de clientes no cadastro de chamado
function configurarBuscaClienteChamado() {
    const input = document.getElementById('cliente_busca');
    const resultados = document.getElementById('resultados_cliente');
    const hiddenId = document.getElementById('cliente_id');
    let clientesEncontrados = [];
    let selectedIndex = -1;
    if (!input || !resultados) return;
    input.addEventListener('input', async function () {
        const termo = input.value.trim();
        resultados.innerHTML = '';
        hiddenId.value = '';
        if (termo.length < 2) return;
        showLoading();
        try {
            const res = await fetch(`/clientes/buscar?termo=${encodeURIComponent(termo)}`);
            const data = await res.json();
            clientesEncontrados = data;
            if (clientesEncontrados.length === 0) {
                resultados.innerHTML = '<div class="list-group-item text-muted">Nenhum cliente encontrado</div>';
                return;
            }
            resultados.innerHTML = clientesEncontrados.map((c, i) =>
                `<button type="button" class="list-group-item list-group-item-action" data-index="${i}">
                    <strong>${c.nome}</strong> <span class="text-muted">${c.email || ''}</span>
                </button>`
            ).join('');
            // Clique para selecionar
            resultados.querySelectorAll('button').forEach(btn => {
                btn.onclick = function () {
                    const idx = parseInt(this.getAttribute('data-index'));
                    input.value = clientesEncontrados[idx].nome;
                    hiddenId.value = clientesEncontrados[idx].id;
                    resultados.innerHTML = '';
                };
            });
            selectedIndex = -1;
        } catch (e) {
            resultados.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar clientes</div>';
        } finally {
            hideLoading();
        }
    });
    // Seleção com teclado
    input.addEventListener('keydown', function (e) {
        const items = resultados.querySelectorAll('button');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < items.length) {
                items[selectedIndex].click();
                selectedIndex = -1;
            }
        }
        items.forEach((btn, i) => btn.classList.toggle('active', i === selectedIndex));
    });
    // Fechar lista ao clicar fora
    document.addEventListener('click', function (e) {
        if (!resultados.contains(e.target) && e.target !== input) {
            resultados.innerHTML = '';
        }
    });
}

// Cadastro de novo chamado com feedback e limpeza
function configurarFormularioChamado() {
    document.getElementById('chamado-form').onsubmit = async (event) => {
        event.preventDefault();
        const assunto = document.getElementById('assunto').value;
        const cliente_id = document.getElementById('cliente_id').value;
        const telefone = document.getElementById('telefone_chamado').value;
        const descricao = document.getElementById('descricao').value;
        const solicitante = document.getElementById('solicitante').value;
        if (!cliente_id) {
            exibirMensagem('Selecione um cliente', 'erro');
            return;
        }
        const dadosChamado = { assunto, cliente_id: parseInt(cliente_id), telefone, descricao, solicitante };
        showLoading();
        try {
            const resposta = await fetch('/chamados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosChamado) });
            const data = await resposta.json();
            if (resposta.ok) {
                exibirMensagem('Chamado aberto com sucesso!');
                // Limpar formulário
                document.getElementById('chamado-form').reset();
                document.getElementById('resultados_cliente').innerHTML = '';
                document.getElementById('cliente_id').value = '';
            } else {
                exibirMensagem(data.erro || 'Erro ao abrir chamado', 'erro');
            }
        } catch (erro) {
            exibirMensagem('Erro ao abrir chamado', 'erro');
        } finally {
            hideLoading();
        }
    };
}

// Função utilitária para exibir mensagens
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'erro' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => {
            if (alertDiv.parentNode) alertDiv.remove();
        }, 5000);
    }
}

// Função utilitária para formatar datas
function formatarData(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return dataString;
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function abrirOrdemServico(chamadoId) {
    if (!chamadoId) {
        exibirMensagem('Selecione um chamado primeiro', 'erro');
        return;
    }
    window.open(`/p/ordem-servico?chamado=${chamadoId}`, '_blank');
} 