// background.js - Script que roda em background
console.log('NFCe Extractor Extension - Background Script loaded!');

// Configurações globais
let extensionSettings = {};

// Inicialização
init();

// Função de inicialização
async function init() {
    try {
        // Carrega configurações
        await loadSettings();
        
        // Define data de instalação se for a primeira vez
        await setInstallDate();
        
        // Configura listeners
        setupListeners();
        
        console.log('Background Script inicializado!');
        
    } catch (error) {
        console.error('Erro na inicialização do background:', error);
    }
}

// Carrega configurações da extensão
async function loadSettings() {
    try {
        const result = await browser.storage.local.get([
            'enableNotifications', 'autoAction', 'showStats'
        ]);
        
        extensionSettings = {
            enableNotifications: result.enableNotifications !== false,
            autoAction: result.autoAction === true,
            showStats: result.showStats !== false
        };
        
        console.log('Background - Configurações carregadas:', extensionSettings);
        
    } catch (error) {
        console.error('Erro ao carregar configurações no background:', error);
    }
}

// Define data de instalação se for a primeira execução
async function setInstallDate() {
    try {
        const result = await browser.storage.local.get(['installDate']);
        
        if (!result.installDate) {
            await browser.storage.local.set({
                installDate: new Date().toISOString(),
                visitCount: 0,
                actionsPerformed: 0
            });
            
            console.log('Data de instalação definida');
        }
        
    } catch (error) {
        console.error('Erro ao definir data de instalação:', error);
    }
}

// Configura todos os listeners
function setupListeners() {
    
    // Listener para instalação/atualização
    browser.runtime.onInstalled.addListener(handleInstallation);
    
    // Listener para mensagens
    browser.runtime.onMessage.addListener(handleMessage);
    
    // Listener para mudanças no storage
    browser.storage.onChanged.addListener(handleStorageChange);
    
    // Listener para ativação de abas (opcional)
    if (browser.tabs && browser.tabs.onActivated) {
        browser.tabs.onActivated.addListener(handleTabActivated);
    }
    
    console.log('Listeners configurados');
}

// Manipula instalação/atualização da extensão
function handleInstallation(details) {
    console.log('Extensão instalada/atualizada:', details);
    
    if (details.reason === 'install') {
        console.log('Primeira instalação da extensão');
        
        // Mostra página de boas-vindas (opcional)
        // browser.tabs.create({
        //     url: browser.runtime.getURL('options.html')
        // });
        
        // Envia notificação de boas-vindas
        showNotification(
            'NFCe Extractor Extension Instalada!',
            'Clique no ícone da extensão para começar.',
            'welcome'
        );
        
    } else if (details.reason === 'update') {
        console.log('Extensão atualizada de', details.previousVersion, 'para', browser.runtime.getManifest().version);
    }
}

// Manipula mensagens de outros scripts
function handleMessage(message, sender, sendResponse) {
    console.log('Background - Mensagem recebida:', message, 'de:', sender);
    
    switch (message.action) {
        
        case 'settingsUpdated':
            handleSettingsUpdate(message.settings);
            sendResponse({success: true});
            break;
            
        case 'showNotification':
            showNotification(message.title, message.text, message.type);
            sendResponse({success: true});
            break;
            
        case 'getExtensionInfo':
            sendResponse({
                version: browser.runtime.getManifest().version,
                name: browser.runtime.getManifest().name,
                settings: extensionSettings
            });
            break;
            
        case 'broadcastToAllTabs':
            broadcastToAllTabs(message.data);
            sendResponse({success: true});
            break;
            
        case 'openOptionsPage':
            browser.runtime.openOptionsPage();
            sendResponse({success: true});
            break;
            
        default:
            console.log('Ação não reconhecida:', message.action);
            sendResponse({success: false, error: 'Ação não reconhecida'});
    }
    
    return true; // Resposta assíncrona
}

// Manipula atualizações de configurações
async function handleSettingsUpdate(newSettings) {
    try {
        extensionSettings = {...extensionSettings, ...newSettings};
        
        console.log('Background - Configurações atualizadas:', extensionSettings);
        
        // Propaga configurações para todos os content scripts
        const tabs = await browser.tabs.query({});
        
        for (const tab of tabs) {
            try {
                await browser.tabs.sendMessage(tab.id, {
                    action: 'updateSettings',
                    settings: extensionSettings
                });
            } catch (error) {
                // Ignora erros de abas que não têm content script
                console.log('Não foi possível enviar para aba:', tab.id);
            }
        }
        
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
    }
}

// Manipula mudanças no storage
function handleStorageChange(changes, namespace) {
    console.log('Storage alterado:', changes, 'namespace:', namespace);
    
    // Recarrega configurações se houver mudanças relevantes
    const relevantKeys = ['enableNotifications', 'autoAction', 'showStats'];
    
    if (Object.keys(changes).some(key => relevantKeys.includes(key))) {
        loadSettings();
    }
}

// Manipula ativação de abas
function handleTabActivated(activeInfo) {
    console.log('Aba ativada:', activeInfo.tabId);
    
    // Aqui você pode adicionar lógica para quando uma aba é ativada
    // Por exemplo, verificar configurações específicas da página
}

// Envia mensagem para todas as abas
async function broadcastToAllTabs(data) {
    try {
        const tabs = await browser.tabs.query({});
        
        for (const tab of tabs) {
            try {
                await browser.tabs.sendMessage(tab.id, data);
            } catch (error) {
                console.log('Não foi possível enviar para aba:', tab.id);
            }
        }
        
    } catch (error) {
        console.error('Erro ao enviar broadcast:', error);
    }
}

// Mostra notificação do sistema
function showNotification(title, message, type = 'basic') {
    if (!extensionSettings.enableNotifications) {
        console.log('Notificações desabilitadas');
        return;
    }
    
    // Verifica se as notificações são suportadas
    if (!browser.notifications) {
        console.log('API de notificações não suportada');
        return;
    }
    
    const notificationOptions = {
        type: 'basic',
        iconUrl: browser.runtime.getURL('icons/icons8-48.png'),
        title: title,
        message: message
    };
    
    browser.notifications.create(
        `nfce-extractor-${Date.now()}`,
        notificationOptions
    ).then((notificationId) => {
        console.log('Notificação criada:', notificationId);
        
        // Remove notificação após 5 segundos
        setTimeout(() => {
            browser.notifications.clear(notificationId);
        }, 5000);
        
    }).catch((error) => {
        console.error('Erro ao criar notificação:', error);
    });
}

// Função utilitária para log com timestamp
function log(message, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Background:`, message, ...args);
}

// Função para executar limpeza periódica (opcional)
function performMaintenanceTasks() {
    log('Executando tarefas de manutenção...');
    
    // Aqui você pode adicionar tarefas de limpeza
    // Por exemplo: limpar dados antigos, verificar atualizações, etc.
}

// Executa manutenção a cada hora (opcional)
setInterval(performMaintenanceTasks, 60 * 60 * 1000);

// Manipulador de erros global
window.addEventListener('error', function(e) {
    console.error('Erro no background script:', e.error);
});

console.log('NFCe Extractor Extension - Background Script ready!');