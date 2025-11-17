/**
 * Site Selector Component
 * Reusable component για επιλογή SharePoint sites
 * Υποστηρίζει: Default sites από Azure Storage, όλα τα sites από Graph API, και autocomplete search
 */

class SiteSelectorComponent {
    constructor(graphAPI, azureStorage, config) {
        this.graphAPI = graphAPI;
        this.azureStorage = azureStorage;
        this.config = config;
        this.allSites = [];
        this.defaultSites = [];
        this.selectedSites = [];
        this.mode = 'single'; // 'single' or 'multi'
        this.containerId = null;
        this.onSelectionChange = null;
        this.loadingSites = false;
    }

    /**
     * Render το component σε ένα container
     */
    async render(containerId, options = {}) {
        this.containerId = containerId;
        this.mode = options.mode || 'single';
        this.onSelectionChange = options.onSelectionChange || null;
        const showDefaultOption = options.showDefaultOption !== false; // Default true
        const placeholder = options.placeholder || 'Επιλέξτε Site';

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Initialize default sites IMMEDIATELY from config (synchronous)
        this.defaultSites = this.config.sharepoint.monitoredSites.map(url => ({
            url: url,
            name: this._extractSiteName(url)
        }));
        this.allSites = this._mergeUniqueSites(
            this.defaultSites.map(s => ({
                webUrl: s.url,
                displayName: s.name,
                name: s.name
            }))
        );

        // Render HTML immediately with config sites
        container.innerHTML = `
            <div class="site-selector-wrapper">
                ${this.mode === 'single' ? this._renderSingleSelect(placeholder, showDefaultOption) : this._renderMultiSelect(showDefaultOption)}
            </div>
        `;

        // Attach event listeners
        this._attachEventListeners();

        // Load additional sites in background (async - don't wait)
        this.loadSites().then(() => {
            // Re-render dropdown options after loading
            if (this.mode === 'single') {
                const dropdown = document.getElementById(`${this.containerId}_dropdown`);
                if (dropdown) {
                    const currentValue = dropdown.value;
                    const optionsHtml = this._renderSiteOptions();
                    // Update only the options, keep structure
                    const placeholder = dropdown.querySelector('option[value=""]');
                    const defaultOption = dropdown.querySelector('option[value="__DEFAULT__"]');
                    const separator = dropdown.querySelector('option[disabled]');
                    
                    dropdown.innerHTML = '';
                    if (placeholder) dropdown.appendChild(placeholder.cloneNode(true));
                    if (defaultOption) dropdown.appendChild(defaultOption.cloneNode(true));
                    if (separator) dropdown.appendChild(separator.cloneNode(true));
                    
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = `<select>${optionsHtml}</select>`;
                    const newOptions = tempDiv.querySelector('select').children;
                    for (const option of newOptions) {
                        dropdown.appendChild(option);
                    }
                    
                    dropdown.value = currentValue;
                }
            }
        }).catch(err => {
            this.logError('Background site loading failed', err);
        });
    }

