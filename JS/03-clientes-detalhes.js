document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const loadingDiv = document.getElementById('detalhes-cliente-loading');
    const detalhesDiv = document.getElementById('detalhes-cliente');
    const alertDiv = document.getElementById('alert-detalhes');
    function exibirMensagem(mensagem, tipo = 'danger') {
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.textContent = mensagem;
        alertDiv.style.display = 'block';
        setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
    }
    async function carregarDetalhes() {
        if (!id) {
            exibirMensagem('ID do cliente não informado.');
            return;
        }
        try {
            const res = await fetch(`/clientes/${id}`);
            if (!res.ok) {
                console.error('Erro HTTP ao buscar cliente:', res.status, res.statusText);
                throw new Error('Cliente não encontrado');
            }
            const c = await res.json();
            if (!c || !c.id) {
                console.error('Resposta inesperada da API:', c);
                throw new Error('Dados do cliente não encontrados');
            }
            // Exibir ID no topo direito
            document.getElementById('cliente-id').textContent = `#${c.id}`;

            // Montar Dados do Cliente
            let dadosHtml = `<h5 class='mb-3'>Informações Principais</h5><div class='row'><div class='col-md-6'>`;
            const isPessoaFisica = (c.tipo_cliente && c.tipo_cliente.toLowerCase().includes('física'));
            // Nome
            dadosHtml += `<div class='mb-2'><strong>${isPessoaFisica ? 'Nome Completo' : 'Razão Social'}:</strong> ${c.nome || ''}</div>`;
            // Nome Fantasia (apenas empresa)
            if (!isPessoaFisica && c.nome_fantasia) dadosHtml += `<div class='mb-2'><strong>Nome Fantasia:</strong> ${c.nome_fantasia}</div>`;
            // E-mail
            if (c.email) dadosHtml += `<div class='mb-2'><strong>E-mail:</strong> ${c.email}</div>`;
            // Telefone
            if (c.telefone) dadosHtml += `<div class='mb-2'><strong>Telefone:</strong> ${c.telefone}</div>`;
            // Ativo
            if (c.ativo) dadosHtml += `<div class='mb-2'><strong>Ativo:</strong> ${c.ativo}</div>`;
            // Tipo Cliente
            if (c.tipo_cliente) dadosHtml += `<div class='mb-2'><strong>Tipo Cliente:</strong> ${c.tipo_cliente}</div>`;
            dadosHtml += `</div><div class='col-md-6'>`;
            // CNPJ/CPF
            if (c.cnpj_cpf) dadosHtml += `<div class='mb-2'><strong>${isPessoaFisica ? 'CPF' : 'CNPJ'}:</strong> ${c.cnpj_cpf}</div>`;
            // IE/RG
            if (c.ie_rg) dadosHtml += `<div class='mb-2'><strong>${isPessoaFisica ? 'RG' : 'IE'}:</strong> ${c.ie_rg}</div>`;
            // Contribuinte ICMS (apenas empresa)
            if (!isPessoaFisica && c.contribuinte_icms) dadosHtml += `<div class='mb-2'><strong>Contribuinte ICMS:</strong> ${c.contribuinte_icms}</div>`;
            // RG Órgão Emissor (apenas pessoa física)
            if (isPessoaFisica && c.rg_orgao_emissor) dadosHtml += `<div class='mb-2'><strong>Órgão Emissor RG:</strong> ${c.rg_orgao_emissor}</div>`;
            // Inscrição Municipal (apenas empresa)
            if (!isPessoaFisica && c.inscricao_municipal) dadosHtml += `<div class='mb-2'><strong>Inscrição Municipal:</strong> ${c.inscricao_municipal}</div>`;
            dadosHtml += `</div></div>`;

            // Campos de pessoa física
            if (isPessoaFisica && (c.nacionalidade || c.naturalidade || c.estado_nascimento || c.data_nascimento || c.sexo || c.profissao || c.estado_civil)) {
                let pfHtml = `<div class='mt-4'><h5 class='mb-3'>Informações Pessoais</h5><div class='row'><div class='col-md-6'>`;
                if (c.nacionalidade) pfHtml += `<div class='mb-2'><strong>Nacionalidade:</strong> ${c.nacionalidade}</div>`;
                if (c.naturalidade) pfHtml += `<div class='mb-2'><strong>Naturalidade:</strong> ${c.naturalidade}</div>`;
                if (c.estado_nascimento) pfHtml += `<div class='mb-2'><strong>Estado Nascimento:</strong> ${c.estado_nascimento}</div>`;
                if (c.data_nascimento) pfHtml += `<div class='mb-2'><strong>Data Nascimento:</strong> ${c.data_nascimento}</div>`;
                if (c.sexo) pfHtml += `<div class='mb-2'><strong>Sexo:</strong> ${c.sexo}</div>`;
                if (c.profissao) pfHtml += `<div class='mb-2'><strong>Profissão:</strong> ${c.profissao}</div>`;
                if (c.estado_civil) pfHtml += `<div class='mb-2'><strong>Estado Civil:</strong> ${c.estado_civil}</div>`;
                pfHtml += `</div></div></div>`;
                dadosHtml += pfHtml;
            }
            document.getElementById('dados-cliente-content').innerHTML = dadosHtml;

            // Montar Endereço
            let enderecoHtml = `<div class='row'><div class='col-md-6'>`;
            enderecoHtml += `<div class='mb-2'><strong>CEP:</strong> ${c.cep || ''}</div>`;
            enderecoHtml += `<div class='mb-2'><strong>Rua:</strong> ${c.rua || ''}</div>`;
            enderecoHtml += `<div class='mb-2'><strong>Número:</strong> ${c.numero || ''}</div>`;
            enderecoHtml += `<div class='mb-2'><strong>Complemento:</strong> ${c.complemento || ''}</div>`;
            enderecoHtml += `<div class='mb-2'><strong>Bairro:</strong> ${c.bairro || ''}</div>`;
            enderecoHtml += `</div><div class='col-md-6'>`;
            enderecoHtml += `<div class='mb-2'><strong>Cidade:</strong> ${c.cidade || ''}</div>`;
            enderecoHtml += `<div class='mb-2'><strong>Estado:</strong> ${c.estado || ''}</div>`;
            enderecoHtml += `<div class='mb-2'><strong>País:</strong> ${c.pais || ''}</div>`;
            enderecoHtml += `</div></div>`;
            // Adicionar botão/link para rota no Google Maps
            const enderecoCompleto = encodeURIComponent(`${c.rua || ''} ${c.numero || ''}, ${c.bairro || ''}, ${c.cidade || ''}, ${c.estado || ''}, ${c.pais || ''}`.replace(/\s+/g, ' ').trim());
            enderecoHtml += `<div class='mt-3'><a href='#' id='btn-rota-maps' class='btn btn-outline-primary'><i class='bi bi-geo-alt'></i> Ver Rota no Google Maps</a></div>`;
            document.getElementById('endereco-cliente-content').innerHTML = enderecoHtml;
            // Evento para abrir rota no Google Maps com base na localização atual
            setTimeout(() => {
                const btnRota = document.getElementById('btn-rota-maps');
                if (btnRota) {
                    btnRota.onclick = function (e) {
                        e.preventDefault();
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(function (pos) {
                                const lat = pos.coords.latitude;
                                const lng = pos.coords.longitude;
                                const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${enderecoCompleto}&travelmode=driving`;
                                window.open(url, '_blank');
                            }, function () {
                                // Se usuário negar permissão, apenas abre o destino
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${enderecoCompleto}&travelmode=driving`;
                                window.open(url, '_blank');
                            });
                        } else {
                            // Se não suportar geolocalização, apenas abre o destino
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${enderecoCompleto}&travelmode=driving`;
                            window.open(url, '_blank');
                        }
                    };
                }
            }, 100);

            // Chamados (placeholder)
            document.getElementById('chamados-cliente-content').innerHTML = '<div class="text-muted">Em construção</div>';

            // Botão editar
            document.getElementById('btn-editar').href = `/p/clientes-edicao?id=${c.id}`;
            // Exibir detalhes
            loadingDiv.style.display = 'none';
            document.getElementById('clienteTabsContent').style.display = 'block';
        } catch (e) {
            loadingDiv.style.display = 'none';
            exibirMensagem('Erro ao carregar detalhes do cliente.');
            console.error('Erro ao carregar detalhes do cliente:', e);
        }
    }

    // CKEditor para notas
    if (window.CKEDITOR) {
        CKEDITOR.replace('notas-detalhes', { removePlugins: 'devtools' });
    }

    // Carregar notas do cliente na aba de Informações Adicionais
    async function carregarNotasClienteDetalhes() {
        if (!id) return;
        try {
            const res = await fetch(`/clientes/${id}/notas`);
            const data = await res.json();
            if (window.CKEDITOR && CKEDITOR.instances['notas-detalhes']) {
                CKEDITOR.instances['notas-detalhes'].setData(data.notas || '');
            } else {
                document.getElementById('notas-detalhes').value = data.notas || '';
            }
        } catch (e) {
            // Pode exibir mensagem de erro se desejar
        }
    }

    // Salvar notas do cliente
    async function salvarNotasClienteDetalhes(e) {
        e.preventDefault();
        if (!id) return;
        let notasValue = '';
        if (window.CKEDITOR && CKEDITOR.instances['notas-detalhes']) {
            notasValue = CKEDITOR.instances['notas-detalhes'].getData();
        } else {
            notasValue = document.getElementById('notas-detalhes').value;
        }
        try {
            const res = await fetch(`/clientes/${id}/notas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notas: notasValue })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('notas-salvas-msg').style.display = 'inline';
                setTimeout(() => {
                    document.getElementById('notas-salvas-msg').style.display = 'none';
                }, 2000);
            }
        } catch (e) {
            // Pode exibir mensagem de erro se desejar
        }
    }

    // Só carregar notas e inicializar CKEditor quando a aba for aberta
    const infoTab = document.getElementById('tab-info');
    if (infoTab) {
        infoTab.addEventListener('shown.bs.tab', function () {
            // Inicializar CKEditor apenas se ainda não foi inicializado
            if (window.CKEDITOR && !CKEDITOR.instances['notas-detalhes']) {
                CKEDITOR.replace('notas-detalhes', { removePlugins: 'devtools' });
                // Após inicializar, carregar as notas
                CKEDITOR.instances['notas-detalhes'].on('instanceReady', function () {
                    carregarNotasClienteDetalhes();
                });
            } else {
                carregarNotasClienteDetalhes();
            }
        });
    }
    // Submeter formulário de notas
    const formNotas = document.getElementById('form-notas-cliente-detalhes');
    if (formNotas) {
        formNotas.addEventListener('submit', salvarNotasClienteDetalhes);
    }

    // Carregar chamados do cliente na aba de Chamados
    async function carregarChamadosCliente() {
        if (!id) return;
        try {
            // Buscar todos os chamados do cliente (status aberto e finalizado)
            const resAbertos = await fetch(`/chamados?cliente_id=${id}&status=Aberto&limite=100`);
            const resFinalizados = await fetch(`/chamados?cliente_id=${id}&status=Finalizado&limite=100`);
            const dataAbertos = await resAbertos.json();
            const dataFinalizados = await resFinalizados.json();
            const chamados = [...(dataAbertos.chamados || []), ...(dataFinalizados.chamados || [])];

            // Filtrar apenas chamados do cliente atual
            const chamadosCliente = chamados.filter(chamado => String(chamado[1]) === String(id));

            let html = `<h5 class='mb-3'>Chamados do Cliente</h5>`;
            html += `<div class='d-flex justify-content-end mb-2'><a href='/p/chamados-cadastro?cliente_id=${id}' class='btn btn-primary'><i class='bi bi-plus-circle'></i> Novo Chamado</a></div>`;
            if (chamadosCliente.length === 0) {
                html += `<div class='alert alert-info'>Nenhum chamado encontrado para este cliente.</div>`;
            } else {
                html += `<div class='table-responsive'><table class='table table-bordered'><thead><tr><th>Protocolo</th><th>Status</th><th>Data</th><th>Assunto</th><th>Ação</th></tr></thead><tbody>`;
                chamadosCliente.forEach(chamado => {
                    const statusBadge = chamado[3] === 'Finalizado' ? `<span class='badge bg-success'>Finalizado</span>` : `<span class='badge bg-warning text-dark'>Aberto</span>`;
                    html += `<tr><td>${chamado[6]}</td><td>${statusBadge}</td><td>${formatarDataHora(chamado[4])}</td><td>${chamado[7] || ''}</td><td><a href='/p/chamados?chamado_id=${chamado[0]}' class='btn btn-info btn-sm'>Ver Detalhes</a></td></tr>`;
                });
                html += `</tbody></table></div>`;
                // Resumo
                const abertos = chamadosCliente.filter(c => c[3] === 'Aberto').length;
                const finalizados = chamadosCliente.filter(c => c[3] === 'Finalizado').length;
                html += `<div class='mt-3'><strong>Total de chamados:</strong> ${chamadosCliente.length}<br><strong>Chamados abertos:</strong> ${abertos}<br><strong>Chamados finalizados:</strong> ${finalizados}</div>`;
            }
            document.getElementById('chamados-cliente-content').innerHTML = html;
        } catch (e) {
            document.getElementById('chamados-cliente-content').innerHTML = `<div class='alert alert-danger'>Erro ao carregar chamados do cliente.</div>`;
        }
    }
    // Função utilitária para formatar data/hora
    function formatarDataHora(dataStr) {
        if (!dataStr) return '';
        const d = new Date(dataStr);
        if (isNaN(d)) return dataStr;
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    // Carregar chamados ao abrir a aba
    const tabChamados = document.getElementById('tab-chamados');
    if (tabChamados) {
        tabChamados.addEventListener('shown.bs.tab', function () {
            carregarChamadosCliente();
        });
    }

    carregarDetalhes();
}); 