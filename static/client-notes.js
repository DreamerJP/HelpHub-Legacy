/**
 * Este arquivo contém as funções relacionadas às notas de clientes usando o CKEditor 5
 * e funcionalidades de impressão para o sistema
 */

// Variável para guardar a instância do editor
let clientNotesEditor = null;

// CSS para estilos de impressão - Adicionado ao cabeçalho do documento
(function () {
    const printStylesheet = document.createElement('style');
    printStylesheet.type = 'text/css';
    printStylesheet.innerHTML = `
    /* Estilos normais para a tela */
    #service-order-printable {
        background: white;
        padding: 20px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .service-order-header {
        margin-bottom: 20px;
    }

    .service-order-separator {
        border-bottom: 2px solid #333;
        margin: 10px 0;
    }

    .company-name {
        font-weight: bold;
        margin-bottom: 5px;
    }

    .order-number {
        text-align: right;
    }

    .client-info-section, .service-request-section, 
    .service-history-section, .signatures-section, 
    .agendamento-section {
        margin-bottom: 20px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
    }

    .signature-line {
        border-bottom: 1px solid #000;
        width: 80%;
        margin: 40px auto 10px;
    }

    .timeline {
        list-style: none;
        padding: 0;
    }

    .timeline-panel {
        margin-bottom: 15px;
        padding: 10px;
        border-left: 3px solid #0d6efd;
        background-color: #f8f9fa;
    }

    /* Estilos específicos para impressão */
    @media print {
    /* Abordagem alternativa para impressão */
    /* Em vez de ocultar tudo e tornar apenas um elemento visível,
       vamos ocultar seletivamente elementos que não queremos imprimir */
    
    /* Ocultar elementos fora da área de impressão */
    body > *:not(#serviceOrderModal) {
        display: none !important;
    }
    
    /* Oculta partes do modal que não devem ser impressas */
    .modal-header, .modal-footer, .no-print {
        display: none !important;
    }
    
    /* Reset para margens da página de impressão */
    @page {
        margin: 0.5cm !important; /* Margem mínima para impressoras */
        size: auto;
    }
    
    /* Garante que o elemento de impressão tenha as propriedades corretas */
    #service-order-printable {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        position: static !important;
        overflow: visible !important;
        padding: 5mm !important; /* Reduzido de 15mm para 5mm */
        margin: 0 !important;
        background-color: white !important;
        color: black !important;
        box-shadow: none !important;
        font-size: 9pt !important; /* Reduzido de 12pt para 9pt */
    }
    
    /* Redefinir o modal para não se comportar como um modal durante a impressão */
    .modal {
        position: static !important;
        display: block !important;
        padding: 0 !important;
        overflow: visible !important;
        background-color: white !important;
    }
    
    .modal-dialog {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        transform: none !important;
    }
    
    .modal-content {
        border: none !important;
        box-shadow: none !important;
    }
    
    .modal-body {
        padding: 0 !important;
        overflow: visible !important;
    }
    
    /* Garante que as seções importantes não sejam divididas entre páginas */
    .service-order-header, .client-info-section, 
    .service-request-section, .service-history-section, 
    .signatures-section {
        page-break-inside: avoid;
        margin-bottom: 10px !important; /* Reduzido de 15px para 10px */
    }
    
    /* Reduzir espaçamento geral */
    .row {
        margin-bottom: 5px !important;
    }
    
    p {
        margin-bottom: 0.3em !important;
        line-height: 1.3 !important;
    }
    
    /* Evitar quebras de página nos detalhes importantes */
    .timeline-panel {
        page-break-inside: avoid;
        padding: 5px !important; /* Reduzir padding */
        margin-bottom: 8px !important; /* Reduzir margem */
    }
    
    /* Melhorar a legibilidade da impressão com fontes menores */
    h2 {
        font-size: 14pt !important;
        margin-bottom: 0.3em !important;
    }
    
    h3, h4 {
        font-size: 12pt !important;
        margin-bottom: 0.3em !important;
        page-break-after: avoid;
    }
    
    h5 {
        font-size: 10pt !important;
        margin-bottom: 0.3em !important;
    }
    
    /* Certifique-se de que as linhas de assinatura sejam impressas */
    .signature-line {
        border-bottom: 1px solid #000 !important;
        margin-bottom: 3px !important; /* Reduzido */
        margin-top: 25px !important; /* Reduzido de 40px */
    }
    
    /* Ajuste de tamanhos específicos */
    .company-name {
        font-size: 14pt !important; /* Reduzido de 18pt */
        margin-bottom: 3px !important;
    }
    
    .company-info {
        font-size: 8pt !important;
        line-height: 1.2 !important;
    }
    
    .order-number h3 {
        font-size: 12pt !important;
        margin-bottom: 0 !important;
    }
    
    .order-number h4 {
        font-size: 11pt !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
    }
    
    .order-number p {
        font-size: 9pt !important;
        margin-top: 3px !important;
    }
    
    /* Compactar histórico de atendimento */
    .timeline {
        padding-left: 15px !important; /* Reduzir padding da lista */
    }
    
    .timeline-panel {
        border-left: 1px solid #000 !important;
        background-color: transparent !important;
    }
    
    .timeline-heading h6 {
        font-size: 9pt !important;
        margin-bottom: 2px !important;
    }
    
    .timeline-body p {
        font-size: 8pt !important;
    }
    
    /* Garante que os URLs não sejam impressos */
    a:after {
        content: "";
    }

    /* Ajustar o cabeçalho para exibir em linha */
    .service-order-header .row {
        display: flex !important;
        flex-direction: row !important;
        width: 100% !important;
    }
    
    /* Redimensionar as colunas do cabeçalho para ficarem lado a lado */
    .service-order-header .col-8,
    .service-order-header .col-4 {
        flex: 1 !important;
        max-width: 50% !important;
        width: 50% !important;
    }

}`;
    document.head.appendChild(printStylesheet);
})();

