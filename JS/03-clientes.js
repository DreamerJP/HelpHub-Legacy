// Funcionalidades específicas para Clientes

// Variáveis globais para clientes
let clientes = [];
let paginaAtualClientes = 1;
let totalPaginasClientes = 1;
let clientesPorPagina = 10;
let clienteSelecionado = null;
let termoPesquisaClientes = '';
let ordemColuna = 'id';
let ordemDirecao = 'asc';

// Exibe spinner de loading global
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function () {
    // Verificar se estamos na página de clientes
    if (document.getElementById('pesquisa-cliente')) {
        carregarClientesPage();
    }

    // Verificar se estamos na página de cadastro
    if (document.getElementById('novo-cliente-form')) {
        configurarFormularioCliente();
    }

    if (document.getElementById('editar-cliente-form')) {
        configurarFormularioCliente();
    }
});

// Função para carregar a página de clientes
async function carregarClientesPage() {
    try {
        await carregarClientes();
        configurarPesquisaClientes();
        configurarSelecaoClientes();
        configurarOrdenacaoClientes();
        configurarPaginacaoClientes();
    } catch (erro) {
        console.error('Erro ao carregar página de clientes:', erro);
        exibirMensagem('Erro ao carregar clientes', 'erro');
    }
}

// Função para carregar clientes do servidor
async function carregarClientes() {
    try {
        showLoading();
        let url, dados;
        if (termoPesquisaClientes) {
            url = `/clientes/buscar?termo=${encodeURIComponent(termoPesquisaClientes)}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Erro ao buscar clientes');
            const resultado = await resposta.json();
            clientes = (Array.isArray(resultado) ? resultado : resultado.clientes) || [];
            totalPaginasClientes = 1;
        } else {
            url = `/clientes?pagina=${paginaAtualClientes}&limite=${clientesPorPagina}&order_field=${ordemColuna}&order_order=${ordemDirecao}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Erro ao carregar clientes');
            dados = await resposta.json();
            clientes = dados.clientes || [];
            totalPaginasClientes = Math.max(1, Math.ceil((dados.total || 0) / clientesPorPagina));
        }
        renderizarClientes();
        atualizarPaginacaoClientes();
    } catch (erro) {
        console.error('Erro ao carregar clientes:', erro);
        exibirMensagem('Erro ao carregar clientes', 'erro');
    } finally {
        hideLoading();
    }
}

// Função para renderizar a lista de clientes
function renderizarClientes() {
    const tbody = document.getElementById('clientes');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">
                    <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                    <p class="mt-2 text-muted">Nenhum cliente encontrado</p>
                </td>
            </tr>
        `;
        return;
    }

    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', cliente.id);
        tr.setAttribute('data-nome', cliente.nome);
        tr.setAttribute('data-email', cliente.email);
        tr.onclick = () => selecionarCliente(cliente.id);
        // E-mails
        let emails = (cliente.email || '').split(/\s*\/\s*|\s*,\s*|\s*;\s*|\s*\/\s*/).filter(e => e);
        let emailFormatado = emails.length > 0 ? emails[0] : '-';
        if (emails.length > 1) emailFormatado += ` <span class='text-muted'>(+${emails.length - 1})</span>`;
        // Telefones
        let tels = (cliente.telefone || '').split(/\s*\/\s*|\s*,\s*|\s*;\s*/).filter(t => t);
        let telFormatado = tels.length > 0 ? tels[0] : '-';
        if (tels.length > 1) telFormatado += ` <span class='text-muted'>(+${tels.length - 1})</span>`;
        tr.innerHTML = `
            <td>
                <strong>#${cliente.id}</strong> - ${cliente.nome}
                ${cliente.ativo === 'Não' ? '<span class="badge bg-danger ms-2">Inativo</span>' : ''}
            </td>
            <td>${cliente.nome_fantasia || '-'}</td>
            <td>${emailFormatado}</td>
            <td>${telFormatado}</td>
        `;
        if (clienteSelecionado === cliente.id) tr.classList.add('selected');
        tbody.appendChild(tr);
    });

    // Após renderizar, reconfigurar paginação
    configurarPaginacaoClientes();
}

// Função para selecionar um cliente
function selecionarCliente(clienteId) {
    // Remover seleção anterior
    document.querySelectorAll('#clientes tr').forEach(tr => {
        tr.classList.remove('selected');
    });

    // Selecionar nova linha
    const tr = document.querySelector(`#clientes tr[data-id="${clienteId}"]`);
    if (tr) {
        tr.classList.add('selected');
        clienteSelecionado = clienteId;

        // Habilitar botões de ação
        document.getElementById('btn-editar-cliente').disabled = false;
        document.getElementById('btn-excluir-cliente').disabled = false;
        document.getElementById('btn-detalhes-cliente').disabled = false;
        document.getElementById('btn-notas-cliente').disabled = false;
    }
}

