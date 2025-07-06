// 08-db-viewer.js - Database Viewer modular

// Variáveis globais para importação e modal
let currentTable = '';
let tableData = [];
let tableColumns = [];
let importData = [];
let importColumns = [];
let importModal;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminRole();
    carregarEstatisticasBanco();
    carregarTabelas();
    const tableSelect = document.getElementById('table-select');
    if (tableSelect) {
        tableSelect.addEventListener('change', carregarTabelaSelecionada);
    } else {
        console.warn('Elemento #table-select não encontrado');
    }
    const filterInput = document.getElementById('filter-input');
    if (filterInput) {
        filterInput.addEventListener('input', setupTableFilter);
    } else {
        console.warn('Elemento #filter-input não encontrado');
    }
    const btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', () => exportTable('csv'));
    } else {
        // Não é crítico, pode ser dropdown
    }
    const refreshTable = document.getElementById('refresh-table');
    if (refreshTable) {
        refreshTable.addEventListener('click', refreshCurrentTable);
    } else {
        console.warn('Elemento #refresh-table não encontrado');
    }
    // Modal importação
    const processImportBtn = document.getElementById('processImport');
    if (processImportBtn) {
        processImportBtn.addEventListener('click', processImport);
    } else {
        console.warn('Elemento #processImport não encontrado');
    }
});

// Permissão: apenas admin
async function checkAdminRole() {
    try {
        const res = await fetch('/auth/check-role');
        if (!res.ok) throw new Error('Falha ao verificar papel');
        const data = await res.json();
        if (data.role !== 'admin') {
            exibirMensagem('Acesso restrito a administradores', 'erro');
            document.querySelector('.container').innerHTML = '<div class="alert alert-danger mt-4">Acesso restrito a administradores.</div>';
            throw new Error('Acesso negado');
        }
    } catch (e) {
        exibirMensagem('Acesso restrito a administradores', 'erro');
        document.querySelector('.container').innerHTML = '<div class="alert alert-danger mt-4">Acesso restrito a administradores.</div>';
        throw new Error('Acesso negado');
    }
}

// Carrega estatísticas gerais do banco
async function carregarEstatisticasBanco() {
    try {
        showLoading();
        const res = await fetch('/admin/database/stats');
        if (!res.ok) throw new Error('Falha ao buscar estatísticas');
        const data = await res.json();
        document.getElementById('db-size').textContent = data.total_size;
        document.getElementById('db-tables').textContent = `${data.table_count} tabelas`;
        document.getElementById('last-refresh').textContent = new Date().toLocaleString();
    } catch (e) {
        exibirMensagem('Erro ao carregar estatísticas: ' + e.message, 'erro');
        document.getElementById('db-size').textContent = 'Erro ao carregar';
        document.getElementById('db-tables').textContent = 'Erro ao carregar';
    } finally {
        hideLoading();
    }
}

// Carrega lista de tabelas
async function carregarTabelas() {
    try {
        showLoading();
        const res = await fetch('/admin/database/tables');
        if (!res.ok) throw new Error('Falha ao buscar tabelas');
        const data = await res.json();
        // Ordem recomendada de importação
        const ordemImportacao = [
            'clientes',
            'notas_clientes',
            'chamados',
            'chamados_andamentos',
            'agendamentos'
        ];
        // Separar tabelas em recomendadas e demais
        const tabelasRecomendadas = ordemImportacao.filter(t => data.includes(t));
        const tabelasRestantes = data.filter(t => !ordemImportacao.includes(t)).sort();
        const select = document.getElementById('table-select');
        select.innerHTML = '<option value="">Selecione uma tabela</option>' +
            [...tabelasRecomendadas, ...tabelasRestantes].map(t => `<option value="${t}">${t}</option>`).join('');
    } catch (e) {
        exibirMensagem('Erro ao carregar tabelas: ' + e.message, 'erro');
    } finally {
        hideLoading();
    }
}