// Função para inicializar o editor CKEditor nas notas do cliente
function initClientNotesEditor() {
    // Verifica se já existe uma instância do editor
    if (clientNotesEditor) {
        return;
    }

    // Verifica se o elemento existe antes de tentar inicializar o editor
    const editorElement = document.getElementById('cliente-notas');
    if (!editorElement) {
        console.log('Elemento cliente-notas não encontrado, ignorando inicialização do editor');
        return;
    }

    // Calcula a altura máxima baseada na altura da tela
    const viewportHeight = window.innerHeight;
    const maxEditorHeight = Math.floor(viewportHeight * 1.5);

    // Remover qualquer contador de caracteres existente antes de criar um novo
    const oldCounters = document.querySelectorAll('.character-count');
    oldCounters.forEach(counter => counter.remove());

    // Inicializa o CKEditor no elemento cliente-notas
    ClassicEditor
        .create(editorElement, {
            toolbar: [
                'heading', '|',
                'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                'outdent', 'indent', '|',
                'blockQuote', 'insertTable', 'undo', 'redo'
            ],
            // Configura o limite máximo de caracteres
            maxLength: {
                characters: 10000,
                includeHtml: false
            }
        })
        .then(editor => {
            clientNotesEditor = editor;
            console.log('Editor iniciado com sucesso');

            // Define a altura máxima do editor com barra de rolagem
            const editorElement = editor.ui.view.editable.element;
            editorElement.style.maxHeight = `${maxEditorHeight}px`;
            editorElement.style.overflow = 'auto';

            // Adiciona contador de caracteres com um ID único
            const characterCount = document.createElement('div');
            characterCount.className = 'character-count';
            characterCount.id = 'client-notes-character-count'; // Adiciona um ID para fácil identificação
            characterCount.style.textAlign = 'right';
            characterCount.style.padding = '5px';
            characterCount.style.fontSize = '0.8em';
            characterCount.style.color = '#666';

            // Adiciona o contador após o editor
            editor.ui.view.element.parentNode.insertBefore(
                characterCount,
                editor.ui.view.element.nextSibling
            );

            // Atualiza o contador a cada mudança no editor
            editor.model.document.on('change:data', () => {
                const currentLength = editor.getData().replace(/<[^>]*>/g, '').length;
                characterCount.innerHTML = `${currentLength} / 10000 caracteres`;

                // Muda a cor para vermelho quando estiver próximo do limite
                if (currentLength > 9000) {
                    characterCount.style.color = '#c92d2d';
                } else {
                    characterCount.style.color = '#666';
                }
            });

            // Adiciona suporte para Ctrl + V no CKEditor
            editor.editing.view.document.on('keydown', (event, data) => {
                if (data.ctrlKey && data.keyCode === 86) { // Ctrl + V
                    data.preventDefault(); // Previne o comportamento padrão
                    navigator.clipboard.readText().then(text => {
                        editor.model.change(writer => {
                            const insertPosition = editor.model.document.selection.getFirstPosition();
                            writer.insertText(text, insertPosition);
                        });
                    }).catch(err => {
                        console.error('Erro ao acessar a área de transferência:', err);
                    });
                }
            });
        })
        .catch(error => {
            console.error('Erro ao inicializar o editor:', error);
        });
}

