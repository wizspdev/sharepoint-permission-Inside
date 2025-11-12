/**
 * Azure Table Storage Client
 * Χειρίζεται την επικοινωνία με Azure Table Storage για αποθήκευση default sites
 */

class AzureStorageClient {
    constructor(config) {
        this.config = config;
        this.accountName = config.azureStorage?.accountName || '';
        this.tableName = config.azureStorage?.tableName || 'DefaultSites';
        this.sasToken = config.azureStorage?.sasToken || '';
        this.enabled = config.azureStorage?.enabled || false;
        this.partitionKey = 'SharePointSites'; // Fixed partition key για όλα τα sites
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Παίρνει το base URL για το Table Storage
     */
    getBaseUrl() {
        return `https://${this.accountName}.table.core.windows.net/${this.tableName}`;
    }

    /**
     * Ελέγχει αν το Azure Storage είναι ενεργοποιημένο και ρυθμισμένο
     */
    isConfigured() {
        return this.enabled && this.accountName && this.sasToken && this.tableName;
    }

    /**
     * Generic GET request στο Table Storage
     */
    async get(url) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        const fullUrl = url.includes('?') ? `${url}&${this.sasToken}` : `${url}?${this.sasToken}`;

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'x-ms-version': '2019-02-02'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Azure Storage GET failed: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            this.logError('GET request failed', error);
            throw error;
        }
    }

    /**
     * Insert a new entity (POST request)
     */
    async insertEntity(entity) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        const url = `${this.getBaseUrl()}?${this.sasToken}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'Content-Type': 'application/json',
                    'x-ms-version': '2019-02-02',
                    'Prefer': 'return-no-content'
                },
                body: JSON.stringify(entity)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Azure Storage INSERT failed: ${response.status} - ${errorText}`);
            }

            // Clear cache
            this.clearCache();

            return true;
        } catch (error) {
            this.logError('INSERT request failed', error);
            throw error;
        }
    }

    /**
     * Update or Insert entity (PUT request with InsertOrReplace)
     */
    async upsertEntity(entity) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        const { PartitionKey, RowKey } = entity;
        const url = `${this.getBaseUrl()}(PartitionKey='${PartitionKey}',RowKey='${RowKey}')?${this.sasToken}`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'Content-Type': 'application/json',
                    'x-ms-version': '2019-02-02'
                },
                body: JSON.stringify(entity)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Azure Storage UPSERT failed: ${response.status} - ${errorText}`);
            }

            // Clear cache
            this.clearCache();

            return true;
        } catch (error) {
            this.logError('UPSERT request failed', error);
            throw error;
        }
    }

    /**
     * DELETE entity
     */
    async deleteEntity(rowKey) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        const url = `${this.getBaseUrl()}(PartitionKey='${this.partitionKey}',RowKey='${encodeURIComponent(rowKey)}')?${this.sasToken}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json;odata=nometadata',
                    'x-ms-version': '2019-02-02',
                    'If-Match': '*'
                }
            });

            // 404 is OK - entity doesn't exist (already deleted or never existed)
            if (response.status === 404) {
                this.logInfo(`Entity ${rowKey} not found (404) - treating as success`);
                return true;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Azure Storage DELETE failed: ${response.status} - ${errorText}`);
            }

            // Clear cache
            this.clearCache();

            return true;
        } catch (error) {
            // If it's a 404 in the catch, also treat as success
            if (error.message && error.message.includes('404')) {
                this.logInfo('Entity not found (404) - treating as success');
                return true;
            }
            
            this.logError('DELETE request failed', error);
            throw error;
        }
    }

    /**
     * Παίρνει όλα τα default sites από το Azure Storage
     */
    async getDefaultSites() {
        if (!this.isConfigured()) {
            this.logWarn('Azure Storage not configured, returning empty array');
            return [];
        }

        // Check cache
        if (this.cache && this.cacheTimestamp && (Date.now() - this.cacheTimestamp < this.cacheTimeout)) {
            this.logInfo('Returning cached default sites');
            return this.cache;
        }

        try {
            const url = `${this.getBaseUrl()}()?$filter=PartitionKey eq '${this.partitionKey}'`;
            const response = await this.get(url);
            
            const sites = (response.value || []).map(entity => ({
                url: entity.SiteUrl,
                name: entity.SiteName || this.extractSiteName(entity.SiteUrl),
                addedDate: entity.AddedDate || new Date().toISOString(),
                rowKey: entity.RowKey
            }));

            // Update cache
            this.cache = sites;
            this.cacheTimestamp = Date.now();

            this.logInfo(`Loaded ${sites.length} default sites from Azure Storage`);
            return sites;
        } catch (error) {
            this.logError('Failed to get default sites', error);
            // Return empty array instead of throwing, so app can continue
            return [];
        }
    }

    /**
     * Αποθηκεύει όλα τα default sites (batch operation)
     */
    async saveDefaultSites(sites) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        try {
            // Clear cache πρώτα για fresh data
            this.clearCache();
            
            // Διαγράφουμε όλα τα υπάρχοντα
            const existingSites = await this.getDefaultSites();
            this.logInfo(`Found ${existingSites.length} existing sites to delete`);
            
            for (const site of existingSites) {
                try {
                    await this.deleteEntity(site.rowKey);
                    this.logInfo(`Deleted: ${site.name}`);
                } catch (delError) {
                    // Ignore 404 errors - entity δεν υπάρχει, οπότε είναι OK
                    if (!delError.message.includes('404')) {
                        this.logWarn(`Failed to delete ${site.name}:`, delError);
                    }
                }
            }

            // Προσθέτουμε τα νέα
            let successCount = 0;
            for (const site of sites) {
                try {
                    // If site is just a URL string, convert to object
                    const siteUrl = typeof site === 'string' ? site : (site.url || site.SiteUrl);
                    if (siteUrl) {
                        await this.addDefaultSite(siteUrl);
                        successCount++;
                    }
                } catch (addError) {
                    this.logWarn(`Failed to add site:`, addError);
                    // Continue με τα υπόλοιπα
                }
            }

            this.logInfo(`Saved ${successCount}/${sites.length} default sites to Azure Storage`);
            return true;
        } catch (error) {
            this.logError('Failed to save default sites', error);
            throw error;
        }
    }

    /**
     * Προσθέτει ένα site στα default sites
     */
    async addDefaultSite(siteUrl) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        try {
            const rowKey = this.generateRowKey(siteUrl);
            const siteName = this.extractSiteName(siteUrl);

            const entity = {
                PartitionKey: this.partitionKey,
                RowKey: rowKey,
                SiteUrl: siteUrl,
                SiteName: siteName,
                AddedDate: new Date().toISOString()
            };

            // Try to insert first, if entity exists it will fail
            try {
                await this.insertEntity(entity);
            } catch (insertError) {
                // If insert fails (entity already exists), try upsert
                if (insertError.message.includes('409') || insertError.message.includes('EntityAlreadyExists')) {
                    await this.upsertEntity(entity);
                } else {
                    throw insertError;
                }
            }
            
            this.logInfo(`Added site to defaults: ${siteName}`);
            
            return true;
        } catch (error) {
            this.logError('Failed to add default site', error);
            throw error;
        }
    }

    /**
     * Αφαιρεί ένα site από τα default sites
     */
    async removeDefaultSite(siteUrl) {
        if (!this.isConfigured()) {
            throw new Error('Azure Storage is not configured');
        }

        try {
            const rowKey = this.generateRowKey(siteUrl);
            const result = await this.deleteEntity(rowKey);
            
            if (result) {
                this.logInfo(`Removed site from defaults: ${siteUrl}`);
            }
            
            return true;
        } catch (error) {
            // If it's a 404, treat as success (already deleted)
            if (error.message && error.message.includes('404')) {
                this.logInfo(`Site already removed: ${siteUrl}`);
                return true;
            }
            
            this.logError('Failed to remove default site', error);
            throw error;
        }
    }

    /**
     * Ελέγχει αν ένα site είναι στα defaults
     */
    async isDefaultSite(siteUrl) {
        const defaults = await this.getDefaultSites();
        return defaults.some(site => site.url === siteUrl);
    }

    /**
     * Helper: Δημιουργεί ένα μοναδικό RowKey από το site URL
     */
    generateRowKey(siteUrl) {
        // Χρησιμοποιούμε base64 encoding για να κάνουμε το URL valid RowKey
        const encoded = btoa(siteUrl).replace(/[/+=]/g, '_');
        return encoded;
    }

    /**
     * Helper: Εξάγει το site name από το URL
     */
    extractSiteName(siteUrl) {
        try {
            const url = new URL(siteUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            // Παίρνουμε το τελευταίο μέρος του path (συνήθως το site name)
            return pathParts[pathParts.length - 1] || url.hostname;
        } catch (error) {
            return siteUrl;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.logInfo('Cleared Azure Storage cache');
    }

    /**
     * Test σύνδεσης με Azure Storage
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Azure Storage is not configured'
            };
        }

        try {
            // Προσπαθούμε να κάνουμε query το table
            await this.getDefaultSites();
            
            return {
                success: true,
                message: 'Successfully connected to Azure Storage'
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    /**
     * Logging helpers
     */
    logInfo(message, data = null) {
        if (this.config.app?.logLevel === 'info' || this.config.app?.logLevel === 'debug') {
            console.log(`[AzureStorage] ${message}`, data || '');
        }
    }

    logWarn(message, data = null) {
        if (this.config.app?.logLevel !== 'none' && this.config.app?.logLevel !== 'error') {
            console.warn(`[AzureStorage] ${message}`, data || '');
        }
    }

    logError(message, error) {
        if (this.config.app?.logLevel !== 'none') {
            console.error(`[AzureStorage] ${message}`, error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AzureStorageClient;
}

