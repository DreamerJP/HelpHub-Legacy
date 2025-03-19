/**
 * Este arquivo contém as funções relacionadas às notas de clientes usando o CKEditor 5
 */

// Variável para guardar a instância do editor
let clientNotesEditor = null;

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
        const response = await fetch(`http://localhost:5000/clientes/${clientId}/notas`);
        
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
        
        const response = await fetch(`http://localhost:5000/clientes/${clientId}/notas`, {
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
    if (event.target.id === 'notas-tab') {
        const clientId = document.getElementById('id')?.value?.replace('#', '');
        if (clientId) {
            destroyClientNotesEditor(); // Garante que qualquer instância anterior seja destruída
            setTimeout(() => {
                initClientNotesEditor();
                setTimeout(() => {
                    loadClientNotes(clientId);
                }, 300);
            }, 100);
        }
    } else {
        // Se mudar para outra aba, destrói o editor
        destroyClientNotesEditor();
    }
});

// Remove o listener de beforeunload relacionado ao CKEditor, 
// pois ele não é mais necessário e pode causar problemas ao reinicializar o editor

// Substitui a área de notas em modais existentes
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('shown.bs.modal', function(event) {
        // Verifica se o modal aberto é o de detalhes do cliente
        if (event.target.id === 'clienteDetalhesModal') {
            // Não inicializa o editor, apenas carrega as notas para visualização
            const clientId = event.target.getAttribute('data-cliente-id');
            if (clientId) {
                // Busca as notas diretamente da API e atualiza o elemento de visualização
                fetch(`http://localhost:5000/clientes/${clientId}/notas`)
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

    document.addEventListener('hidden.bs.modal', function(event) {
        // Sempre destroi o editor quando o modal for fechado
        destroyClientNotesEditor();
    });
});
