// options.js - Lógica da página de configurações
document.addEventListener('DOMContentLoaded', function() {
    console.log('NFCe Extractor Extension - Options loaded!');

    // Elementos da interface
    const elements = {
        baseUrl: document.getElementById('baseUrl'),
        storeDocuments: document.getElementById('storeDocuments'),

        enableNotifications: document.getElementById('enableNotifications'),
        autoAction: document.getElementById('autoAction'),
        showStats: document.getElementById('showStats'),
        
        // Estatísticas
        totalVisits: document.getElementById('totalVisits'),
        actionsPerformed: document.getElementById('actionsPerformed'),
        daysActive: document.getElementById('daysActive'),
        
        // Botões
        saveBtn: document.getElementById('saveBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        resetBtn: document.getElementById('resetBtn'),
        
        // Status
        statusMessage: document.getElementById('statusMessage')
    };

    // Configurações padrão
    const defaultSettings = {
        baseUrl: '',
        storeDocuments: '',
        enableNotifications: true,
        autoAction: false,
        showStats: true,
        
        // Estatísticas
        visitCount: 0,
        actionsPerformed: 0,
        installDate: new Date().toISOString(),
        lastActive: new Date().toISOString()
    };

    // Event Listeners
    elements.saveBtn.addEventListener('click', saveSettings);
    elements.cancelBtn.addEventListener('click', loadSettings);
    elements.resetBtn.addEventListener('click', resetAllData);

    // Carrega configurações ao inicializar
    loadSettings();
    loadStatistics();

    // Função para carregar configurações
    async function loadSettings() {
        try {
            showStatus('Carregando configurações...', 'info');
            
            const result = await browser.storage.local.get(Object.keys(defaultSettings));
            
            // Mescla com configurações padrão
            const settings = { ...defaultSettings, ...result };
            
            // Preenche os campos
            elements.baseUrl.value = settings.baseUrl || '';
            elements.storeDocuments.value = settings.storeDocuments || '';
            elements.enableNotifications.checked = settings.enableNotifications !== false;
            elements.autoAction.checked = settings.autoAction === true;
            elements.showStats.checked = settings.showStats !== false;
            
            hideStatus();
            console.log('Configurações carregadas:', settings);
            
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            showStatus('Erro ao carregar configurações', 'error');
        }
    }

    // Função para salvar configurações
    async function saveSettings() {
        try {
            showStatus('Salvando configurações...', 'info');
            
            const settings = {
                baseUrl: elements.baseUrl.value.trim(),
                storeDocuments: elements.storeDocuments.value.trim(),
                enableNotifications: elements.enableNotifications.checked,
                autoAction: elements.autoAction.checked,
                showStats: elements.showStats.checked,
                lastActive: new Date().toISOString()
            };

            // Salva no storage
            await browser.storage.local.set(settings);
            
            // Notifica background script
            browser.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: settings
            });
            
            showStatus('✅ Configurações salvas com sucesso!', 'success');
            console.log('Configurações salvas:', settings);
            
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            showStatus('❌ Erro ao salvar configurações', 'error');
        }
    }

    // Função para carregar estatísticas
    async function loadStatistics() {
        try {
            const result = await browser.storage.local.get([
                'visitCount', 'actionsPerformed', 'installDate'
            ]);
            
            // Atualiza exibição das estatísticas
            elements.totalVisits.textContent = result.visitCount || 0;
            elements.actionsPerformed.textContent = result.actionsPerformed || 0;
            
            // Calcula dias ativo
            const installDate = new Date(result.installDate || Date.now());
            const today = new Date();
            const diffTime = Math.abs(today - installDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            elements.daysActive.textContent = diffDays;
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Função para resetar todos os dados
    async function resetAllData() {
        const confirmed = confirm(
            '⚠️ ATENÇÃO!\n\n' +
            'Esta ação irá apagar TODOS os dados da extensão, incluindo:\n' +
            '• Todas as configurações\n' +
            '• Todas as estatísticas\n' +
            '• Dados salvos\n\n' +
            'Esta ação não pode ser desfeita.\n\n' +
            'Tem certeza que deseja continuar?'
        );
        
        if (!confirmed) return;
        
        try {
            showStatus('Resetando dados...', 'info');
            
            // Limpa todo o storage
            await browser.storage.local.clear();
            
            // Redefine data de instalação
            await browser.storage.local.set({
                installDate: new Date().toISOString()
            });
            
            // Recarrega configurações padrão
            await loadSettings();
            await loadStatistics();
            
            showStatus('🗑️ Todos os dados foram resetados!', 'success');
            
        } catch (error) {
            console.error('Erro ao resetar dados:', error);
            showStatus('❌ Erro ao resetar dados', 'error');
        }
    }

    // Função para mostrar status
    function showStatus(message, type = 'info') {
        const statusEl = elements.statusMessage;
        statusEl.textContent = message;
        statusEl.className = `status-message status-${type}`;
        statusEl.style.display = 'block';
        
        console.log(`Status (${type}):`, message);
    }

    // Função para esconder status
    function hideStatus() {
        const statusEl = elements.statusMessage;
        statusEl.style.display = 'none';
    }

    // Auto-hide status após 5 segundos
    let statusTimeout;
    const originalShowStatus = showStatus;
    showStatus = function(message, type = 'info') {
        originalShowStatus(message, type);
        
        if (statusTimeout) clearTimeout(statusTimeout);
        
        if (type !== 'error') {
            statusTimeout = setTimeout(hideStatus, 5000);
        }
    };

    // Atualiza estatísticas periodicamente
    setInterval(loadStatistics, 30000); // A cada 30 segundos

    console.log('NFCe Extractor Extension - Options initialized!');
});