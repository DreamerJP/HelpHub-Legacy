// Variáveis globais
let currentAgendamentoId = null;
let chamadoSelecionadoId = null;
let userRole = null;

// Inicialização ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    fetch('/auth/check-role').then(r => r.json()).then(data => {
        userRole = data.role;
    });
    if (document.getElementById('calendario')) {
        configurarCalendario();
    }
});

// Configura o calendário FullCalendar
function configurarCalendario() {
    const calendarEl = document.getElementById('calendario');
    if (!calendarEl) return;
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'pt-br',
        firstDay: 1,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista'
        },
        selectable: true,
        editable: true,
        eventClick: function (info) {
            abrirModalDetalhesAgendamento(info.event);
        },
        select: function (info) {
            abrirModalAgendamento(info.startStr, info.endStr);
        },
        eventMouseEnter: function (info) {
            getOrCreateTooltip(info.el, formatarTooltipAgendamento(info.event));
        },
        eventMouseLeave: function (info) {
            if (info.el._tippy) info.el._tippy.destroy();
        },
        eventDrop: async function (info) {
            // Atualizar datas do agendamento no backend
            const agendamentoId = info.event.id;
            const data_agendamento = info.event.startStr.slice(0, 16);
            const data_final_agendamento = info.event.endStr ? info.event.endStr.slice(0, 16) : data_agendamento;
            try {
                const response = await fetch(`/agendamentos/${agendamentoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data_agendamento,
                        data_final_agendamento
                    })
                });
                const data = await response.json();
                if (!response.ok) {
                    exibirMensagem(data.erro || 'Erro ao mover agendamento', 'erro');
                    info.revert();
                } else {
                    exibirMensagem('Agendamento movido com sucesso!');
                }
            } catch (e) {
                exibirMensagem('Erro ao mover agendamento', 'erro');
                info.revert();
            }
        },
        events: function (fetchInfo, successCallback, failureCallback) {
            carregarAgendamentos(successCallback, failureCallback);
        },
        allDaySlot: false,
    });
    calendar.render();
}

// Tooltip customizado para eventos
function formatarTooltipAgendamento(event) {
    return `<div class="agenda-tooltip">
        <strong>Cliente:</strong> ${event.extendedProps.cliente_nome || ''}<br>
        <strong>Assunto:</strong> ${event.extendedProps.assunto || 'N/A'}<br>
        <strong>Endereço:</strong> ${event.extendedProps.endereco || 'N/A'}<br>
        <strong>Telefone:</strong> ${event.extendedProps.cliente_telefone || 'N/A'}<br>
        <strong>Data:</strong> ${formatarData(event.start)}<br>
        <strong>Status:</strong> ${event.extendedProps.chamado_status || 'Aberto'}
    </div>`;
}

// Cria ou retorna tooltip para eventos
function getOrCreateTooltip(element, content) {
    if (window.tippy) {
        window.tippy(element, {
            content,
            allowHTML: true,
            placement: 'top',
            theme: 'light',
            trigger: 'mouseenter',
            hideOnClick: true,
            duration: [200, 150],
        });
    }
}

// Abre o modal de novo agendamento
function abrirModalAgendamento(startStr, endStr) {
    document.getElementById('agendamentoForm').reset();
    document.getElementById('observacoes_agendamento').value = '';
    // Limpar seleção de chamado
    chamadoSelecionadoId = null;
    const selecionado = document.getElementById('chamado-selecionado');
    if (selecionado) {
        selecionado.innerHTML = '';
        selecionado.classList.add('d-none');
    }
    const buscaInput = document.getElementById('busca-chamado');
    if (buscaInput) buscaInput.value = '';
    const lista = document.getElementById('lista-chamados');
    if (lista) lista.innerHTML = '';
    // Preenchimento automático dos horários
    const now = new Date();
    let nextHour = new Date(now);
    if (now.getMinutes() > 30) {
        nextHour.setHours(now.getHours() + 2, 0, 0, 0);
    } else {
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    }
    const endHour = new Date(nextHour);
    endHour.setHours(nextHour.getHours() + 1);
    function toDatetimeLocal(dt) {
        const pad = n => n.toString().padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:00`;
    }
    document.getElementById('data_agendamento').value = toDatetimeLocal(nextHour);
    document.getElementById('data_final_agendamento').value = toDatetimeLocal(endHour);
    configurarBuscaChamadosAgendamento();
    document.getElementById('salvarAgendamento').onclick = salvarAgendamento;
    // Garantir que ao fechar/cancelar o modal, a seleção seja limpa
    const modalEl = document.getElementById('agendamentoModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', function handler() {
            chamadoSelecionadoId = null;
            if (selecionado) {
                selecionado.innerHTML = '';
                selecionado.classList.add('d-none');
            }
            if (buscaInput) buscaInput.value = '';
            if (lista) lista.innerHTML = '';
            modalEl.removeEventListener('hidden.bs.modal', handler);
        });
    }
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Configura busca de chamados no modal de agendamento
function configurarBuscaChamadosAgendamento() {
    const buscaInput = document.getElementById('busca-chamado');
    const lista = document.getElementById('lista-chamados');
    const selecionado = document.getElementById('chamado-selecionado');
    if (!buscaInput) return;
    buscaInput.addEventListener('input', async function () {
        const termo = this.value.trim();
        if (!termo) {
            lista.innerHTML = '';
            selecionado.classList.add('d-none');
            chamadoSelecionadoId = null;
            return;
        }
        try {
            const resp = await fetch(`/chamados/buscar?termo=${encodeURIComponent(termo)}`);
            const data = await resp.json();
            lista.innerHTML = data.chamados.map(chamado => `
                <a href="#" class="list-group-item list-group-item-action" data-id="${chamado[0]}" data-protocolo="${chamado[6]}" data-cliente="${chamado[10]}" onclick="selecionarChamadoAgendamento(event, this)">
                    #${chamado[0]} - ${chamado[10] || 'Cliente removido'} - ${chamado[7] || ''}
                </a>
            `).join('');
        } catch (e) {
            lista.innerHTML = '';
        }
    });
}

// Seleciona chamado no modal de agendamento
function selecionarChamadoAgendamento(event, element) {
    event.preventDefault();
    const selecionado = document.getElementById('chamado-selecionado');
    selecionado.classList.remove('d-none');
    selecionado.innerHTML = `<strong>Chamado:</strong> #${element.dataset.id} - ${element.dataset.cliente} <br><strong>Protocolo:</strong> ${element.dataset.protocolo}`;
    chamadoSelecionadoId = element.dataset.id;
    // Limpar a lista de sugestões após seleção
    const lista = document.getElementById('lista-chamados');
    if (lista) lista.innerHTML = '';
}

// Salva novo agendamento
async function salvarAgendamento() {
    const dataAgendamento = document.getElementById('data_agendamento').value;
    const dataFinalAgendamento = document.getElementById('data_final_agendamento').value;
    const observacoes = document.getElementById('observacoes_agendamento').value;
    if (!chamadoSelecionadoId) {
        exibirMensagem('Selecione um chamado para agendar.', 'erro');
        return;
    }
    if (!dataAgendamento || !dataFinalAgendamento) {
        exibirMensagem('Preencha as datas do agendamento', 'erro');
        return;
    }
    // Validação: horário final deve ser maior que o inicial
    if (new Date(dataFinalAgendamento) <= new Date(dataAgendamento)) {
        exibirMensagem('O horário final deve ser maior que o horário inicial.', 'erro');
        return;
    }
    try {
        const response = await fetch('/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chamado_id: chamadoSelecionadoId,
                data_agendamento: dataAgendamento,
                data_final_agendamento: dataFinalAgendamento,
                observacoes
            })
        });
        const data = await response.json();
        if (response.ok) {
            exibirMensagem('Agendamento criado com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('agendamentoModal')).hide();
            document.getElementById('calendario').innerHTML = '';
            configurarCalendario();
        } else {
            exibirMensagem(data.erro || 'Erro ao criar agendamento', 'erro');
        }
    } catch (error) {
        exibirMensagem(error.message || 'Erro ao salvar agendamento', 'erro');
    }
}