// Função para carregar as notas do cliente do servidor
async function loadClientNotes(clientId) {
    try {
        const response = await fetch(`/clientes/${clientId}/notas`);

        if (!response.ok) {
            throw new Error('Não foi possível carregar as notas');
        }

        const data = await response.json();

        // Aguarda o editor estar pronto
        if (clientNotesEditor) {
            // Define o conteúdo no editor
            clientNotesEditor.setData(data.notas || '');
        } else {
            // Se o editor ainda não estiver pronto, tentamos novamente em 100ms
            setTimeout(() => {
                if (clientNotesEditor) {
                    clientNotesEditor.setData(data.notas || '');
                }
            }, 100);
        }

        return true;
    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        return false;
    }
}

// Função para salvar as notas do cliente no servidor
async function saveClientNotes(clientId) {
    try {
        // Verifica se o editor está inicializado
        if (!clientNotesEditor) {
            initClientNotesEditor(); // Tenta inicializar o editor se não existir
            await new Promise(resolve => setTimeout(resolve, 100)); // Aguarda inicialização
            if (!clientNotesEditor) {
                throw new Error('Editor não está inicializado');
            }
        }

        // Recupera o conteúdo do editor
        const notesContent = clientNotesEditor.getData();

        // Verifica o tamanho do texto (sem as tags HTML)
        const textLength = notesContent.replace(/<[^>]*>/g, '').length;

        // Verifica se excede o limite de caracteres
        if (textLength > 10000) {
            exibirMensagem(`Texto muito longo (${textLength}/10000 caracteres). Reduza o conteúdo para salvar.`, 'erro');
            return false;
        }

        // Se o conteúdo estiver vazio ou contiver apenas HTML vazio, confirma com o usuário
        const isContentEmpty = !notesContent.trim() || notesContent.replace(/<[^>]*>/g, '').trim() === '';

        if (isContentEmpty) {
            if (!confirm('O conteúdo está vazio. Isso removerá todas as informações adicionais deste cliente. Deseja continuar?')) {
                return false;
            }
            // O usuário confirmou a deleção do conteúdo
        }

        const response = await fetch(`/clientes/${clientId}/notas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notas: notesContent
            })
        });

        const data = await response.json();

        // Se a resposta contém success ou o status é ok, consideramos como sucesso
        if (data.success || response.ok) {
            if (isContentEmpty) {
                exibirMensagem('Informações adicionais removidas com sucesso.', 'sucesso');
            } else {
                exibirMensagem('Notas salvas com sucesso!', 'sucesso');
            }
            return true;
        }

        // Caso contrário, logamos o erro mas não lançamos exceção
        console.warn('Aviso ao salvar notas:', data.error || 'Status não esperado');
        exibirMensagem('Notas salvas, mas com aviso', 'aviso');
        return true;

    } catch (error) {
        console.error('Erro ao salvar notas:', error);
        exibirMensagem('Erro ao salvar notas, mas as alterações foram mantidas', 'erro');
        // Não propagamos o erro para manter o editor funcionando
        return false;
    }
}

// Função para destruir a instância do CKEditor quando não for mais necessária
function destroyClientNotesEditor() {
    if (clientNotesEditor) {
        const editor = clientNotesEditor;
        clientNotesEditor = null; // Limpa a referência antes de destruir
        editor.destroy()
            .then(() => {
                console.log('Editor destruído com sucesso');
            })
            .catch(error => {
                console.error('Erro ao destruir editor:', error);
            });
    }
}

// Adiciona um listener para inicializar o CKEditor quando a aba de notas for selecionada
document.addEventListener('shown.bs.tab', function (event) {
    // Verifica se é a aba de notas que foi selecionada
    if (event.target.id === 'notas-tab' || event.target.getAttribute('href') === '#notas') {
        // Tenta obter o ID do cliente de várias formas possíveis
        const clientId = document.querySelector('.client-id')?.textContent?.replace('#', '') || // Novo local do ID
            document.getElementById('id')?.value?.replace('#', '') ||
            document.querySelector('[data-cliente-id]')?.dataset?.clienteId;

        console.log('ID do cliente encontrado:', clientId); // Log para debug

        if (clientId) {
            destroyClientNotesEditor(); // Garante que qualquer instância anterior seja destruída
            setTimeout(() => {
                initClientNotesEditor();
                setTimeout(() => {
                    loadClientNotes(clientId);
                }, 300);
            }, 100);
        } else {
            console.warn('ID do cliente não encontrado');
        }
    } else {
        // Se mudar para outra aba, destrói o editor
        destroyClientNotesEditor();
    }
});

// Remove o listener de beforeunload relacionado ao CKEditor, 
// pois ele não é mais necessário e pode causar problemas ao reinicializar o editor

// Substitui a área de notas em modais existentes
document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('shown.bs.modal', function (event) {
        // Verifica se o modal aberto é o de detalhes do cliente
        if (event.target.id === 'clienteDetalhesModal') {
            // Não inicializa o editor, apenas carrega as notas para visualização
            const clientId = event.target.getAttribute('data-cliente-id');
            if (clientId) {
                // Busca as notas diretamente da API e atualiza o elemento de visualização
                fetch(`/clientes/${clientId}/notas`)
                    .then(response => response.json())
                    .then(data => {
                        const notasView = document.getElementById('cliente-notas-view');
                        if (notasView) {
                            notasView.innerHTML = data.notas || 'Nenhuma informação adicional cadastrada.';
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar notas:', error);
                    });
            }
        }
        // Mantém o comportamento original para outros modais ou elementos que contenham notas editáveis
        else if (event.target.contains(document.getElementById('notas')) &&
            document.getElementById('cliente-notas')) {
            const clientId = document.querySelector('[data-cliente-id]')?.dataset?.clienteId;
            if (clientId) {
                destroyClientNotesEditor(); // Garante que qualquer instância anterior seja destruída
                setTimeout(() => {
                    initClientNotesEditor();
                    setTimeout(() => {
                        loadClientNotes(clientId);
                    }, 300);
                }, 100);
            }
        }
    });

    document.addEventListener('hidden.bs.modal', function (event) {
        // Sempre destroi o editor quando o modal for fechado
        destroyClientNotesEditor();
    });
});

/**
 * Funções para geração e manipulação de Ordem de Serviço
 */

// Função para gerar e exibir a ordem de serviço para impressão
function generateServiceOrder(chamadoId) {
    // Verificar se um chamado está aberto
    if (!chamadoId) {
        exibirMensagem('Nenhum chamado selecionado para gerar ordem de serviço', 'erro');
        return;
    }

    // Mostrar indicador de carregamento
    showLoading();

    // Buscar os dados detalhados do chamado
    fetch(`/chamados/${chamadoId}`)
        .then(response => response.json())
        .then(chamado => {
            // Se tiver cliente_id, busca dados detalhados do cliente
            if (chamado.cliente_id) {
                return fetch(`/clientes/${chamado.cliente_id}`)
                    .then(response => response.json())
                    .then(cliente => {
                        hideLoading();
                        // Gerar e exibir a ordem de serviço com dados do cliente e chamado
                        displayServiceOrderModal(chamado, cliente);
                    });
            } else {
                hideLoading();
                // Gerar e exibir a ordem de serviço apenas com dados do chamado
                displayServiceOrderModal(chamado, null);
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Erro ao gerar ordem de serviço:', error);
            exibirMensagem('Erro ao gerar ordem de serviço', 'erro');
        });
}

// Função para exibir o modal com a ordem de serviço preenchida
function displayServiceOrderModal(chamado, cliente) {
    // Formatar a data atual para o cabeçalho da OS
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    // Formatar a data de abertura do chamado
    let dataAbertura = 'N/A';
    try {
        if (chamado.data_abertura) {
            const data = new Date(chamado.data_abertura);
            dataAbertura = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) {
        console.error('Erro ao formatar data de abertura:', e);
    }

    // Informações básicas da empresa (pode ser customizado)
    const empresaInfo = {
        nome: 'HelpHub Suporte Técnico',
        endereco: 'Av. Tecnologia, 1234 - Centro',
        cidade: 'São Paulo - SP',
        telefone: '(11) 3456-7890',
        email: 'contato@helphub.com.br',
        site: 'www.helphub.com.br'
    };

    // Preparar dados do cliente
    let clienteInfo = 'Cliente não encontrado ou removido';
    let clienteContato = '';
    let clienteEndereco = '';

    if (cliente) {
        clienteInfo = `<strong>${cliente.nome || ''}</strong>${cliente.nome_fantasia ? ' (' + cliente.nome_fantasia + ')' : ''}`;

        // Informações de documento
        if (cliente.cnpj_cpf) {
            clienteInfo += `<br>${cliente.tipo_cliente === 'Pessoa Física' ? 'CPF' : 'CNPJ'}: ${cliente.cnpj_cpf}`;
        }

        // Contato
        let contatos = [];
        if (cliente.telefone) contatos.push(`Telefone: ${cliente.telefone}`);
        if (cliente.email) contatos.push(`Email: ${cliente.email}`);
        if (contatos.length > 0) {
            clienteContato = contatos.join('<br>');
        }

        // Endereço
        let enderecoPartes = [];
        if (cliente.rua) {
            let ruaNumero = cliente.rua;
            if (cliente.numero) ruaNumero += `, ${cliente.numero}`;
            enderecoPartes.push(ruaNumero);
        }
        if (cliente.complemento) enderecoPartes.push(cliente.complemento);
        if (cliente.bairro) enderecoPartes.push(cliente.bairro);

        let cidadeEstado = '';
        if (cliente.cidade) cidadeEstado += cliente.cidade;
        if (cliente.estado) {
            if (cidadeEstado) cidadeEstado += ' - ';
            cidadeEstado += cliente.estado;
        }
        if (cidadeEstado) enderecoPartes.push(cidadeEstado);

        if (cliente.cep) enderecoPartes.push(`CEP: ${cliente.cep}`);

        if (enderecoPartes.length > 0) {
            clienteEndereco = enderecoPartes.join('<br>');
        }
    }

    // Preparar lista de andamentos formatada
    let andamentosHTML = '<p class="text-muted">Nenhum andamento registrado</p>';
    if (chamado.andamentos && chamado.andamentos.length > 0) {
        andamentosHTML = '<ul class="timeline">';
        chamado.andamentos.forEach(andamento => {
            // Formatar data do andamento
            let dataAndamento = 'N/A';
            try {
                if (andamento.data_hora) {
                    const data = new Date(andamento.data_hora);
                    dataAndamento = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                console.error('Erro ao formatar data do andamento:', e);
            }

            andamentosHTML += `
                <li>
                    <div class="timeline-badge"><i class="bi bi-clock-history"></i></div>
                    <div class="timeline-panel">
                        <div class="timeline-heading">
                            <h6 class="timeline-title">${dataAndamento}</h6>
                        </div>
                        <div class="timeline-body">
                            <p>${andamento.texto}</p>
                        </div>
                    </div>
                </li>
            `;
        });
        andamentosHTML += '</ul>';
    }

    // Dados do agendamento
    const agendamento = chamado.agendamento;
    const agendamentoInfo = agendamento
        ? `
            <p><strong>Data e Hora da Visita:</strong> ${new Date(agendamento.data_agendamento).toLocaleString('pt-BR')} - ${new Date(agendamento.data_final_agendamento).toLocaleString('pt-BR')}</p>
            <p><strong>Observação:</strong> ${agendamento.observacoes || 'Nenhuma observação'}</p>
        `
        : '<p><strong>Agendamento:</strong> Nenhum agendamento encontrado</p>';


    // Construir o conteúdo do modal da ordem de serviço
    const modalContent = `
        <!-- Área que será impressa -->
        <div id="service-order-printable">
            <!-- Cabeçalho da Ordem de Serviço -->
            <div class="service-order-header">
                <div class="row">
                    <div class="col-8">
                        <h2 class="company-name">${empresaInfo.nome}</h2>
                        <p class="company-info">
                            ${empresaInfo.endereco}<br>
                            ${empresaInfo.cidade}<br>
                            ${empresaInfo.telefone} | ${empresaInfo.email}
                        </p>
                    </div>
                    <div class="col-4 text-end">
                        <div class="order-number">
                            <h3>ORDEM DE SERVIÇO</h3>
                            <h4>Nº ${chamado.protocolo || chamado.id}</h4>
                            <p>Data: ${dataAtual}</p>
                        </div>
                    </div>
                </div>
                <div class="service-order-separator"></div>
            </div>
            
            <!-- Informações do Cliente -->
            <div class="client-info-section">
                <div class="row">
                    <div class="col-12">
                        <h4>CLIENTE</h4>
                    </div>
                </div>
                <div class="row">
                    <div class="col-6">
                        <p>${clienteInfo}</p>
                        <p>${clienteContato}</p>
                    </div>
                    <div class="col-6">
                        <p>${clienteEndereco}</p>
                    </div>
                </div>
            </div>
            
            <!-- Detalhes da Solicitação -->
            <div class="service-request-section">
                <div class="row">
                    <div class="col-12">
                        <h4>DETALHES DA SOLICITAÇÃO</h4>
                    </div>
                </div>
                <div class="row">
                    <div class="col-6">
                        <p><strong>Data de Abertura:</strong> ${dataAbertura}</p>
                        <p><strong>Solicitante:</strong> ${chamado.solicitante || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> ${chamado.telefone || 'Não informado'}</p>
                    </div>
                    <div class="col-6">
                        <p><strong>Assunto:</strong> ${chamado.assunto || 'Não informado'}</p>
                        <p><strong>Status:</strong> ${chamado.status || 'Aberto'}</p>
                    </div>
                </div>

                <div class="agendamento-section">
                    <h4>DETALHES DO AGENDAMENTO</h4>
                    ${agendamentoInfo}
                </div>
        
                <div class="row mt-3">
                    <div class="col-12">
                        <h5>Descrição do Problema</h5>
                        <div class="problem-description">
                            ${chamado.descricao || 'Sem descrição'}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Andamentos e Relatórios -->
            <div class="service-history-section">
                <div class="row">
                    <div class="col-12">
                        <h4>HISTÓRICO DE ATENDIMENTO</h4>
                        <div class="andamentos-container">
                            ${andamentosHTML}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Assinaturas -->
            <div class="signatures-section">
                <div class="row">
                    <div class="col-6 text-center">
                        <div class="signature-line"></div>
                        <p>Técnico Responsável</p>
                    </div>
                    <div class="col-6 text-center">
                        <div class="signature-line"></div>
                        <p>Cliente</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Atualizar o conteúdo do modal
    document.getElementById('serviceOrderModalBody').innerHTML = modalContent;

    // Exibir o modal
    const modalElement = document.getElementById('serviceOrderModal');
    const modal = new bootstrap.Modal(document.getElementById('serviceOrderModal'));
    modal.show();
}

// Função para imprimir a ordem de serviço
function printServiceOrder() {
    window.print();
}

// Função para exportar a ordem de serviço como PDF
function exportOrderToPDF() {
    const element = document.getElementById('service-order-printable');

    // Configurações do PDF
    const opt = {
        margin: [10, 10, 10, 10],
        filename: 'ordem-servico.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Mostrar indicador de carregamento
    showLoading();

    // Converter e baixar como PDF
    html2pdf().set(opt).from(element).save().then(() => {
        hideLoading();
    }).catch(error => {
        console.error('Erro ao gerar PDF:', error);
        hideLoading();
        exibirMensagem('Erro ao gerar PDF. Por favor, tente novamente.', 'erro');
    });
}

// Função para exportar a ordem de serviço como PNG
function exportOrderToPNG() {
    const element = document.getElementById('service-order-printable');

    // Mostrar indicador de carregamento
    showLoading();

    // Usar html2canvas para converter para imagem
    html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            // Garantir que o elemento clonado esteja visível e com dimensões apropriadas
            const clonedElement = clonedDoc.getElementById('service-order-printable');
            clonedElement.style.width = 'auto';
            clonedElement.style.height = 'auto';
            clonedElement.style.position = 'relative';
            clonedElement.style.overflow = 'visible';
        }
    }).then(canvas => {
        // Converter para PNG e baixar
        const link = document.createElement('a');
        link.download = 'ordem-servico.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        hideLoading();
    }).catch(error => {
        console.error('Erro ao gerar PNG:', error);
        hideLoading();
        exibirMensagem('Erro ao gerar imagem PNG. Por favor, tente novamente.', 'erro');
    });
}

// Função para exportar a ordem de serviço como JPG
function exportOrderToJPG() {
    const element = document.getElementById('service-order-printable');

    // Mostrar indicador de carregamento
    showLoading();

    // Usar html2canvas para converter para imagem
    html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            // Garantir que o elemento clonado esteja visível e com dimensões apropriadas
            const clonedElement = clonedDoc.getElementById('service-order-printable');
            clonedElement.style.width = 'auto';
            clonedElement.style.height = 'auto';
            clonedElement.style.position = 'relative';
            clonedElement.style.overflow = 'visible';
        }
    }).then(canvas => {
        // Converter para JPG e baixar
        const link = document.createElement('a');
        link.download = 'ordem-servico.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();

        hideLoading();
    }).catch(error => {
        console.error('Erro ao gerar JPG:', error);
        hideLoading();
        exibirMensagem('Erro ao gerar imagem JPG. Por favor, tente novamente.', 'erro');
    });
}
