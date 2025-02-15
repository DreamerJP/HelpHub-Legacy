// Função para carregar clientes e preencher a lista
async function carregarClientes(pagina = 1) {
    try {
        const resposta = await fetch(`http://localhost:5000/clientes?pagina=${pagina}&limite=10`);
        const clientes = await resposta.json();
        const listaClientes = document.getElementById('clientes');
        
        // Limpa a lista antes de adicionar os clientes
        listaClientes.innerHTML = '';

        // Adiciona cada cliente à lista
        clientes.forEach(cliente => {
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.innerHTML = `
                ${cliente[1]} - ${cliente[2]} - ${cliente[3]} - ${cliente[4]} 
                <button class="btn btn-warning btn-sm" onclick="abrirFormularioEdicaoCliente(${cliente[0]}, '${cliente[1]}', '${cliente[2]}', '${cliente[3]}', '${cliente[4]}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="excluirCliente(${cliente[0]})">Excluir</button>
            `;
            listaClientes.appendChild(item);
        });
    } catch (erro) {
        console.error('Erro ao carregar clientes:', erro);
    }
}

// Função para carregar clientes no select do formulário de chamados
async function carregarClientesSelect() {
    try {
        const resposta = await fetch('http://localhost:5000/clientes');
        const clientes = await resposta.json();
        const selectClientes = document.getElementById('cliente_id');

        // Limpa o select antes de adicionar os clientes
        selectClientes.innerHTML = '';

        // Adiciona cada cliente ao select
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente[0]; // ID do cliente
            option.textContent = cliente[1]; // Nome do cliente
            selectClientes.appendChild(option);
        });
    } catch (erro) {
        console.error('Erro ao carregar clientes no select:', erro);
    }
}

// Função para carregar chamados e preencher a lista
async function carregarChamados() {
    try {
        const resposta = await fetch('http://localhost:5000/chamados');
        const chamados = await resposta.json();
        const listaChamados = document.getElementById('chamados');

        // Limpa a lista antes de adicionar os chamados
        listaChamados.innerHTML = '';

        // Adiciona cada chamado à lista
        chamados.forEach(chamado => {
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.innerHTML = `
                <strong>Cliente ID:</strong> ${chamado[1]} <br>
                <strong>Descrição:</strong> ${chamado[2]} <br>
                <strong>Status:</strong> ${chamado[3]} <br>
                <strong>Data:</strong> ${chamado[4]} 
                <button class="btn btn-warning btn-sm" onclick="abrirFormularioEdicaoChamado(${chamado[0]}, '${chamado[2]}', '${chamado[3]}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="fecharChamado(${chamado[0]})">Fechar</button>
            `;
            listaChamados.appendChild(item);
        });
    } catch (erro) {
        console.error('Erro ao carregar chamados:', erro);
    }
}

// Função para cadastrar um novo cliente
document.getElementById('cliente-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;

    if (!nome) {
        exibirMensagem('O campo Nome é obrigatório!', 'danger');
        return;
    }

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
            carregarClientes(); // Atualiza a lista de clientes
            carregarClientesSelect(); // Atualiza o select de clientes no formulário de chamados
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro ao cadastrar cliente: ${erro.erro}`, 'danger');
        }
    } catch (erro) {
        console.error('Erro ao cadastrar cliente:', erro);
        exibirMensagem('Erro ao cadastrar cliente. Verifique o console para mais detalhes.', 'danger');
    }
});

// Função para abrir um novo chamado
document.getElementById('chamado-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const cliente_id = document.getElementById('cliente_id').value;
    const descricao = document.getElementById('descricao').value;

    if (!cliente_id || !descricao) {
        exibirMensagem('Todos os campos são obrigatórios!', 'danger');
        return;
    }

    try {
        const resposta = await fetch('http://localhost:5000/chamados', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cliente_id: parseInt(cliente_id), descricao }),
        });

        if (resposta.ok) {
            exibirMensagem('Chamado aberto com sucesso!');
            carregarChamados(); // Atualiza a lista de chamados
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro ao abrir chamado: ${erro.erro}`, 'danger');
        }
    } catch (erro) {
        console.error('Erro ao abrir chamado:', erro);
        exibirMensagem('Erro ao abrir chamado. Verifique o console para mais detalhes.', 'danger');
    }
});