// Carrega dados da tabela selecionada
async function carregarTabelaSelecionada() {
    const tabela = this.value || document.getElementById('table-select').value;
    if (!tabela) return;
    try {
        showLoading();
        currentTable = tabela;
        const elCurrentTable = document.getElementById('current-table');
        if (elCurrentTable) elCurrentTable.textContent = tabela;
        const res = await fetch(`/admin/database/tables/${tabela}/data`);
        if (!res.ok) throw new Error('Falha ao buscar dados da tabela');
        const data = await res.json();
        tableData = data.records;
        tableColumns = data.columns;
        // Atualizar estatísticas da tabela
        const elRecordCount = document.getElementById('record-count');
        if (elRecordCount) elRecordCount.textContent = data.count;
        const elTableSize = document.getElementById('table-size');
        if (elTableSize) elTableSize.textContent = data.size || 'N/A';
        // Estatísticas específicas
        const specificStats = document.getElementById('table-specific-stats');
        if (specificStats) {
            if (tabela === 'notas_clientes') {
                let nonEmptyCount = tableData.filter(record => record.notas && record.notas.trim().length > 0).length;
                specificStats.innerHTML = `<p><strong>Notas não vazias:</strong> ${nonEmptyCount} (${tableData.length ? Math.round(nonEmptyCount / tableData.length * 100) : 0}%)</p>`;
            } else {
                specificStats.innerHTML = '';
            }
        }
        // Renderizar tabela
        renderizarTabela(tableColumns, tableData);
        // Reset filtro
        const filterInput = document.getElementById('filter-input');
        if (filterInput) filterInput.value = '';
    } catch (e) {
        exibirMensagem('Erro ao carregar tabela: ' + e.message, 'erro');
        const elTableHead = document.getElementById('table-head');
        const elTableBody = document.getElementById('table-body');
        if (elTableHead) elTableHead.innerHTML = '<tr><th>Erro</th></tr>';
        if (elTableBody) elTableBody.innerHTML = '<tr><td>Erro ao carregar dados</td></tr>';
    } finally {
        hideLoading();
    }
}

