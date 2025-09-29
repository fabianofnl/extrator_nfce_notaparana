// content.js - Script que roda no contexto das páginas web
(function() {
    'use strict';
    
    console.log('NFCe Extractor Extension - Content Script loaded!');
    
    // Variáveis globais
    let settings = {};
    let nfceExtractorElement = null;
    const settingsMessageErrors = [];
    const formData = {
        orderDate: null,
        orderType: '',
        orderNumber: '',
        orderTotalMax: '',
        result: ''
    };

    // Inicialização
    init();

    // Função de inicialização
    async function init() {
        console.log('Content Script Init');
        try {
            // Carrega configurações
            await loadSettings();
            
            // Cria estilos CSS da extensão
            createStyles();

            // Se auto-ação estiver habilitada, executa automaticamente
            if (settings.autoAction) {
                setTimeout(showNfceExtractor, 2000);
            }
            
        } catch (error) {
            console.error('Erro na inicialização do content script:', error);
        }
    }

    // Carrega configurações da extensão
    async function loadSettings() {
        try {
            const result = await browser.storage.local.get([
                'baseUrl','storeDocuments', 'enableNotifications', 'autoAction', 'showStats'
            ]);
            
            settings = {
                baseUrl: result.baseUrl || '',
                storeDocuments: result.storeDocuments || '',
                enableNotifications: result.enableNotifications !== false,
                autoAction: result.autoAction === true,
                showStats: result.showStats !== false
            };
            
            console.log('Content Script - Configurações carregadas:', settings);
            
        } catch (error) {
            console.error('Erro ao carregar configurações no content script:', error);
        }
    }

    // Cria estilos CSS para os elementos da extensão
    function createStyles() {
        if (document.getElementById('nfce-extractor-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'nfce-extractor-styles';
        styles.textContent = `
            .nfce-extractor-popup {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 300px;
                opacity: 0;
                transform: translateX(100px);
                transition: all 0.3s ease;
            }
            
            .nfce-extractor-popup.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .nfce-extractor-popup .title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .nfce-extractor-popup .message {
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 15px;
            }
            
            .nfce-extractor-popup .info {
                font-size: 12px;
                opacity: 0.8;
                margin-bottom: 15px;
                padding: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
            }

            .nfce-extractor-popup .errors ul {
                color: red;
                list-style-position: inside;
            }
            
            .nfce-extractor-popup .buttons {
                display: flex;
                gap: 10px;
            }

            .nfce-extractor-popup input[type="text"], input[type="email"], select, textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 6px;
                border: 2px solid #e0e0e0;
                border-radius: 5px;
                font-size: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: border-color 0.3s ease;
                display: unset;
            }

            .nfce-extractor-popup input:disabled {
                border: 2px solid #696969;
            }
            
            .nfce-extractor-popup button {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 5px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            
            .nfce-extractor-popup button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-1px);
            }
            
            .nfce-extractor-popup .close-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none !important;
                color: white;
                font-size: 16px;
                padding: 4px;
                min-width: auto;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .nfce-extractor-popup .form-group {
                margin-bottom: 10px;
            }

            .nfce-extractor-popup .input-result {
                padding: 15px !important;
                text-align: center;
                font-size: 11px !important;
            }

            .nfce-extractor-popup .input-button-container {
                display: flex;
            }

            .nfce-extractor-popup .input-field {
                border-radius: 5px 0 0 5px !important;
                border-right: none !important;
                font-size: 10px !important;
            }

            .nfce-extractor-popup .copy-button {
                border-left: none;
                border-radius: 0 5px 5px 0;
                padding: 0px 5px 0px 5px; !important
            }

        `;
        
        document.head.appendChild(styles);
    }

    function validateSettings() {
        //valida se existe baseUrl configurada
        if(!settings.baseUrl) {
            settingsMessageErrors.push('Não foi encontrado baseUrl cadastrado!');
        }
        if(!settings.storeDocuments){
            settingsMessageErrors.push('Não foram encontrados CNPJs cadastrados!');
        }

        if(!!settings.baseUrl) {

            const baseUrlPage = window.location.origin + window.location.pathname;

            if(!(settings.baseUrl === baseUrlPage)) {
                settingsMessageErrors.push('A página atual não é a mesma configurada');
                settingsMessageErrors.push('A página atual: ' + baseUrlPage);
                settingsMessageErrors.push('A página configurada: ' + settings.baseUrl);
                settingsMessageErrors.push('Dados não serão processados');
            }
        }
    }

    function hasSettingErrors() {
        return settingsMessageErrors.length > 0;
    }

    function processingDOM() {

        if(hasSettingErrors()) return;

        const storeDocuments = settings.storeDocuments;
        const lines = storeDocuments.split("\n");

        const mapa = new Map();
        populateStoreDocumentsToMap(lines, mapa);

        const cnpj = extrairCNPJ();
        const orderType = mapa.get(cnpj); //'mercado';

        const orderInfoText = document.getElementById('infos').querySelector('ul').querySelector('li').textContent;
        const orderNumeroMatch = orderInfoText.match(/Número:\s(\d+)/);
        const orderEmissaoMatch = orderInfoText.match(/Emissão:\s([\d\/: ]+)/);

        const orderNumber = orderNumeroMatch ? orderNumeroMatch[1] : 'xxx';
        
        let orderDate = orderEmissaoMatch ? orderEmissaoMatch[1] : 'xxx';
        if(orderDate !== 'xxx') {
            orderDate = parseDateDDMMYYYY(orderDate);
        }

        let orderTotalMax = document.querySelector('.totalNumb.txtMax').textContent;
        orderTotalMax = parseFloat(orderTotalMax.replace('.','').replace(',','.'));

        const result = createResult(orderDate, orderType, orderNumber, orderTotalMax);

        formData.orderDate = orderDate;
        formData.orderType = orderType;
        formData.orderNumber = orderNumber;
        formData.orderTotalMax = orderTotalMax;
        formData.result = result;

    }

    // Função principal para mostrar NFCe Extractor
    function showNfceExtractor() {
        // Remove popup anterior se existir
        removeNfceExtractor();

        // Valida os dados Settings
        validateSettings();

        // Processa os dados da pagina
        processingDOM();

        // Mensagem da validacao dos settings
        let messageErrorElement = '';
        if(hasSettingErrors()) {
            
            const ul = document.createElement("ul");
            
            settingsMessageErrors.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                ul.appendChild(li);
            });

            messageErrorElement = `
                <div class="info errors">
                    <p>❌ Erros Encontrados</p>
                    ${ul.outerHTML}
                    <p><small><strong>Nota:</strong> Conferir as configurações se necessário</small></p>
                </div>
            `;

        }
        
        // Cria novo popup
        const popup = document.createElement('div');
        popup.className = 'nfce-extractor-popup';
        popup.innerHTML = `
            <button class="close-btn" title="Fechar">×</button>
            <div class="title">
                Extractor NFCe Nota Paraná!
            </div>
            <div class="message">
                Ferramenta de extração de dados da NFCe do Nota Paraná
            </div>
            <div class="info">
                📍 Página: <strong>${window.location.hostname}</strong>
            </div>
            <div class="info">
                <p>📑 Dados da Nota Paraná</p>
                <div class="form-group">
                    <label for="documentDate">Data da nota</label>
                    <input id="documentDate" type="text" value="${formatDateDDMMYYYY(formData.orderDate)}">
                </div>
                <div class="form-group">
                    <label for="documentType">Tipo da nota</label>
                    <input id="documentType" type="text" value="${formData.orderType}">
                </div>
                <div class="form-group">
                    <label for="documentNumber">Número da nota</label>
                    <input id="documentNumber" type="text" value="${formData.orderNumber}">
                </div>
                <div class="form-group">
                    <label for="documentValue">Valor da nota</label>
                    <input id="documentValue" type="text" value="${formatNumberPointToComma(formData.orderTotalMax)}">
                </div>
            </div>
            <div class="info">
                <div class="input-button-container">
                    <input id="result" type="text" value="${formData.result}" title="${formData.result}" class="input-field" disabled="disabled" >
                    <button id="copyBtn" class="copy-button">📋</button>
                </div>
            </div>
            ${messageErrorElement}
            <div class="buttons">
                <button onclick="this.parentElement.parentElement.remove()">OK</button>
                <button id="openConfigBtn">Configurações</button>
            </div>
        `;

        
        // Adiciona event listeners
        const documentDate = popup.querySelector('#documentDate');
        documentDate.addEventListener('keyup', changeDocumentDate);

        const documentType = popup.querySelector('#documentType');
        documentType.addEventListener('keyup', changeDocumentType);

        const documentNumber = popup.querySelector('#documentNumber');
        documentNumber.addEventListener('keyup', changeDocumentNumber);

        const documentValue = popup.querySelector('#documentValue');
        documentValue.addEventListener('keyup', changeDocumentValue);

        const copyBtn = popup.querySelector('#copyBtn');
        copyBtn.addEventListener('click', copyValueToClipboard);

        const closeBtn = popup.querySelector('.close-btn');
        closeBtn.addEventListener('click', removeNfceExtractor);

        const openConfigBtn = popup.querySelector('#openConfigBtn');
        openConfigBtn.addEventListener('click', openConfiguration);
        
        // Adiciona ao DOM
        document.body.appendChild(popup);
        nfceExtractorElement = popup;
        
        // Mostra com animação
        setTimeout(() => popup.classList.add('show'), 100);
        
        // Auto-remove após 10 segundos
        //setTimeout(removeNfceExtractor, 10000);
        
        // Incrementa contador de ações
        incrementActionCount();
        
        console.log('NFCe Extractor popup mostrado!');
    }

    function openSettingsPage() {
        try {
            // Método mais confiável: enviar mensagem ao background
            browser.runtime.sendMessage({
                action: 'openOptionsPage'
            });
        } catch (error) {
            console.error('Erro ao abrir página de configurações:', error);
            
            // Fallback: abre em nova aba
            try {
                const optionsUrl = browser.runtime.getURL('options.html');
                window.open(optionsUrl, '_blank');
            } catch (e) {
                console.error('Falha no fallback:', e);
            }
        }
    }

    // Remove popup NFCe Extractor
    function removeNfceExtractor() {
        if (nfceExtractorElement) {
            nfceExtractorElement.classList.remove('show');
            setTimeout(() => {
                if (nfceExtractorElement && nfceExtractorElement.parentNode) {
                    nfceExtractorElement.parentNode.removeChild(nfceExtractorElement);
                }
                nfceExtractorElement = null;
            }, 300);
        }
    }

    // Abre as configurações
    function openConfiguration() {
        browser.runtime.sendMessage({
            action: 'openOptionsPage'
        }).then(() => {
            console.log('Página de configurações solicitada');
            removeHelloWorld();
        }).catch(error => {
            console.error('Erro ao abrir configurações:', error);
            // Fallback: tenta abrir diretamente
            openSettingsPage();
        });
    }

    // Incrementa contador de ações executadas
    async function incrementActionCount() {
        try {
            const result = await browser.storage.local.get(['actionsPerformed']);
            const newCount = (result.actionsPerformed || 0) + 1;
            
            await browser.storage.local.set({
                actionsPerformed: newCount,
                lastActive: new Date().toISOString()
            });
            
            console.log('Contador de ações incrementado:', newCount);
            
        } catch (error) {
            console.error('Erro ao incrementar contador de ações:', error);
        }
    }

    // Mostra notificação personalizada
    function showNotification(title, message) {
        if (!settings.enableNotifications) return;
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10001;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            max-width: 250px;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 14px;">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    function changeDocumentDate(){

        const self = this;

        console.log('changeDocumentDate self');
        console.log(self);
        console.log(self.value);

        const documentDate = parseDateDDMMYYYY(self.value);
        
        const documentType = self.parentNode.parentNode.querySelector('#documentType').value;
        const documentNumber = self.parentNode.parentNode.querySelector('#documentNumber').value;
        const documentValue = formatNumberCommaToPoint(self.parentNode.parentNode.querySelector('#documentValue').value);

        const result = createResult(documentDate, documentType, documentNumber, documentValue);
        
        self.parentNode.parentNode.parentNode.querySelector('#result').value = result;

    }

    function changeDocumentType(){

        const self = this;

        console.log('changeDocumentType self');
        console.log(self);
        console.log(self.value);

        const documentType = self.value;
        
        const documentDate = parseDateDDMMYYYY(self.parentNode.parentNode.querySelector('#documentDate').value);
        const documentNumber = self.parentNode.parentNode.querySelector('#documentNumber').value;
        const documentValue = formatNumberCommaToPoint(self.parentNode.parentNode.querySelector('#documentValue').value);

        const result = createResult(documentDate, documentType, documentNumber, documentValue);
        
        self.parentNode.parentNode.parentNode.querySelector('#result').value = result;

    }

    function changeDocumentNumber(){

        const self = this;

        console.log('changeDocumentNumber self');
        console.log(self);
        console.log(self.value);

        const documentNumber = self.value;
        
        const documentDate = parseDateDDMMYYYY(self.parentNode.parentNode.querySelector('#documentDate').value);
        const documentType = self.parentNode.parentNode.querySelector('#documentType').value;
        const documentValue = formatNumberCommaToPoint(self.parentNode.parentNode.querySelector('#documentNumber').value);

        const result = createResult(documentDate, documentType, documentNumber, documentValue);
        
        self.parentNode.parentNode.parentNode.querySelector('#result').value = result;

    }

    function changeDocumentValue(){

        const self = this;

        console.log('changeDocumentValue self');
        console.log(self);
        console.log(self.value);

        const documentValue = formatNumberCommaToPoint(self.value);

        const documentDate = parseDateDDMMYYYY(self.parentNode.parentNode.querySelector('#documentDate').value);
        const documentType = self.parentNode.parentNode.querySelector('#documentType').value;
        const documentNumber = self.parentNode.parentNode.querySelector('#documentNumber').value;

        const result = createResult(documentDate, documentType, documentNumber, documentValue);
        
        self.parentNode.parentNode.parentNode.querySelector('#result').value = result;

    }

    async function copyValueToClipboard() {

        const self = this;

        // recupera o valor do input result (que está desativado)
        const resultValue = self.parentNode.querySelector('#result').value;

        // copia para o clipboard
        await navigator.clipboard.writeText(resultValue);

        self.textContent = "✅";

        setTimeout(function(){
            self.textContent = "📋";
        }, 5000);

    }

    // Escuta mensagens do popup/background
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content Script - Mensagem recebida:', message);
        
        switch (message.action) {
            case 'showNfceExtractor':
                showNfceExtractor();
                sendResponse({success: true});
                break;
                
            case 'hideNfceExtractor':
                removeNfceExtractor();
                sendResponse({success: true});
                break;
                
            case 'showNotification':
                showNotification(message.title, message.text);
                sendResponse({success: true});
                break;
                
            case 'updateSettings':
                settings = {...settings, ...message.settings};
                console.log('Configurações atualizadas no content script:', settings);
                sendResponse({success: true});
                break;
                
            case 'getPageInfo':
                sendResponse({
                    url: window.location.href,
                    title: document.title,
                    hostname: window.location.hostname
                });
                break;
                
            default:
                console.log('Ação não reconhecida:', message.action);
                sendResponse({success: false, error: 'Ação não reconhecida'});
        }
        
        return true; // Indica que a resposta será assíncrona
    });

    function createResult(date, orderType, orderNumber, orderTotalMax) {
        return 'diaria - ' + formatDateYYYYMMDD(date) + ' - ' + orderType + ' - ' + orderNumber + ' - ' + orderTotalMax;
    }

    function formatDateYYYYMMDD(date) {

        if(date == null)
            return '';

        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();


        if (day < 10) {
            day = '0' + day;
        }
        if (month < 10) {
            month = '0' + month;
        }
        
        return `${year}-${month}-${day}`;
    }

    function formatDateDDMMYYYY(date) {

        if(date == null)
            return '';

        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();


        if (day < 10) {
            day = '0' + day;
        }
        if (month < 10) {
            month = '0' + month;
        }
        
        return `${day}/${month}/${year}`;
    }

    function parseDateDDMMYYYY(date) {
        date = date.split(' ')[0].split('/');
        return new Date(date[2], date[1] -1, date[0]);
    }

    function parseDateYYYYMMDD(date) {
        date = date.split(' ')[0].split('-');
        return new Date(date[0], date[1] -1, date[2]);
    }

    function formatNumberCommaToPoint(value){
        if(!!value && value.length > 0 && value.includes(',')){
            return value.replace('.', '').replace(',', '.');
        }

        return value;
    }

    function formatNumberPointToComma(value){
        if(!!value && value.length > 0 && value.includes('.')){
            return value.replace('.', ',');
        }

        return value;
    }

    function extrairCNPJ() {

        const divText = document.querySelector("#conteudo .text");
        const texto = divText.textContent.trim();

        // Usa regex para pegar o CNPJ
        const regex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
        const match = texto.match(regex);

        if (match) {
            return match[0]
        } else {
            return '';
        }
    }

    function populateStoreDocumentsToMap(lines, mapa) {
        lines.forEach(line => {
            line = line.trim(); // remove espaços extras
            if (line && !line.startsWith("#") && line.includes("=")) {
                const [chave, valor] = line.split("=");
                mapa.set(chave.trim(), valor.trim());
            }
        });
    }

    // Detecta mudanças na página
    let lastUrl = window.location.href;
    new MutationObserver(() => {
        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            console.log('Navegação detectada:', lastUrl);
            
            // Recarrega configurações em caso de navegação
            loadSettings();
        }
    }).observe(document, {subtree: true, childList: true});

    console.log('NFCe Extractor Extension - Content Script initialized!');
})();
