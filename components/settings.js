/**
 * Settings Component
 * Διαχείριση προεπιλεγμένων sites και ρυθμίσεων εφαρμογής
 */

class SettingsComponent {
    constructor(container, azureStorage, graphAPI, config) {
        this.container = container;
        this.azureStorage = azureStorage;
        this.graphAPI = graphAPI;
        this.config = config;
        this.defaultSites = [];
        this.isDirty = false;
    }

    /**
     * Render το component
     */
    async render() {
        this.container.innerHTML = `
            <div class="settings-container">
                <!-- Header -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h4><i class="bi bi-gear"></i> Ρυθμίσεις</h4>
                    </div>
                    <div class="col-md-6 text-end">
                        <button class="btn btn-primary btn-sm" id="saveSettingsBtn" disabled>
                            <i class="bi bi-save"></i> Αποθήκευση
                        </button>
                    </div>
                </div>

                <!-- Azure Storage Status -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-cloud"></i> Azure Storage</h5>
                    </div>
                    <div class="card-body">
                        <div id="azureStorageStatus">
                            <div class="spinner-border spinner-border-sm" role="status"></div>
                            <span class="ms-2">Έλεγχος σύνδεσης...</span>
                        </div>
                    </div>
                </div>

                <!-- Default Sites Management -->
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-bookmark"></i> Προεπιλεγμένα Sites</h5>
                        <button class="btn btn-sm btn-success" id="addDefaultSiteBtn">
                            <i class="bi bi-plus-circle"></i> Προσθήκη Site
                        </button>
                    </div>
                    <div class="card-body">
                        <p class="text-muted">
                            Τα προεπιλεγμένα sites εμφανίζονται ως επιλογή στο site selector. 
                            ${this.azureStorage.isConfigured() 
                                ? 'Αποθηκεύονται στο Azure Table Storage.'
                                : 'Προσοχή: Azure Storage δεν είναι ρυθμισμένο. Τα sites αποθηκεύονται προσωρινά.'
                            }
                        </p>
                        
                        <div id="defaultSitesList">
                            <div class="text-center p-4">
                                <div class="spinner-border" role="status"></div>
                                <p class="mt-2">Φόρτωση sites...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Import/Export -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-box-arrow-in-down"></i> Import/Export</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <button class="btn btn-outline-primary w-100" id="exportDefaultSitesBtn">
                                    <i class="bi bi-download"></i> Εξαγωγή Default Sites
                                </button>
                                <small class="text-muted d-block mt-1">Εξαγωγή σε JSON αρχείο</small>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-outline-secondary w-100" id="importDefaultSitesBtn">
                                    <i class="bi bi-upload"></i> Εισαγωγή Default Sites
                                </button>
                                <input type="file" id="importFileInput" accept=".json" style="display: none;">
                                <small class="text-muted d-block mt-1">Εισαγωγή από JSON αρχείο</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Application Info -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-info-circle"></i> Πληροφορίες Εφαρμογής</h5>
                    </div>
                    <div class="card-body">
                        <table class="table table-sm">
                            <tbody>
                                <tr>
                                    <td><strong>Έκδοση:</strong></td>
                                    <td>${this.config.app.version}</td>
                                </tr>
                                <tr>
                                    <td><strong>Tenant:</strong></td>
                                    <td>${this.config.sharepoint.tenantName}</td>
                                </tr>
                                <tr>
                                    <td><strong>Debug Mode:</strong></td>
                                    <td>${this.config.app.debugMode ? '✅ Ενεργό' : '❌ Ανενεργό'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Cache Timeout:</strong></td>
                                    <td>${this.config.app.cacheTimeout / 1000 / 60} λεπτά</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Add Site Modal -->
            <div class="modal fade" id="addSiteModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-plus-circle"></i> Προσθήκη Site</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Αναζήτηση Site</label>
                                <input type="text" class="form-control" id="addSiteSearchInput" placeholder="Πληκτρολογήστε για αναζήτηση...">
                                <div id="addSiteSearchResults" class="mt-2" style="max-height: 300px; overflow-y: auto;"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Ή εισάγετε URL απευθείας</label>
                                <input type="url" class="form-control" id="addSiteManualInput" placeholder="https://tenant.sharepoint.com/sites/sitename">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Ακύρωση</button>
                            <button type="button" class="btn btn-primary" id="confirmAddSiteBtn">Προσθήκη</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this._initialize();
        this._attachEventListeners();
    }

    /**
     * Initialize component
     */
    async _initialize() {
        await this._checkAzureStorageConnection();
        await this._loadDefaultSites();
    }

    /**
     * Έλεγχος σύνδεσης με Azure Storage
     */
    async _checkAzureStorageConnection() {
        const statusContainer = document.getElementById('azureStorageStatus');
        
        if (!this.azureStorage || !this.azureStorage.isConfigured()) {
            statusContainer.innerHTML = `
                <div class="alert alert-warning mb-0">
                    <i class="bi bi-exclamation-triangle"></i>
                    <strong>Azure Storage δεν είναι ρυθμισμένο</strong><br>
                    Τα default sites θα αποθηκεύονται προσωρινά στο browser.
                    Για μόνιμη αποθήκευση, ρυθμίστε το Azure Storage στο config.js.
                </div>
            `;
            return;
        }

        const result = await this.azureStorage.testConnection();
        
        if (result.success) {
            statusContainer.innerHTML = `
                <div class="alert alert-success mb-0">
                    <i class="bi bi-check-circle"></i>
                    <strong>Σύνδεση Επιτυχής</strong><br>
                    Συνδεδεμένο στο: ${this.azureStorage.accountName} / ${this.azureStorage.tableName}
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="bi bi-x-circle"></i>
                    <strong>Αποτυχία Σύνδεσης</strong><br>
                    ${result.message}
                </div>
            `;
        }
    }

    /**
     * Φόρτωση default sites
     */
    async _loadDefaultSites() {
        try {
            if (this.azureStorage && this.azureStorage.isConfigured()) {
                this.defaultSites = await this.azureStorage.getDefaultSites();
            } else {
                // Fallback στο config
                this.defaultSites = this.config.sharepoint.monitoredSites.map(url => ({
                    url: url,
                    name: this._extractSiteName(url)
                }));
            }

            this._renderDefaultSitesList();
        } catch (error) {
            console.error('Failed to load default sites', error);
            document.getElementById('defaultSitesList').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> Αποτυχία φόρτωσης sites
                </div>
            `;
        }
    }

    /**
     * Render λίστας default sites
     */
    _renderDefaultSitesList() {
        const container = document.getElementById('defaultSitesList');
        
        if (this.defaultSites.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">Δεν υπάρχουν προεπιλεγμένα sites</p>
                    <p><small>Κλικάρετε "Προσθήκη Site" για να ξεκινήσετε</small></p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="list-group">
                ${this.defaultSites.map((site, index) => `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${site.name}</h6>
                                <small class="text-muted">${site.url}</small>
                            </div>
                            <button class="btn btn-sm btn-outline-danger remove-site-btn" data-index="${index}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Attach remove handlers
        container.querySelectorAll('.remove-site-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this._removeSite(index);
            });
        });
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        // Save settings
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this._saveSettings();
        });

        // Add site
        document.getElementById('addDefaultSiteBtn')?.addEventListener('click', () => {
            this._showAddSiteModal();
        });

        // Export
        document.getElementById('exportDefaultSitesBtn')?.addEventListener('click', () => {
            this._exportDefaultSites();
        });

        // Import
        document.getElementById('importDefaultSitesBtn')?.addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importFileInput')?.addEventListener('change', (e) => {
            this._importDefaultSites(e.target.files[0]);
        });

        // Add site modal - search
        document.getElementById('addSiteSearchInput')?.addEventListener('input', debounce((e) => {
            this._searchSitesForAdd(e.target.value);
        }, 300));

        // Add site modal - confirm
        document.getElementById('confirmAddSiteBtn')?.addEventListener('click', () => {
            this._confirmAddSite();
        });
    }

    /**
     * Show add site modal
     */
    _showAddSiteModal() {
        const modal = new bootstrap.Modal(document.getElementById('addSiteModal'));
        document.getElementById('addSiteSearchInput').value = '';
        document.getElementById('addSiteManualInput').value = '';
        document.getElementById('addSiteSearchResults').innerHTML = '';
        modal.show();
    }

    /**
     * Search sites για προσθήκη
     */
    async _searchSitesForAdd(query) {
        const resultsContainer = document.getElementById('addSiteSearchResults');
        
        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        resultsContainer.innerHTML = '<div class="text-center p-2"><div class="spinner-border spinner-border-sm"></div></div>';

        try {
            const results = await this.graphAPI.searchSites(query, 20);
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="text-muted text-center p-2"><small>Δεν βρέθηκαν sites</small></div>';
                return;
            }

            resultsContainer.innerHTML = '<div class="list-group">' + results.map(site => {
                const alreadyAdded = this.defaultSites.some(s => s.url === site.webUrl);
                return `
                    <a href="#" class="list-group-item list-group-item-action ${alreadyAdded ? 'disabled' : ''} site-search-result" 
                       data-site-url="${site.webUrl}" data-site-name="${site.displayName || site.name}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${site.displayName || site.name}</div>
                                <small class="text-muted">${site.webUrl}</small>
                            </div>
                            ${alreadyAdded ? '<span class="badge bg-secondary">Ήδη προστέθηκε</span>' : ''}
                        </div>
                    </a>
                `;
            }).join('') + '</div>';

            // Add click handlers
            resultsContainer.querySelectorAll('.site-search-result:not(.disabled)').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const siteUrl = e.currentTarget.dataset.siteUrl;
                    const siteName = e.currentTarget.dataset.siteName;
                    document.getElementById('addSiteManualInput').value = siteUrl;
                    
                    // Optionally add immediately
                    this._addSite(siteUrl, siteName);
                    bootstrap.Modal.getInstance(document.getElementById('addSiteModal')).hide();
                });
            });
        } catch (error) {
            console.error('Search failed', error);
            resultsContainer.innerHTML = '<div class="text-danger text-center p-2"><small>Σφάλμα αναζήτησης</small></div>';
        }
    }

    /**
     * Confirm add site
     */
    _confirmAddSite() {
        const manualInput = document.getElementById('addSiteManualInput').value.trim();
        
        if (!manualInput) {
            showNotification('Εισάγετε ένα URL site', 'warning');
            return;
        }

        try {
            new URL(manualInput); // Validate URL
            const siteName = this._extractSiteName(manualInput);
            this._addSite(manualInput, siteName);
            bootstrap.Modal.getInstance(document.getElementById('addSiteModal')).hide();
        } catch (error) {
            showNotification('Μη έγκυρο URL', 'error');
        }
    }

    /**
     * Προσθήκη site
     */
    _addSite(siteUrl, siteName) {
        // Check if already exists
        if (this.defaultSites.some(s => s.url === siteUrl)) {
            showNotification('Το site υπάρχει ήδη στα προεπιλεγμένα', 'warning');
            return;
        }

        this.defaultSites.push({
            url: siteUrl,
            name: siteName || this._extractSiteName(siteUrl),
            addedDate: new Date().toISOString()
        });

        this._renderDefaultSitesList();
        this._markDirty();
        showNotification('Το site προστέθηκε', 'success');
    }

    /**
     * Αφαίρεση site
     */
    async _removeSite(index) {
        const site = this.defaultSites[index];
        
        if (!confirm(`Είστε σίγουροι ότι θέλετε να αφαιρέσετε το site:\n${site.name}?`)) {
            return;
        }

        this.defaultSites.splice(index, 1);
        this._renderDefaultSitesList();
        this._markDirty();
        showNotification('Το site αφαιρέθηκε', 'success');
    }

    /**
     * Αποθήκευση ρυθμίσεων
     */
    async _saveSettings() {
        if (!this.isDirty) {
            return;
        }

        try {
            showLoading('Αποθήκευση...');

            if (this.azureStorage && this.azureStorage.isConfigured()) {
                // Save to Azure Storage
                await this.azureStorage.saveDefaultSites(this.defaultSites);
            } else {
                // Save to localStorage as fallback
                localStorage.setItem('defaultSites', JSON.stringify(this.defaultSites));
            }

            this.isDirty = false;
            document.getElementById('saveSettingsBtn').disabled = true;
            
            hideLoading();
            showNotification('Οι ρυθμίσεις αποθηκεύτηκαν', 'success');
        } catch (error) {
            hideLoading();
            console.error('Failed to save settings', error);
            showNotification('Αποτυχία αποθήκευσης', 'error');
        }
    }

    /**
     * Export default sites
     */
    _exportDefaultSites() {
        const data = {
            version: this.config.app.version,
            exportDate: new Date().toISOString(),
            defaultSites: this.defaultSites
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `default-sites-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Τα sites εξήχθησαν', 'success');
    }

    /**
     * Import default sites
     */
    async _importDefaultSites(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.defaultSites || !Array.isArray(data.defaultSites)) {
                throw new Error('Invalid file format');
            }

            this.defaultSites = data.defaultSites;
            this._renderDefaultSitesList();
            this._markDirty();
            
            showNotification('Τα sites εισήχθησαν επιτυχώς', 'success');
        } catch (error) {
            console.error('Import failed', error);
            showNotification('Αποτυχία εισαγωγής αρχείου', 'error');
        }
    }

    /**
     * Mark settings as dirty
     */
    _markDirty() {
        this.isDirty = true;
        document.getElementById('saveSettingsBtn').disabled = false;
    }

    /**
     * Extract site name από URL
     */
    _extractSiteName(siteUrl) {
        try {
            const url = new URL(siteUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            return pathParts[pathParts.length - 1] || url.hostname;
        } catch (error) {
            return siteUrl;
        }
    }
}

// Helper: debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsComponent;
}