// Função para configurar pesquisa de clientes
function configurarPesquisaClientes() {
    const inputPesquisa = document.getElementById('pesquisa-cliente');
    if (!inputPesquisa) return;

    let timeoutId;
    inputPesquisa.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            termoPesquisaClientes = e.target.value.trim();
            paginaAtualClientes = 1;
            carregarClientes();
            document.getElementById('paginacao-clientes').style.display = termoPesquisaClientes ? 'none' : '';
        }, 300);
    });
}

// Função para configurar seleção de clientes
function configurarSelecaoClientes() {
    // Configurar botões de ação
    const btnEditar = document.getElementById('btn-editar-cliente');
    const btnExcluir = document.getElementById('btn-excluir-cliente');
    const btnDetalhes = document.getElementById('btn-detalhes-cliente');
    const btnNotas = document.getElementById('btn-notas-cliente');

    if (btnEditar) {
        btnEditar.onclick = editarClienteSelecionado;
    }

    if (btnExcluir) {
        btnExcluir.onclick = excluirClienteSelecionado;
    }

    if (btnDetalhes) {
        btnDetalhes.onclick = detalhesClienteSelecionado;
    }

    if (btnNotas) {
        btnNotas.onclick = notasClienteSelecionado;
    }
}

// Função para editar cliente selecionado
function editarClienteSelecionado() {
    if (!clienteSelecionado) {
        exibirMensagem('Selecione um cliente para editar', 'erro');
        return;
    }

    const cliente = clientes.find(c => c.id === clienteSelecionado);
    if (cliente) {
        carregarEditarClientePage(cliente);
    }
}

// Função para excluir cliente selecionado
function excluirClienteSelecionado() {
    if (!clienteSelecionado) {
        exibirMensagem('Selecione um cliente para excluir', 'erro');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        excluirCliente(clienteSelecionado);
    }
}

