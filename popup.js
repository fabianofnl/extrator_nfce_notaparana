// popup.js - Lógica da interface principal
document.addEventListener('DOMContentLoaded', function() {
    
    console.log('NFCe Extractor Extension - Popup loaded!');
    
    // Elementos da interface
    const currentUrlEl = document.getElementById('currentUrl');
    const visitCountEl = document.getElementById('visitCount');
    const statusEl = document.getElementById('status');
    const actionBtn = document.getElementById('actionBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    // Carrega dados salvos
    loadUserData();
    
    // Obtém informações da aba atual
    getCurrentTabInfo();
    
    // Event listeners
    actionBtn.addEventListener('click', performAction);
    settingsBtn.addEventListener('click', openSettings);

    // Função para carregar dados do usuário
    async function loadUserData() {
        try {
            const result = await browser.storage.local.get(['visitCount']);
            
            visitCountEl.textContent = result.visitCount || 0;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            updateStatus('Erro ao carregar configurações', 'error');
        }
    }

    // Função para obter informações da aba atual
    async function getCurrentTabInfo() {
        try {
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            
            if (tabs[0]) {
                const url = new URL(tabs[0].url);
                currentUrlEl.textContent = url.hostname || tabs[0].url;
                
                // Incrementa contador de visitas
                incrementVisitCount();
            }
        } catch (error) {
            console.error('Erro ao obter info da aba:', error);
            currentUrlEl.textContent = 'Não disponível';
        }
    }

    // Função para incrementar contador de visitas
    async function incrementVisitCount() {
        try {
            const result = await browser.storage.local.get(['visitCount']);
            const newCount = (result.visitCount || 0) + 1;
            
            await browser.storage.local.set({visitCount: newCount});
            visitCountEl.textContent = newCount;
        } catch (error) {
            console.error('Erro ao incrementar contador:', error);
        }
    }

    // Função para executar ação principal
    async function performAction() {
        updateStatus('Executando ação...', 'info');
        
        try {
            // Simula uma ação
            actionBtn.textContent = 'Executando...';
            actionBtn.disabled = true;
            
            // Envia mensagem para content script
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            
            if (tabs[0]) {
                await browser.tabs.sendMessage(tabs[0].id, {
                    action: 'showNfceExtractor'
                });
                
                updateStatus('Ação executada com sucesso! 🎉', 'success');
            }
        } catch (error) {
            console.error('Erro na ação:', error);
            updateStatus('Erro ao executar ação', 'error');
        } finally {
            setTimeout(() => {
                actionBtn.textContent = 'Ação Legal';
                actionBtn.disabled = false;
            }, 2000);
        }
    }

    // Função para abrir configurações
    function openSettings() {
        browser.runtime.openOptionsPage();
        window.close(); // Fecha o popup
    }

    // Função para atualizar status
    function updateStatus(message, type = 'info') {
        statusEl.textContent = message;
        statusEl.className = 'status';
        
        // Adiciona classe baseada no tipo
        if (type === 'error') {
            statusEl.style.background = 'rgba(255, 0, 0, 0.3)';
        } else if (type === 'success') {
            statusEl.style.background = 'rgba(0, 255, 0, 0.3)';
        } else {
            statusEl.style.background = 'rgba(0, 0, 0, 0.2)';
        }
        
        // Limpa status após 3 segundos
        setTimeout(() => {
            updateStatus('Extensão carregada com sucesso!');
        }, 3000);
    }

    // Escuta mensagens do background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateStatus') {
            updateStatus(message.text, message.type);
        }
        
        return true;
    });

    console.log('NFCe Extractor Extension - Popup initialized!');
});