// Carrega agendamentos do backend
async function carregarAgendamentos(successCallback, failureCallback) {
    try {
        const response = await fetch('/agendamentos');
        if (!response.ok) throw new Error('Falha ao carregar agendamentos');
        const agendamentos = await response.json();
        const eventos = agendamentos.map(agendamento => ({
            id: agendamento.id,
            title: `Visita Técnica - ${agendamento.protocolo}`,
            start: agendamento.data_agendamento,
            end: agendamento.data_final_agendamento,
            backgroundColor: agendamento.chamado_status === 'Finalizado' ? '#28a745' : '#0d6efd',
            borderColor: agendamento.chamado_status === 'Finalizado' ? '#28a745' : '#0d6efd',
            extendedProps: {
                cliente_nome: agendamento.cliente_nome,
                assunto: agendamento.assunto,
                endereco: agendamento.endereco,
                cliente_telefone: agendamento.cliente_telefone,
                chamado_status: agendamento.chamado_status,
                protocolo: agendamento.protocolo,
                chamado_id: agendamento.chamado_id
            }
        }));
        successCallback(eventos);
    } catch (error) {
        failureCallback(error);
    }
}

// Abre modal de detalhes do agendamento
function abrirModalDetalhesAgendamento(event) {
    const content = document.getElementById('detalhes-agendamento-content');
    content.innerHTML = `
        <div class="mb-3">
            <strong>Cliente:</strong> ${event.extendedProps.cliente_nome || ''}<br>
            <strong>Assunto:</strong> ${event.extendedProps.assunto || 'N/A'}<br>
            <strong>Endereço:</strong> ${event.extendedProps.endereco || 'N/A'}<br>
            <strong>Telefone:</strong> ${event.extendedProps.cliente_telefone || 'N/A'}<br>
            <strong>Data Inicial:</strong> ${formatarData(event.start)}<br>
            <strong>Data Final:</strong> ${formatarData(event.end)}<br>
            <strong>Status:</strong> ${event.extendedProps.chamado_status || 'Aberto'}<br>
            <strong>Protocolo:</strong> ${event.extendedProps.protocolo || ''}
        </div>
        <div class="mb-3">
            <label for="relatorio_visita" class="form-label"><i class="bi bi-file-earmark-text"></i> Relatório da Visita:</label>
            ${(event.extendedProps.chamado_status === 'Finalizado')
            ? `<div class='form-control' style='min-height:80px;background:#f8f9fa;'>${event.extendedProps.relatorio_visita ? event.extendedProps.relatorio_visita : '<span class="text-muted">(não informado)</span>'}</div>`
            : `<textarea class="form-control" id="relatorio_visita" rows="4" placeholder="Descreva detalhadamente o relatório da visita técnica (campo obrigatório)..."></textarea>`}
        </div>
    `;
    document.getElementById('excluirAgendamentoModal').onclick = () => excluirAgendamentoModal(event.id);
    // Botão editar agendamento
    const btnEditar = document.getElementById('editarAgendamentoModal');
    if (btnEditar) {
        if (event.extendedProps.chamado_status !== 'Finalizado') {
            btnEditar.classList.remove('d-none');
            btnEditar.onclick = function () { abrirModalEdicaoAgendamento(event); };
        } else {
            btnEditar.classList.add('d-none');
        }
    }
    // Botão excluir: admin pode excluir sempre, guest só se não finalizado
    const btnExcluir = document.getElementById('excluirAgendamentoModal');
    if (btnExcluir) {
        if (userRole === 'admin') {
            btnExcluir.classList.remove('d-none');
        } else if (userRole === 'guest' && event.extendedProps.chamado_status === 'Finalizado') {
            btnExcluir.classList.add('d-none');
        } else {
            btnExcluir.classList.remove('d-none');
        }
    }
    // Adicionar ação para finalizar ordem de serviço
    setTimeout(() => { // Garante que o botão existe
        const btnFinalizar = document.getElementById('btn-finalizar-ordem-servico');
        if (btnFinalizar) {
            btnFinalizar.onclick = async function () {
                const relatorio = document.getElementById('relatorio_visita').value.trim();
                if (!relatorio) {
                    exibirMensagem('O relatório da visita é obrigatório.', 'erro');
                    return;
                }
                if (!confirm('Deseja realmente finalizar a ordem de serviço deste agendamento?')) return;
                try {
                    btnFinalizar.disabled = true;
                    btnFinalizar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Finalizando...';
                    // Buscar id do chamado relacionado
                    const chamadoId = event.extendedProps.chamado_id || event.extendedProps.chamadoId || event.id;
                    const agendamentoId = event.id;
                    const resp = await fetch(`/chamados/${chamadoId}/finalizar-ordem-servico`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ relatorio_visita: relatorio, agendamento_id: agendamentoId })
                    });
                    const data = await resp.json();
                    if (resp.ok) {
                        exibirMensagem('Ordem de serviço finalizada com sucesso!');
                        bootstrap.Modal.getInstance(document.getElementById('agendamentoDetalhesModal')).hide();
                        document.getElementById('calendario').innerHTML = '';
                        configurarCalendario();
                    } else {
                        exibirMensagem(data.erro || 'Erro ao finalizar ordem de serviço', 'erro');
                    }
                } catch (e) {
                    exibirMensagem('Erro ao finalizar ordem de serviço', 'erro');
                } finally {
                    btnFinalizar.disabled = false;
                    btnFinalizar.innerHTML = '<i class="bi bi-check-circle"></i> Finalizar Ordem de Serviço';
                }
            };
        }
    }, 100);
    // Exibir o modal de detalhes
    const modal = new bootstrap.Modal(document.getElementById('agendamentoDetalhesModal'));
    modal.show();
    // Botão ver chamado
    const btnVerChamado = document.getElementById('verChamadoModal');
    if (btnVerChamado) {
        btnVerChamado.onclick = function () {
            const chamadoId = event.extendedProps.chamado_id || event.extendedProps.chamadoId || event.chamado_id || event.id;
            if (chamadoId) {
                window.open(`/p/chamados?chamado_id=${chamadoId}`, '_blank');
            } else {
                exibirMensagem('ID do chamado não encontrado.', 'erro');
            }
        };
    }
}