// Função para excluir cliente
async function excluirCliente(id) {
    try {
        showLoading();
        const resposta = await fetch(`/clientes/${id}`, {
            method: 'DELETE'
        });

        if (resposta.ok) {
            exibirMensagem('Cliente excluído com sucesso!');
            clienteSelecionado = null;
            carregarClientes();
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro: ${erro.erro}`, 'erro');
        }
    } catch (erro) {
        console.error('Erro ao excluir cliente:', erro);
        exibirMensagem('Erro ao excluir cliente', 'erro');
    } finally {
        hideLoading();
    }
}

// Função para carregar página de edição de cliente
function carregarEditarClientePage(cliente) {
    // Redirecionar para página de edição com dados do cliente
    const url = `/p/clientes-edicao?id=${cliente.id}`;
    window.location.href = url;
}

// Função para carregar página de novo cliente
function carregarNovoClientePage() {
    window.location.href = '/p/clientes-cadastro';
}

// Função para ordenar clientes
function ordenarClientes(field) {
    clientes.sort((a, b) => {
        let aVal = a[field] || '';
        let bVal = b[field] || '';

        if (field === 'id') {
            return parseInt(aVal) - parseInt(bVal);
        }

        return aVal.toString().localeCompare(bVal.toString());
    });

    renderizarClientes();
}

// Função para próxima página de clientes
function proximaPaginaClientes() {
    if (paginaAtualClientes < totalPaginasClientes) {
        paginaAtualClientes++;
        carregarClientes();
    }
}

// Função para página anterior de clientes
function paginaAnteriorClientes() {
    if (paginaAtualClientes > 1) {
        paginaAtualClientes--;
        carregarClientes();
    }
}

// Função para atualizar paginação
function atualizarPaginacaoClientes() {
    const paginacao = document.getElementById('paginacao-clientes');
    if (!paginacao) return;
    paginacao.querySelector('.page-info').textContent = `Página ${paginaAtualClientes} de ${totalPaginasClientes}`;
    paginacao.querySelector('#btn-pagina-anterior').disabled = paginaAtualClientes === 1;
    paginacao.querySelector('#btn-proxima-pagina').disabled = paginaAtualClientes === totalPaginasClientes;
    paginacao.style.display = termoPesquisaClientes ? 'none' : '';

    // Após atualizar, reconfigurar paginação
    configurarPaginacaoClientes();
}

// ===== MIGRAÇÃO E APRIMORAMENTO: Cadastro/Edição de Clientes =====

// Máscaras de input (simples, sem libs externas)
function aplicarMascaraCPF_CNPJ(input) {
    input.addEventListener('input', function () {
        let v = input.value.replace(/\D/g, '');
        if (v.length <= 11) {
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            v = v.replace(/(\d{2})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1/$2');
            v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        input.value = v;
    });
}
function aplicarMascaraTelefone(input) {
    input.addEventListener('input', function () {
        let v = input.value.replace(/\D/g, '');
        v = v.replace(/^0/, '');
        if (v.length > 10) {
            v = v.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (v.length > 5) {
            v = v.replace(/(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (v.length > 2) {
            v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
        } else {
            v = v.replace(/(\d*)/, '($1');
        }
        input.value = v;
    });
}
function aplicarMascaraCEP(input) {
    input.addEventListener('input', function () {
        let v = input.value.replace(/\D/g, '');
        if (v.length > 5) {
            v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
        }
        input.value = v;
    });
}

// Busca automática de endereço via CEP
function configurarBuscaCEP() {
    const cepInput = document.getElementById('cep');
    if (!cepInput) return;
    aplicarMascaraCEP(cepInput);
    cepInput.addEventListener('blur', async function () {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                showLoading();
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
                exibirMensagem('Erro ao buscar CEP', 'erro');
            } finally {
                hideLoading();
            }
        }
    });
}

// Validação de campos obrigatórios
function validarCamposCliente(formId) {
    const nome = document.getElementById('nome');
    if (!nome.value.trim()) {
        exibirMensagem('O campo Nome é obrigatório', 'erro');
        nome.focus();
        return false;
    }
    // Pode adicionar mais validações conforme necessário
    return true;
}

// Foco automático no primeiro campo
function focoAutomaticoPrimeiroCampo() {
    const nome = document.getElementById('nome');
    if (nome) nome.focus();
}

// Detectar modo edição/cadastro
function isEdicao() {
    return window.location.pathname.includes('clientes-edicao');
}

// Carregar dados do cliente na edição
async function carregarDadosClienteEdicao() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    try {
        showLoading();
        const resposta = await fetch(`/clientes/${id}`);
        if (!resposta.ok) throw new Error('Erro ao carregar dados do cliente');
        const cliente = await resposta.json();
        // Preencher campos principais
        for (const campo in cliente) {
            if (document.getElementById(campo)) {
                document.getElementById(campo).value = cliente[campo] || '';
            }
        }
        // Preencher campos de endereço explicitamente (garante para abas separadas)
        const camposEndereco = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'pais'];
        camposEndereco.forEach(campo => {
            if (document.getElementById(campo)) {
                document.getElementById(campo).value = cliente[campo] || '';
            }
        });
    } catch (erro) {
        exibirMensagem('Erro ao carregar dados do cliente', 'erro');
    } finally {
        hideLoading();
    }
}

// Submissão do formulário de cadastro/edição
function configurarFormularioCliente() {
    const formCadastro = document.getElementById('novo-cliente-form');
    const formEdicao = document.getElementById('editar-cliente-form');
    const cnpjCpf = document.getElementById('cnpj_cpf');
    const telefone = document.getElementById('telefone');
    if (cnpjCpf) aplicarMascaraCPF_CNPJ(cnpjCpf);
    if (telefone) aplicarMascaraTelefone(telefone);
    configurarBuscaCEP();
    focoAutomaticoPrimeiroCampo();
    if (formCadastro) {
        formCadastro.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!validarCamposCliente('novo-cliente-form')) return;
            // ... já implementado ...
        });
    }
    if (formEdicao) {
        formEdicao.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!validarCamposCliente('editar-cliente-form')) return;
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            if (!id) return exibirMensagem('ID do cliente não encontrado', 'erro');
            const clienteEditado = {
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
                showLoading();
                const resposta = await fetch(`/clientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteEditado)
                });
                if (resposta.ok) {
                    exibirMensagem('Cliente atualizado com sucesso!');
                    setTimeout(() => {
                        window.location.href = '/p/clientes';
                    }, 1200);
                } else {
                    const erro = await resposta.json();
                    exibirMensagem(`Erro: ${erro.erro}`, 'erro');
                }
            } catch (erro) {
                exibirMensagem('Erro ao atualizar cliente', 'erro');
            } finally {
                hideLoading();
            }
        });
        // Carregar dados do cliente ao abrir a página de edição
        carregarDadosClienteEdicao();
    }
}