    /**
     * Render single select dropdown
     */
    _renderSingleSelect(placeholder, showDefaultOption) {
        return `
            <div class="input-group">
                <select class="form-select site-selector-dropdown" id="${this.containerId}_dropdown">
                    <option value="">-- ${placeholder} --</option>
                    ${showDefaultOption ? '<option value="__DEFAULT__">📌 Προεπιλεγμένα Sites</option>' : ''}
                    ${showDefaultOption ? '<option disabled>──────────</option>' : ''}
                    ${this._renderSiteOptions()}
                </select>
                <button class="btn btn-outline-secondary" type="button" id="${this.containerId}_search_btn" title="Αναζήτηση Sites">
                    <i class="bi bi-search"></i>
                </button>
            </div>
            
            <!-- Search Modal -->
            <div class="site-search-dropdown" id="${this.containerId}_search_dropdown" style="display: none; position: absolute; z-index: 1000; background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 100%; max-height: 400px; overflow-y: auto;">
                <div class="p-2">
                    <input type="text" class="form-control form-control-sm" id="${this.containerId}_search_input" placeholder="Αναζήτηση site...">
                </div>
                <div id="${this.containerId}_search_results" class="list-group list-group-flush">
                    <div class="list-group-item text-muted text-center">
                        <small>Πληκτρολογήστε για αναζήτηση...</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render multi select mode
     */
    _renderMultiSelect(showDefaultOption) {
        return `
            <div class="site-selector-multi">
                <div class="mb-2">
                    ${showDefaultOption ? `
                    <button class="btn btn-sm btn-outline-primary me-2" id="${this.containerId}_load_defaults">
                        <i class="bi bi-bookmark"></i> Φόρτωση Προεπιλεγμένων
                    </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-secondary" id="${this.containerId}_show_all">
                        <i class="bi bi-list-ul"></i> Προβολή Όλων
                    </button>
                    <button class="btn btn-sm btn-outline-danger" id="${this.containerId}_clear_all">
                        <i class="bi bi-x-circle"></i> Καθαρισμός
                    </button>
                </div>
                
                <!-- Selected Sites -->
                <div id="${this.containerId}_selected_sites" class="mb-2">
                    <div class="text-muted"><small>Κανένα site επιλεγμένο</small></div>
                </div>
                
                <!-- Search Input -->
                <div class="input-group input-group-sm">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" id="${this.containerId}_multi_search" placeholder="Αναζήτηση και προσθήκη site...">
                </div>
                
                <!-- Search Results -->
                <div id="${this.containerId}_multi_results" class="site-search-results mt-2" style="max-height: 300px; overflow-y: auto; display: none;">
                </div>
            </div>
        `;
    }

    /**
     * Render site options για το dropdown
     */
    _renderSiteOptions() {
        // Show config sites immediately, even if allSites is loading
        const defaultSiteOptions = this.defaultSites.map(s => ({
            webUrl: s.url,
            displayName: s.name,
            name: s.name
        }));
        const normalizedAllSites = this.allSites?.length ? this.allSites : [];
        const sitesToShow = this._mergeUniqueSites([
            ...defaultSiteOptions,
            ...normalizedAllSites
        ]);

        if (!sitesToShow || sitesToShow.length === 0) {
            return '<option disabled>Δεν βρέθηκαν sites</option>';
        }

        return sitesToShow
            .sort((a, b) => (a.displayName || a.name || '').localeCompare(b.displayName || b.name || ''))
            .map(site => {
                const name = site.displayName || site.name || site.webUrl;
                return `<option value="${site.webUrl}">${name}</option>`;
            })
            .join('');
    }

    /**
     * Φόρτωση όλων των sites
     */
    async loadSites() {
        if (this.loadingSites) return;
        
        this.loadingSites = true;
        
        try {
            // Φόρτωση default sites από Azure Storage
            if (this.azureStorage && this.azureStorage.isConfigured()) {
                try {
                    this.defaultSites = await this.azureStorage.getDefaultSites();
                    this.logInfo(`Loaded ${this.defaultSites.length} default sites from Azure Storage`);
                } catch (error) {
                    this.logWarn('Failed to load default sites, using config', error);
                    this.defaultSites = this.config.sharepoint.monitoredSites.map(url => ({
                        url: url,
                        name: this._extractSiteName(url)
                    }));
                }
            } else {
                // Fallback στα monitored sites από config
                this.defaultSites = this.config.sharepoint.monitoredSites.map(url => ({
                    url: url,
                    name: this._extractSiteName(url)
                }));
            }

            // Φόρτωση όλων των sites από Graph API
            try {
                const sites = await this.graphAPI.getAllSites({ top: 300 });
                this.allSites = this._mergeUniqueSites([
                    ...(sites || [])
                ]);
                this.logInfo(`Loaded ${this.allSites.length} sites from Graph API`);
            } catch (error) {
                this.logError('Failed to load sites from Graph API', error);
                // Fallback: Use default sites + config sites as "all sites"
                this.allSites = [
                    ...this.defaultSites.map(s => ({
                        webUrl: s.url,
                        displayName: s.name,
                        name: s.name
                    })),
                    ...this.config.sharepoint.monitoredSites.map(url => ({
                        webUrl: url,
                        displayName: this._extractSiteName(url),
                        name: this._extractSiteName(url)
                    }))
                ];
                // Remove duplicates
                const uniqueSites = [];
                const seen = new Set();
                for (const site of this.allSites) {
                    if (!seen.has(site.webUrl)) {
                        seen.add(site.webUrl);
                        uniqueSites.push(site);
                    }
                }
                this.allSites = uniqueSites;
                this.logInfo(`Using ${this.allSites.length} sites from config as fallback`);
            }
        } finally {
            this.loadingSites = false;
        }
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        if (this.mode === 'single') {
            this._attachSingleSelectListeners();
        } else {
            this._attachMultiSelectListeners();
        }
    }

    /**
     * Event listeners για single select
     */
    _attachSingleSelectListeners() {
        const dropdown = document.getElementById(`${this.containerId}_dropdown`);
        const searchBtn = document.getElementById(`${this.containerId}_search_btn`);
        const searchDropdown = document.getElementById(`${this.containerId}_search_dropdown`);
        const searchInput = document.getElementById(`${this.containerId}_search_input`);

        if (!dropdown) {
            console.error(`Dropdown ${this.containerId}_dropdown not found!`);
            return;
        }

        // Dropdown change
        dropdown.addEventListener('change', async (e) => {
            const value = e.target.value;
            console.log(`[SiteSelector] Dropdown changed to: ${value}`);
            
            if (value === '__DEFAULT__') {
                // Επιλογή προεπιλεγμένων sites
                this.selectedSites = this.defaultSites.map(s => s.url);
                console.log(`[SiteSelector] Selected DEFAULT sites:`, this.selectedSites);
            } else if (value) {
                this.selectedSites = [value];
                console.log(`[SiteSelector] Selected site: ${value}`);
            } else {
                this.selectedSites = [];
                console.log(`[SiteSelector] No site selected`);
            }

            // Call callback
            if (this.onSelectionChange) {
                console.log(`[SiteSelector] Calling onSelectionChange callback...`);
                try {
                    await this.onSelectionChange(this.selectedSites, value === '__DEFAULT__');
                    console.log(`[SiteSelector] Callback completed successfully`);
                } catch (callbackError) {
                    console.error(`[SiteSelector] Callback error:`, callbackError);
                }
            } else {
                console.warn(`[SiteSelector] No onSelectionChange callback defined!`);
            }
        });

        // Search button
        searchBtn?.addEventListener('click', () => {
            const isVisible = searchDropdown.style.display === 'block';
            searchDropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                searchInput.focus();
            }
        });

        // Search input
        searchInput?.addEventListener('input', debounce(async (e) => {
            const query = e.target.value;
            await this._performSearch(query);
        }, 300));

        // Close search on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.site-selector-wrapper')) {
                searchDropdown.style.display = 'none';
            }
        });
    }

    /**
     * Event listeners για multi select
     */
    _attachMultiSelectListeners() {
        const loadDefaultsBtn = document.getElementById(`${this.containerId}_load_defaults`);
        const showAllBtn = document.getElementById(`${this.containerId}_show_all`);
        const clearAllBtn = document.getElementById(`${this.containerId}_clear_all`);
        const searchInput = document.getElementById(`${this.containerId}_multi_search`);

        loadDefaultsBtn?.addEventListener('click', async () => {
            this.selectedSites = this.defaultSites.map(s => s.url);
            this._updateMultiSelectedDisplay();
            if (this.onSelectionChange) {
                await this.onSelectionChange(this.selectedSites, true);
            }
        });

        showAllBtn?.addEventListener('click', () => {
            this._showAllSitesModal();
        });

        clearAllBtn?.addEventListener('click', async () => {
            this.selectedSites = [];
            this._updateMultiSelectedDisplay();
            if (this.onSelectionChange) {
                await this.onSelectionChange(this.selectedSites, false);
            }
        });

        searchInput?.addEventListener('input', debounce(async (e) => {
            const query = e.target.value;
            await this._performMultiSearch(query);
        }, 300));

        searchInput?.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                this._performMultiSearch(searchInput.value);
            }
        });
    }

    /**
     * Perform search και εμφάνιση αποτελεσμάτων
     */
    async _performSearch(query) {
        const resultsContainer = document.getElementById(`${this.containerId}_search_results`);
        
        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '<div class="list-group-item text-muted text-center"><small>Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες</small></div>';
            return;
        }

        resultsContainer.innerHTML = '<div class="list-group-item text-center"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

        try {
            const results = await this.graphAPI.searchSites(query, 20);
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="list-group-item text-muted text-center"><small>Δεν βρέθηκαν sites</small></div>';
                return;
            }

            resultsContainer.innerHTML = results.map(site => `
                <a href="#" class="list-group-item list-group-item-action search-result-item" data-site-url="${site.webUrl}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${site.displayName || site.name}</h6>
                    </div>
                    <small class="text-muted">${site.webUrl}</small>
                </a>
            `).join('');

            // Add click handlers
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const siteUrl = e.currentTarget.dataset.siteUrl;
                    const dropdown = document.getElementById(`${this.containerId}_dropdown`);
                    dropdown.value = siteUrl;
                    this.selectedSites = [siteUrl];
                    document.getElementById(`${this.containerId}_search_dropdown`).style.display = 'none';
                    
                    if (this.onSelectionChange) {
                        await this.onSelectionChange(this.selectedSites, false);
                    }
                });
            });
        } catch (error) {
            this.logError('Search failed', error);
            resultsContainer.innerHTML = '<div class="list-group-item text-danger text-center"><small>Σφάλμα αναζήτησης</small></div>';
        }
    }

    /**
     * Perform search για multi select
     */
    async _performMultiSearch(query) {
        const resultsContainer = document.getElementById(`${this.containerId}_multi_results`);
        
        if (!query || query.trim().length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="text-center p-2"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

        try {
            const results = await this.graphAPI.searchSites(query, 20);
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="text-muted text-center p-2"><small>Δεν βρέθηκαν sites</small></div>';
                return;
            }

            resultsContainer.innerHTML = '<div class="list-group">' + results.map(site => {
                const isSelected = this.selectedSites.includes(site.webUrl);
                return `
                    <a href="#" class="list-group-item list-group-item-action multi-search-result ${isSelected ? 'active' : ''}" data-site-url="${site.webUrl}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${site.displayName || site.name}</div>
                                <small class="text-muted">${site.webUrl}</small>
                            </div>
                            ${isSelected ? '<i class="bi bi-check-circle-fill"></i>' : '<i class="bi bi-plus-circle"></i>'}
                        </div>
                    </a>
                `;
            }).join('') + '</div>';

            // Add click handlers
            resultsContainer.querySelectorAll('.multi-search-result').forEach(item => {
                item.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const siteUrl = e.currentTarget.dataset.siteUrl;
                    
                    if (this.selectedSites.includes(siteUrl)) {
                        // Remove
                        this.selectedSites = this.selectedSites.filter(s => s !== siteUrl);
                        console.log('🟢 [SiteSelector] Site removed:', siteUrl);
                    } else {
                        // Add
                        this.selectedSites.push(siteUrl);
                        console.log('🟢 [SiteSelector] Site added:', siteUrl);
                    }
                    
                    console.log('🟢 [SiteSelector] Current selectedSites:', this.selectedSites);
                    
                    this._updateMultiSelectedDisplay();
                    
                    if (this.onSelectionChange) {
                        console.log('🟢 [SiteSelector] Calling onSelectionChange with:', this.selectedSites);
                        await this.onSelectionChange(this.selectedSites, false);
                    }
                    
                    // Refresh results
                    await this._performMultiSearch(query);
                });
            });
        } catch (error) {
            this.logError('Search failed', error);
            resultsContainer.innerHTML = '<div class="text-danger text-center p-2"><small>Σφάλμα αναζήτησης</small></div>';
        }
    }

    /**
     * Update εμφάνισης επιλεγμένων sites σε multi mode
     */
    _updateMultiSelectedDisplay() {
        const container = document.getElementById(`${this.containerId}_selected_sites`);
        
        if (this.selectedSites.length === 0) {
            container.innerHTML = '<div class="text-muted"><small>Κανένα site επιλεγμένο</small></div>';
            return;
        }

        container.innerHTML = '<div class="d-flex flex-wrap gap-2">' + 
            this.selectedSites.map(siteUrl => {
                const siteName = this._extractSiteName(siteUrl);
                return `
                    <span class="badge bg-primary d-flex align-items-center">
                        ${siteName}
                        <button type="button" class="btn-close btn-close-white ms-2" data-site-url="${siteUrl}" style="font-size: 0.7em;"></button>
                    </span>
                `;
            }).join('') + 
        '</div>';

        // Add remove handlers
        container.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const siteUrl = e.target.dataset.siteUrl;
                this.selectedSites = this.selectedSites.filter(s => s !== siteUrl);
                this._updateMultiSelectedDisplay();
                
                if (this.onSelectionChange) {
                    await this.onSelectionChange(this.selectedSites, false);
                }
            });
        });
    }

    /**
     * Show all sites modal (για multi select)
     */
    _showAllSitesModal() {
        // TODO: Implement modal με όλα τα sites
        alert('Feature under development: Show all sites modal');
    }

    /**
     * Get selected sites
     */
    getSelectedSites() {
        return this.selectedSites;
    }

    /**
     * Get default sites
     */
    getDefaultSites() {
        return this.defaultSites;
    }

    /**
     * Set selected sites programmatically
     */
    async setSelectedSites(sites, isDefault = false) {
        this.selectedSites = sites;
        
        if (this.mode === 'single') {
            const dropdown = document.getElementById(`${this.containerId}_dropdown`);
            if (dropdown) {
                dropdown.value = isDefault ? '__DEFAULT__' : (sites[0] || '');
            }
        } else {
            this._updateMultiSelectedDisplay();
        }

        if (this.onSelectionChange) {
            await this.onSelectionChange(this.selectedSites, isDefault);
        }
    }

    /**
     * Helper: Extract site name από URL
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

    _mergeUniqueSites(sites = []) {
        const seen = new Set();
        const merged = [];

        (sites || []).forEach(site => {
            const url = this._normalizeUrl(site.webUrl || site.url);
            if (!url || seen.has(url)) return;
            seen.add(url);
            merged.push({
                webUrl: site.webUrl || site.url,
                displayName: site.displayName || site.name || this._extractSiteName(site.webUrl || site.url),
                name: site.name || site.displayName || this._extractSiteName(site.webUrl || site.url)
            });
        });

        return merged;
    }

    _normalizeUrl(url = '') {
        return url ? url.trim().toLowerCase() : '';
    }

    /**
     * Logging helpers
     */
    logInfo(message, data = null) {
        if (this.config.app?.logLevel === 'info' || this.config.app?.logLevel === 'debug') {
            console.log(`[SiteSelector] ${message}`, data || '');
        }
    }

    logWarn(message, data = null) {
        if (this.config.app?.logLevel !== 'none' && this.config.app?.logLevel !== 'error') {
            console.warn(`[SiteSelector] ${message}`, data || '');
        }
    }

    logError(message, error) {
        if (this.config.app?.logLevel !== 'none') {
            console.error(`[SiteSelector] ${message}`, error);
        }
    }
}

// Helper function για debouncing
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
    module.exports = SiteSelectorComponent;
}