// Exclui agendamento
async function excluirAgendamentoModal(id) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
        const response = await fetch(`/agendamentos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            exibirMensagem('Agendamento excluído com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('agendamentoDetalhesModal')).hide();
            document.getElementById('calendario').innerHTML = '';
            configurarCalendario();
        } else {
            exibirMensagem('Erro ao excluir agendamento', 'erro');
        }
    } catch (error) {
        exibirMensagem('Erro ao excluir agendamento', 'erro');
    }
}

// Utilitário para exibir mensagens
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'erro' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.style.zIndex = 9999;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '30px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.minWidth = '320px';
    alertDiv.style.maxWidth = '90vw';
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    const container = document.querySelector('.container');
    if (container) {
        document.body.appendChild(alertDiv);
    } else {
        document.body.appendChild(alertDiv);
    }
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
    }, 5000);
}

// Utilitário para formatar datas
function formatarData(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return dataString;
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Abre o modal de edição de agendamento preenchido
function abrirModalEdicaoAgendamento(event) {
    // Preencher formulário com dados atuais
    document.getElementById('agendamentoForm').reset();
    document.getElementById('data_agendamento').value = event.startStr.slice(0, 16);
    document.getElementById('data_final_agendamento').value = event.endStr.slice(0, 16);
    document.getElementById('observacoes_agendamento').value = event.extendedProps.observacoes || '';
    // Bloquear troca de chamado na edição (opcional)
    document.getElementById('busca-chamado').disabled = true;
    document.getElementById('lista-chamados').innerHTML = '';
    document.getElementById('chamado-selecionado').classList.remove('d-none');
    document.getElementById('chamado-selecionado').innerHTML = `<strong>Chamado:</strong> ${event.extendedProps.cliente_nome} <br><strong>Protocolo:</strong> ${event.extendedProps.protocolo}`;
    chamadoSelecionadoId = event.extendedProps.chamado_id || event.extendedProps.chamadoId || event.id;
    // Trocar ação do botão salvar
    document.getElementById('salvarAgendamento').onclick = async function () {
        const dataAgendamento = document.getElementById('data_agendamento').value;
        const dataFinalAgendamento = document.getElementById('data_final_agendamento').value;
        const observacoes = document.getElementById('observacoes_agendamento').value;
        if (!dataAgendamento || !dataFinalAgendamento) {
            exibirMensagem('Preencha as datas do agendamento', 'erro');
            return;
        }
        try {
            const response = await fetch(`/agendamentos/${event.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data_agendamento: dataAgendamento,
                    data_final_agendamento: dataFinalAgendamento,
                    observacoes
                })
            });
            const data = await response.json();
            if (response.ok) {
                exibirMensagem('Agendamento atualizado com sucesso!');
                bootstrap.Modal.getInstance(document.getElementById('agendamentoModal')).hide();
                document.getElementById('calendario').innerHTML = '';
                configurarCalendario();
            } else {
                exibirMensagem(data.erro || 'Erro ao atualizar agendamento', 'erro');
            }
        } catch (error) {
            exibirMensagem(error.message || 'Erro ao atualizar agendamento', 'erro');
        }
    };
    // Abrir modal de edição
    const modal = new bootstrap.Modal(document.getElementById('agendamentoModal'));
    modal.show();
} 