// Renderiza tabela de dados (com modal de texto longo)
function renderizarTabela(colunas, registros) {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');
    if (!thead || !tbody) return;
    if (!colunas || colunas.length === 0) {
        thead.innerHTML = '<tr><th>Nenhum dado</th></tr>';
        tbody.innerHTML = '<tr><td>Nenhum registro</td></tr>';
        return;
    }
    thead.innerHTML = '<tr>' + colunas.map(c => `<th>${c}</th>`).join('') + '</tr>';
    tbody.innerHTML = registros.length === 0
        ? '<tr><td colspan="' + colunas.length + '">Nenhum registro encontrado</td></tr>'
        : registros.map(r => `<tr>${colunas.map(c => {
            const val = r[c];
            if (typeof val === 'string' && val.length > 100) {
                return `<td><div class='truncate-text' title='Clique para expandir'>${escapeHtml(val.substring(0, 100))}... <span class='expand-btn' onclick='showFullTextModal("${escapeHtml(val).replace(/'/g, "\\'")}")'>[Expandir]</span></div></td>`;
            } else {
                return `<td>${val !== null && val !== undefined ? escapeHtml(String(val)) : ''}</td>`;
            }
        }).join('')}</tr>`).join('');
}

// Escape HTML para evitar injeção de código
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Filtro detalhado
function setupTableFilter() {
    if (!tableData.length) return;
    const filterText = this.value.toLowerCase();
    if (!filterText) {
        renderizarTabela(tableColumns, tableData);
        const elRecordCount = document.getElementById('record-count');
        if (elRecordCount) elRecordCount.textContent = tableData.length;
        return;
    }
    const filteredData = tableData.filter(record => {
        return Object.values(record).some(value => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(filterText);
        });
    });
    const elRecordCount = document.getElementById('record-count');
    if (elRecordCount) elRecordCount.textContent = `${filteredData.length} / ${tableData.length}`;
    renderizarTabela(tableColumns, filteredData);
}

// Exportação (CSV/XLSX)
window.exportTable = function (format) {
    if (!currentTable) {
        exibirMensagem('Por favor, selecione uma tabela primeiro.', 'erro');
        return;
    }
    window.location.href = `/export/${format}/${currentTable}`;
};

// Importação com modal e preview
window.showImportModal = function () {
    if (!currentTable) {
        exibirMensagem('Por favor, selecione uma tabela antes de importar dados.', 'erro');
        return;
    }
    document.getElementById('importForm').reset();
    document.getElementById('importStatus').innerHTML = '';
    document.getElementById('previewTable').innerHTML = '<thead><tr><th>Selecione um arquivo para visualizar</th></tr></thead><tbody><tr><td>Nenhum dado para exibir</td></tr></tbody>';
    document.getElementById('processImport').disabled = true;
    const modalTitle = document.querySelector('#importModal .modal-title');
    modalTitle.innerHTML = `<i class='bi bi-file-earmark-arrow-up'></i> Importar dados para <strong>${currentTable}</strong>`;
    if (!importModal) {
        importModal = new bootstrap.Modal(document.getElementById('importModal'));
    }
    importModal.show();
    // Eventos para preview
    const fileInput = document.getElementById('csvFile');
    const delimiterInput = document.getElementById('delimiter');
    const hasHeaderSelect = document.getElementById('hasHeader');
    fileInput.onchange = () => {
        toggleCsvSettings();
        processSelectedFile();
    };
    delimiterInput.oninput = () => { if (fileInput.files.length > 0) processSelectedFile(); };
    hasHeaderSelect.onchange = () => { if (fileInput.files.length > 0) processSelectedFile(); };
};

function toggleCsvSettings() {
    const fileInput = document.getElementById('csvFile');
    const csvSettings = document.querySelector('.csv-settings');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const isCsv = file.name.endsWith('.csv');
        csvSettings.style.display = isCsv ? 'block' : 'none';
    }
}

function processSelectedFile() {
    toggleCsvSettings();
    const fileInput = document.getElementById('csvFile');
    const previewTable = document.getElementById('previewTable');
    const processImportBtn = document.getElementById('processImport');
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) {
        exibirMensagem('O arquivo é muito grande. Por favor, selecione um arquivo menor que 10MB.', 'erro');
        fileInput.value = '';
        return;
    }
    const isCsv = file.name.endsWith('.csv');
    const isXlsx = file.name.endsWith('.xlsx');
    if (isCsv) {
        processCsvFile(file, previewTable, processImportBtn);
    } else if (isXlsx) {
        processXlsxFile(file, previewTable, processImportBtn);
    } else {
        exibirMensagem('Formato de arquivo não suportado. Por favor, selecione um arquivo CSV ou XLSX.', 'erro');
        fileInput.value = '';
    }
}

function processCsvFile(file, previewTable, processImportBtn) {
    const delimiterInput = document.getElementById('delimiter');
    const hasHeaderSelect = document.getElementById('hasHeader');
    const delimiter = delimiterInput.value || ',';
    const hasHeader = hasHeaderSelect.value === 'true';
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const csv = e.target.result;
            const result = processCSV(csv, delimiter, hasHeader);
            importData = result.data;
            importColumns = result.columns;
            renderPreviewTable(previewTable, importColumns, importData);
            processImportBtn.disabled = false;
        } catch (error) {
            previewTable.innerHTML = `<thead><tr><th>Erro ao processar o arquivo</th></tr></thead><tbody><tr><td>${escapeHtml(error.message)}</td></tr></tbody>`;
            processImportBtn.disabled = true;
        }
    };
    reader.onerror = function () {
        previewTable.innerHTML = '<thead><tr><th>Erro ao ler o arquivo</th></tr></thead>';
        processImportBtn.disabled = true;
    };
    reader.readAsText(file);
}

function processXlsxFile(file, previewTable, processImportBtn) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            if (typeof XLSX === 'undefined') {
                previewTable.innerHTML = '<thead><tr><th>Erro: XLSX não carregado</th></tr></thead>';
                processImportBtn.disabled = true;
                return;
            }
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (jsonData.length === 0) throw new Error('O arquivo XLSX está vazio.');
            importColumns = jsonData[0];
            importData = jsonData.slice(1).map(row => {
                const rowData = {};
                importColumns.forEach((col, index) => { rowData[col] = row[index] || ''; });
                return rowData;
            });
            renderPreviewTable(previewTable, importColumns, importData);
            processImportBtn.disabled = false;
        } catch (error) {
            previewTable.innerHTML = `<thead><tr><th>Erro ao processar o arquivo</th></tr></thead><tbody><tr><td>${escapeHtml(error.message)}</td></tr></tbody>`;
            processImportBtn.disabled = true;
        }
    };
    reader.onerror = function () {
        previewTable.innerHTML = '<thead><tr><th>Erro ao ler o arquivo</th></tr></thead>';
        processImportBtn.disabled = true;
    };
    reader.readAsArrayBuffer(file);
}

function renderPreviewTable(previewTable, columns, data) {
    let previewHTML = '<thead><tr>';
    columns.forEach(column => { previewHTML += `<th>${escapeHtml(column)}</th>`; });
    previewHTML += '</tr></thead><tbody>';
    const previewRows = data.slice(0, 5);
    previewRows.forEach(row => {
        previewHTML += '<tr>';
        columns.forEach(column => { previewHTML += `<td>${escapeHtml(String(row[column] || ''))}</td>`; });
        previewHTML += '</tr>';
    });
    previewHTML += '</tbody>';
    previewTable.innerHTML = previewHTML;
}

function processCSV(csv, delimiter = ',', hasHeader = true) {
    const lines = csv.split(/\r\n|\n|\r/).filter(line => line.trim());
    if (lines.length === 0) throw new Error('O arquivo CSV está vazio');
    const headerLine = lines[0];
    const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    const dataStartIndex = hasHeader ? 1 : 0;
    const data = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i], delimiter);
        const rowData = {};
        const columnsToUse = hasHeader ? headers : fields.map((_, idx) => `column${idx + 1}`);
        for (let j = 0; j < columnsToUse.length; j++) {
            if (j < fields.length) {
                rowData[columnsToUse[j]] = fields[j];
            } else {
                rowData[columnsToUse[j]] = '';
            }
        }
        data.push(rowData);
    }
    return {
        columns: hasHeader ? headers : data[0] ? Object.keys(data[0]) : [],
        data: data
    };
}

function parseCSVLine(line, delimiter) {
    const fields = [];
    let inQuotes = false;
    let currentField = '';
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField);
    return fields;
}

async function processImport() {
    const importMode = document.querySelector('input[name="importMode"]:checked').value;
    const statusDiv = document.getElementById('importStatus');
    statusDiv.innerHTML = '<div class="alert alert-info">Processando importação, aguarde...</div>';
    this.disabled = true;
    try {
        const res = await fetch(`/admin/database/tables/${currentTable}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: importMode, columns: importColumns, data: importData })
        });
        const result = await res.json();
        if (result.success) {
            statusDiv.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle"></i> ${result.message}</div>`;
            setTimeout(() => {
                importModal.hide();
                refreshCurrentTable();
            }, 2000);
        } else {
            statusDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i> Erro: ${result.error}</div>`;
            this.disabled = false;
        }
    } catch (error) {
        statusDiv.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle"></i> Erro na comunicação com o servidor</div>`;
        this.disabled = false;
    }
}

// Atualiza estatísticas
function refreshDatabaseStats() {
    carregarEstatisticasBanco();
}

// Atualiza tabela atual
function refreshCurrentTable() {
    const tabela = document.getElementById('table-select').value;
    if (tabela) carregarTabelaSelecionada.call({ value: tabela });
}

// Utilitário para exibir mensagens
function exibirMensagem(mensagem, tipo = 'sucesso') {
    const div = document.getElementById('db-viewer-mensagem');
    div.innerHTML = `<div class="alert alert-${tipo === 'erro' ? 'danger' : 'success'} mt-3">${mensagem}</div>`;
    setTimeout(() => { div.innerHTML = ''; }, 4000);
}

// Utilitários de loading
function showLoading() {
    document.body.style.cursor = 'wait';
}
function hideLoading() {
    document.body.style.cursor = '';
}

// Modal de texto longo
window.showFullTextModal = function (text) {
    document.getElementById('full-text-content').textContent = text;
    new bootstrap.Modal(document.getElementById('textModal')).show();
}; 