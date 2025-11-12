/**
 * Debug Helper - Προσθέστε αυτό ΠΡΟΣΩΡΙΝΑ για debugging
 * Εμφανίζει debug info στην εφαρμογή
 */

window.SPDebugHelper = {
    /**
     * Show debug panel
     */
    showDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 2px solid #0d6efd;
            border-radius: 8px;
            padding: 15px;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h6 style="margin: 0;">🔍 Debug Panel</h6>
                <button onclick="document.getElementById('debugPanel').remove()" style="border: none; background: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <div id="debugContent" style="font-size: 12px;">
                <p>Loading debug info...</p>
            </div>
        `;

        document.body.appendChild(panel);

        this.updateDebugInfo();

        // Auto-refresh κάθε 2 δευτερόλεπτα
        setInterval(() => this.updateDebugInfo(), 2000);
    },

    /**
     * Update debug info
     */
    updateDebugInfo() {
        const content = document.getElementById('debugContent');
        if (!content) return;

        const info = {
            auth: !!window.app?.authManager,
            graphAPI: !!window.app?.graphAPI,
            spAPI: !!window.app?.spAPI,
            azureStorage: !!window.app?.azureStorage,
            configSites: CONFIG.sharepoint.monitoredSites.length,
            azureEnabled: CONFIG.azureStorage?.enabled,
            components: Object.keys(window.app?.components || {})
        };

        // Check SiteSelector
        const sitePermsComponent = window.app?.components?.sitePermissions;
        const siteSelector = sitePermsComponent?.siteSelector;

        let html = '<div>';
        
        // Status
        html += '<strong>📊 Status:</strong><br>';
        html += `✅ Auth: ${info.auth ? 'Ready' : '❌ Not initialized'}<br>`;
        html += `✅ Graph API: ${info.graphAPI ? 'Ready' : '❌ Not initialized'}<br>`;
        html += `✅ SP API: ${info.spAPI ? 'Ready' : '❌ Not initialized'}<br>`;
        html += `✅ Azure Storage: ${info.azureStorage ? 'Ready' : '❌ Not initialized'}<br>`;
        html += `<br>`;

        // Config
        html += '<strong>⚙️ Config:</strong><br>';
        html += `Sites in Config: <strong>${info.configSites}</strong><br>`;
        html += `Azure Storage: ${info.azureEnabled ? '✅ Enabled' : '⚠️ Disabled'}<br>`;
        html += `<br>`;

        // Site Selector
        if (siteSelector) {
            html += '<strong>🎯 Site Selector:</strong><br>';
            html += `Default Sites: <strong>${siteSelector.defaultSites?.length || 0}</strong><br>`;
            html += `All Sites: <strong>${siteSelector.allSites?.length || 0}</strong><br>`;
            html += `Loading: ${siteSelector.loadingSites ? '⏳ Yes' : '✅ No'}<br>`;
            html += `<br>`;
            
            if (siteSelector.defaultSites?.length > 0) {
                html += '<strong>📌 Default Sites:</strong><br>';
                html += '<ul style="margin: 5px 0; padding-left: 20px; font-size: 11px;">';
                siteSelector.defaultSites.slice(0, 3).forEach(s => {
                    html += `<li>${s.name}</li>`;
                });
                if (siteSelector.defaultSites.length > 3) {
                    html += `<li><em>...και ${siteSelector.defaultSites.length - 3} ακόμα</em></li>`;
                }
                html += '</ul>';
            }
        } else {
            html += '<strong>🎯 Site Selector:</strong><br>';
            html += '❌ Not initialized<br><br>';
        }

        // Components
        html += '<strong>🧩 Components:</strong><br>';
        if (info.components.length > 0) {
            html += `Loaded: ${info.components.join(', ')}<br>`;
        } else {
            html += '❌ No components loaded<br>';
        }

        html += '</div>';

        content.innerHTML = html;
    },

    /**
     * Test site loading
     */
    async testSiteLoading() {
        console.log('🧪 Testing Site Loading...\n');

        // Test 1: Config
        console.log('1️⃣ Config Sites:');
        CONFIG.sharepoint.monitoredSites.forEach((site, i) => {
            console.log(`   ${i + 1}. ${site}`);
        });

        // Test 2: Graph API
        console.log('\n2️⃣ Testing Graph API...');
        try {
            const sites = await app.graphAPI.getAllSites({ top: 10 });
            console.log(`   ✅ Loaded ${sites.length} sites from Graph API`);
            sites.slice(0, 5).forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.displayName}: ${s.webUrl}`);
            });
        } catch (error) {
            console.error('   ❌ Graph API Error:', error.message);
        }

        // Test 3: Azure Storage
        console.log('\n3️⃣ Testing Azure Storage...');
        if (app.azureStorage?.isConfigured()) {
            try {
                const defaultSites = await app.azureStorage.getDefaultSites();
                console.log(`   ✅ Loaded ${defaultSites.length} default sites from Azure`);
            } catch (error) {
                console.error('   ❌ Azure Storage Error:', error.message);
            }
        } else {
            console.log('   ⚠️ Azure Storage not configured');
        }

        // Test 4: Site Selector
        console.log('\n4️⃣ Testing Site Selector...');
        const selector = app.components.sitePermissions?.siteSelector;
        if (selector) {
            console.log(`   Default Sites: ${selector.defaultSites?.length || 0}`);
            console.log(`   All Sites: ${selector.allSites?.length || 0}`);
            console.log(`   Loading: ${selector.loadingSites}`);
        } else {
            console.log('   ❌ Site Selector not initialized');
        }

        console.log('\n✅ Test Complete!');
    },

    /**
     * Force reload all components
     */
    async forceReload() {
        console.log('🔄 Force reloading components...');
        
        try {
            showLoading('Επαναφόρτωση...');
            
            // Clear caches
            app.spAPI?.clearCache();
            app.graphAPI?.clearCache();
            app.azureStorage?.clearCache();

            // Reload components
            await app._initializeComponents();
            
            hideLoading();
            showNotification('Components reloaded!', 'success');
            console.log('✅ Reload complete!');
        } catch (error) {
            hideLoading();
            console.error('❌ Reload failed:', error);
            showNotification('Reload failed', 'error');
        }
    }
};

// Auto-show debug panel αν debug mode είναι enabled
if (CONFIG.app.debugMode) {
    document.addEventListener('DOMContentLoaded', () => {
        // Delay για να φορτώσει πρώτα η εφαρμογή
        setTimeout(() => {
            console.log(`
╔═══════════════════════════════════════╗
║   🔧 DEBUG MODE ENABLED               ║
╠═══════════════════════════════════════╣
║  Commands:                            ║
║  - SPDebugHelper.showDebugPanel()     ║
║  - SPDebugHelper.testSiteLoading()    ║
║  - SPDebugHelper.forceReload()        ║
╚═══════════════════════════════════════╝
            `);

            // Auto-show debug panel
            // SPDebugHelper.showDebugPanel();
        }, 3000);
    });
}

console.log('✅ Debug Helper loaded! Type: SPDebugHelper.showDebugPanel()');