// Função para editar um cliente
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
            carregarClientes(); // Atualiza a lista de clientes
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro ao editar cliente: ${erro.erro}`, 'danger');
        }
    } catch (erro) {
        console.error('Erro ao editar cliente:', erro);
        exibirMensagem('Erro ao editar cliente. Verifique o console para mais detalhes.', 'danger');
    }
}

// Função para excluir um cliente
async function excluirCliente(id) {
    try {
        const resposta = await fetch(`http://localhost:5000/clientes/${id}`, {
            method: 'DELETE',
        });

        if (resposta.ok) {
            exibirMensagem('Cliente excluído com sucesso!');
            carregarClientes(); // Atualiza a lista de clientes
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro ao excluir cliente: ${erro.erro}`, 'danger');
        }
    } catch (erro) {
        console.error('Erro ao excluir cliente:', erro);
        exibirMensagem('Erro ao excluir cliente. Verifique o console para mais detalhes.', 'danger');
    }
}

// Função para editar um chamado
async function editarChamado(id, descricao, status) {
    try {
        const resposta = await fetch(`http://localhost:5000/chamados/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ descricao, status }),
        });

        if (resposta.ok) {
            exibirMensagem('Chamado atualizado com sucesso!');
            carregarChamados(); // Atualiza a lista de chamados
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro ao editar chamado: ${erro.erro}`, 'danger');
        }
    } catch (erro) {
        console.error('Erro ao editar chamado:', erro);
        exibirMensagem('Erro ao editar chamado. Verifique o console para mais detalhes.', 'danger');
    }
}

// Função para fechar um chamado
async function fecharChamado(id) {
    try {
        const resposta = await fetch(`http://localhost:5000/chamados/${id}/fechar`, {
            method: 'PUT',
        });

        if (resposta.ok) {
            exibirMensagem('Chamado fechado com sucesso!');
            carregarChamados(); // Atualiza a lista de chamados
        } else {
            const erro = await resposta.json();
            exibirMensagem(`Erro ao fechar chamado: ${erro.erro}`, 'danger');
        }
    } catch (erro) {
        console.error('Erro ao fechar chamado:', erro);
        exibirMensagem('Erro ao fechar chamado. Verifique o console para mais detalhes.', 'danger');
    }
}

// Função para exibir mensagens de feedback
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const mensagemDiv = document.getElementById('mensagem');
    mensagemDiv.textContent = mensagem;
    mensagemDiv.className = `alert alert-${tipo === 'sucesso' ? 'success' : 'danger'}`;
    mensagemDiv.style.display = 'block';

    setTimeout(() => {
        mensagemDiv.style.display = 'none';
    }, 3000);
}

// Função para abrir o formulário de edição de cliente
function abrirFormularioEdicaoCliente(id, nome, email, telefone, endereco) {
    document.getElementById('nome').value = nome;
    document.getElementById('email').value = email;
    document.getElementById('telefone').value = telefone;
    document.getElementById('endereco').value = endereco;

    // Adiciona um evento para atualizar o cliente
    document.getElementById('cliente-form').onsubmit = async (event) => {
        event.preventDefault();
        await editarCliente(id, nome, email, telefone, endereco);
    };
}

// Função para abrir o formulário de edição de chamado
function abrirFormularioEdicaoChamado(id, descricao, status) {
    document.getElementById('descricao').value = descricao;

    // Adiciona um evento para atualizar o chamado
    document.getElementById('chamado-form').onsubmit = async (event) => {
        event.preventDefault();
        await editarChamado(id, descricao, status);
    };
}

// Carrega os dados ao abrir a página
carregarClientes();
carregarClientesSelect();
carregarChamados();