// Função para exibir mensagens
function exibirMensagem(mensagem, tipo = 'sucesso') {
    // Criar elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'erro' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Inserir no início do container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);

        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Função para buscar clientes (para uso em outras páginas)
async function buscarClientes(termo) {
    try {
        const resposta = await fetch(`/clientes?search=${encodeURIComponent(termo)}`);
        if (!resposta.ok) throw new Error('Erro ao buscar clientes');

        const dados = await resposta.json();
        return dados.clientes || [];
    } catch (erro) {
        console.error('Erro ao buscar clientes:', erro);
        return [];
    }
}

// Função para mostrar detalhes do cliente
async function mostrarDetalhesCliente(clienteId) {
    try {
        const resposta = await fetch(`/clientes/${clienteId}`);
        if (!resposta.ok) throw new Error('Erro ao carregar detalhes do cliente');

        const cliente = await resposta.json();

        // Preencher modal com detalhes
        document.getElementById('endereco-cep').textContent = cliente.cep || 'N/A';
        document.getElementById('endereco-rua').textContent = cliente.rua || 'N/A';
        document.getElementById('endereco-numero').textContent = cliente.numero || 'N/A';
        document.getElementById('endereco-complemento').textContent = cliente.complemento || 'N/A';
        document.getElementById('endereco-bairro').textContent = cliente.bairro || 'N/A';
        document.getElementById('endereco-cidade').textContent = cliente.cidade || 'N/A';
        document.getElementById('endereco-estado').textContent = cliente.estado || 'N/A';
        document.getElementById('endereco-pais').textContent = cliente.pais || 'N/A';

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
        modal.show();
    } catch (erro) {
        console.error('Erro ao carregar detalhes do cliente:', erro);
        exibirMensagem('Erro ao carregar detalhes do cliente', 'erro');
    }
}

function configurarOrdenacaoClientes() {
    document.querySelectorAll('.modern-table th[data-field]').forEach(th => {
        const field = th.getAttribute('data-field');
        // Permitir ordenação apenas para 'id' e 'nome'
        if (field === 'id' || field === 'nome') {
            th.style.cursor = 'pointer';
            th.onclick = () => {
                if (ordemColuna === field) {
                    ordemDirecao = ordemDirecao === 'asc' ? 'desc' : 'asc';
                } else {
                    ordemColuna = field;
                    ordemDirecao = 'asc';
                }
                carregarClientes();
            };
        } else {
            th.style.cursor = 'default';
            th.onclick = null;
        }
    });
}

function detalhesClienteSelecionado() {
    if (!clienteSelecionado) return exibirMensagem('Selecione um cliente para ver detalhes', 'erro');
    window.location.href = `/p/clientes-detalhes?id=${clienteSelecionado}`;
}

function notasClienteSelecionado() {
    if (!clienteSelecionado) return exibirMensagem('Selecione um cliente para ver notas', 'erro');
    window.location.href = `/p/clientes-notas?id=${clienteSelecionado}`;
}

function configurarPaginacaoClientes() {
    const btnProxima = document.getElementById('btn-proxima-pagina');
    const btnAnterior = document.getElementById('btn-pagina-anterior');
    if (btnProxima) btnProxima.onclick = proximaPaginaClientes;
    if (btnAnterior) btnAnterior.onclick = paginaAnteriorClientes;
} 