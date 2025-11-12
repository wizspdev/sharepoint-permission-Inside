/**
 * Microsoft Graph API Client
 * Χειρίζεται όλες τις κλήσεις στο Microsoft Graph API
 */

class GraphAPI {
    constructor(authManager, config) {
        this.authManager = authManager;
        this.config = config;
        this.endpoint = config.graph.endpoint;
        this.betaEndpoint = config.graph.betaEndpoint;
        this.cache = new Map();
    }

    /**
     * Generic GET request στο Graph API
     */
    async get(url, useBeta = false, useCache = true) {
        const fullUrl = url.startsWith('http') ? url : (useBeta ? this.betaEndpoint : this.endpoint) + url;

        // Check cache
        if (useCache && this.cache.has(fullUrl)) {
            const cached = this.cache.get(fullUrl);
            if (Date.now() - cached.timestamp < this.config.app.cacheTimeout) {
                this.logInfo('Returning cached data for', fullUrl);
                return cached.data;
            }
        }

        const token = await this.authManager.getGraphToken();

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Cache the result
            if (useCache) {
                this.cache.set(fullUrl, {
                    data: data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            this.logError('GET request failed', error);
            throw error;
        }
    }

    /**
     * Generic POST request
     */
    async post(url, body, useBeta = false) {
        const fullUrl = url.startsWith('http') ? url : (useBeta ? this.betaEndpoint : this.endpoint) + url;
        const token = await this.authManager.getGraphToken();

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            this.logError('POST request failed', error);
            throw error;
        }
    }

    /**
     * Generic PATCH request
     */
    async patch(url, body, useBeta = false) {
        const fullUrl = url.startsWith('http') ? url : (useBeta ? this.betaEndpoint : this.endpoint) + url;
        const token = await this.authManager.getGraphToken();

        try {
            const response = await fetch(fullUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            this.logError('PATCH request failed', error);
            throw error;
        }
    }

    /**
     * Παίρνει πληροφορίες για τον current user
     */
    async getMe() {
        return await this.get('/me');
    }

    /**
     * Αναζητά χρήστες
     */
    async searchUsers(query, top = 10) {
        const url = `/users?$search="displayName:${query}" OR "mail:${query}" OR "userPrincipalName:${query}"&$top=${top}&$select=id,displayName,mail,userPrincipalName,jobTitle,department`;
        return await this.get(url, false, false); // No cache για search results
    }

    /**
     * Παίρνει user by ID
     */
    async getUser(userId) {
        const url = `/users/${userId}?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation`;
        return await this.get(url);
    }

    /**
     * Παίρνει user by email/UPN
     */
    async getUserByEmail(email) {
        const url = `/users/${encodeURIComponent(email)}?$select=id,displayName,mail,userPrincipalName,jobTitle,department`;
        return await this.get(url);
    }

    /**
     * Παίρνει όλους τους users (με pagination)
     */
    async getAllUsers(top = 100) {
        const url = `/users?$top=${top}&$select=id,displayName,mail,userPrincipalName,jobTitle,department&$orderby=displayName`;
        const result = await this.get(url);
        
        let users = result.value;

        // Handle pagination
        let nextLink = result['@odata.nextLink'];
        while (nextLink) {
            const nextResult = await this.get(nextLink);
            users = users.concat(nextResult.value);
            nextLink = nextResult['@odata.nextLink'];
        }

        return users;
    }

    /**
     * Παίρνει groups
     */
    async getGroups(top = 100) {
        const url = `/groups?$top=${top}&$select=id,displayName,description,mail,mailEnabled,securityEnabled&$orderby=displayName`;
        const result = await this.get(url);
        
        let groups = result.value;

        // Handle pagination
        let nextLink = result['@odata.nextLink'];
        while (nextLink) {
            const nextResult = await this.get(nextLink);
            groups = groups.concat(nextResult.value);
            nextLink = nextResult['@odata.nextLink'];
        }

        return groups;
    }

    /**
     * Παίρνει group by ID
     */
    async getGroup(groupId) {
        const url = `/groups/${groupId}?$select=id,displayName,description,mail,mailEnabled,securityEnabled`;
        return await this.get(url);
    }

    /**
     * Αναζητά groups
     */
    async searchGroups(query, top = 10) {
        const url = `/groups?$search="displayName:${query}" OR "mail:${query}"&$top=${top}&$select=id,displayName,description,mail`;
        return await this.get(url, false, false);
    }

    /**
     * Παίρνει members ενός group
     */
    async getGroupMembers(groupId) {
        const url = `/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName`;
        const result = await this.get(url);
        
        let members = result.value;

        // Handle pagination
        let nextLink = result['@odata.nextLink'];
        while (nextLink) {
            const nextResult = await this.get(nextLink);
            members = members.concat(nextResult.value);
            nextLink = nextResult['@odata.nextLink'];
        }

        return members;
    }

    /**
     * Παίρνει SharePoint sites
     */
    async getSites(search = null) {
        let url;
        if (search) {
            url = `/sites?search=${encodeURIComponent(search)}`;
        } else {
            url = '/sites?$select=id,name,displayName,webUrl,description,createdDateTime';
        }
        
        const result = await this.get(url);
        return result.value;
    }

    /**
     * Παίρνει όλα τα SharePoint sites με pagination
     * Αυτή η μέθοδος φέρνει όλα τα sites από το tenant
     */
    async getAllSites(options = {}) {
        const {
            top = 100,
            orderBy = 'displayName',
            filter = null,
            includePersonalSites = false
        } = options;

        try {
            let url = `/sites?$select=id,name,displayName,webUrl,description,createdDateTime,lastModifiedDateTime&$top=${top}`;
            
            if (orderBy) {
                url += `&$orderby=${orderBy}`;
            }

            if (filter) {
                url += `&$filter=${filter}`;
            }

            const result = await this.get(url, false, false); // No cache for full site list
            let allSites = result.value || [];

            // Handle pagination
            let nextLink = result['@odata.nextLink'];
            while (nextLink) {
                this.logInfo('Fetching next page of sites...');
                const nextResult = await this.get(nextLink, false, false);
                allSites = allSites.concat(nextResult.value || []);
                nextLink = nextResult['@odata.nextLink'];
            }

            // Filter out personal sites if requested
            if (!includePersonalSites) {
                allSites = allSites.filter(site => {
                    const url = site.webUrl || '';
                    // Φιλτράρουμε τα personal OneDrive sites
                    return !url.includes('-my.sharepoint.com') && !url.includes('/personal/');
                });
            }

            this.logInfo(`Loaded ${allSites.length} SharePoint sites`);
            return allSites;
        } catch (error) {
            this.logError('Failed to get all sites', error);
            throw error;
        }
    }

    /**
     * Αναζητά sites με search query
     */
    async searchSites(query, top = 20) {
        if (!query || query.trim() === '') {
            return [];
        }

        try {
            // Χρησιμοποιούμε το search API
            const url = `/sites?search=${encodeURIComponent(query)}&$top=${top}&$select=id,name,displayName,webUrl,description`;
            const result = await this.get(url, false, false);
            
            return result.value || [];
        } catch (error) {
            this.logError('Failed to search sites', error);
            return [];
        }
    }

    /**
     * Παίρνει sites με filtering options
     */
    async getFilteredSites(filterOptions = {}) {
        const {
            search = null,
            includeArchived = false,
            siteType = null, // 'team', 'communication', etc.
            maxResults = 100
        } = filterOptions;

        try {
            if (search) {
                return await this.searchSites(search, maxResults);
            }

            const allSites = await this.getAllSites({ top: maxResults });
            
            let filtered = allSites;

            // Additional filtering can be added here based on siteType, etc.
            if (siteType) {
                // Graph API doesn't directly expose site type, but we can infer from URL patterns
                filtered = filtered.filter(site => {
                    const url = site.webUrl || '';
                    if (siteType === 'team') {
                        return url.includes('/sites/');
                    }
                    return true;
                });
            }

            return filtered;
        } catch (error) {
            this.logError('Failed to get filtered sites', error);
            return [];
        }
    }

    /**
     * Παίρνει site by URL
     */
    async getSiteByUrl(siteUrl) {
        // Parse the URL to get hostname and site path
        const url = new URL(siteUrl);
        const hostname = url.hostname;
        const sitePath = url.pathname;
        
        const apiUrl = `/sites/${hostname}:${sitePath}`;
        return await this.get(apiUrl);
    }

    /**
     * Παίρνει site permissions (Graph API)
     */
    async getSitePermissions(siteId) {
        const url = `/sites/${siteId}/permissions`;
        const result = await this.get(url);
        return result.value;
    }

    /**
     * Παίρνει lists από ένα site
     */
    async getSiteLists(siteId) {
        const url = `/sites/${siteId}/lists?$select=id,name,displayName,description,createdDateTime,webUrl`;
        const result = await this.get(url);
        return result.value;
    }

    /**
     * Παίρνει drive items (files/folders)
     */
    async getDriveItems(siteId, driveId, itemId = 'root') {
        const url = `/sites/${siteId}/drives/${driveId}/items/${itemId}/children?$select=id,name,folder,file,webUrl,createdDateTime,lastModifiedDateTime,size`;
        const result = await this.get(url);
        return result.value;
    }

    /**
     * Παίρνει permissions για ένα drive item
     */
    async getDriveItemPermissions(siteId, driveId, itemId) {
        const url = `/sites/${siteId}/drives/${driveId}/items/${itemId}/permissions`;
        const result = await this.get(url);
        return result.value;
    }

    /**
     * Αναζητά όλα τα sites όπου ένας χρήστης έχει πρόσβαση
     * Αυτή είναι η "reverse lookup" λειτουργία
     */
    async getUserAccessibleSites(userEmail) {
        try {
            // Παίρνουμε τον user ID
            const user = await this.getUserByEmail(userEmail);
            
            // Παίρνουμε τα groups του χρήστη
            const userGroups = await this.getUserGroups(user.id);
            
            // Παίρνουμε όλα τα monitored sites
            const allSites = this.config.sharepoint.monitoredSites;
            
            const accessibleSites = [];

            for (const siteUrl of allSites) {
                try {
                    // Ελέγχουμε αν ο χρήστης έχει πρόσβαση
                    const hasAccess = await this.checkUserAccessToSite(siteUrl, user, userGroups);
                    
                    if (hasAccess) {
                        accessibleSites.push({
                            siteUrl: siteUrl,
                            permissions: hasAccess
                        });
                    }
                } catch (error) {
                    this.logWarn(`Failed to check access for site ${siteUrl}`, error);
                }
            }

            return accessibleSites;
        } catch (error) {
            this.logError('Failed to get user accessible sites', error);
            throw error;
        }
    }

    /**
     * Παίρνει τα groups ενός χρήστη
     */
    async getUserGroups(userId) {
        const url = `/users/${userId}/memberOf?$select=id,displayName`;
        const result = await this.get(url);
        return result.value;
    }

    /**
     * Helper function για έλεγχο πρόσβασης χρήστη σε site
     * (Αυτό θα πρέπει να χρησιμοποιήσει το SharePoint API)
     */
    async checkUserAccessToSite(siteUrl, user, userGroups) {
        // Αυτό θα υλοποιηθεί με συνδυασμό Graph + SharePoint API
        // Για τώρα επιστρέφουμε placeholder
        return null;
    }

    /**
     * Batch request - για multiple requests ταυτόχρονα
     */
    async batch(requests) {
        const token = await this.authManager.getGraphToken();
        
        const batchBody = {
            requests: requests.map((req, index) => ({
                id: `${index + 1}`,
                method: req.method || 'GET',
                url: req.url,
                headers: req.headers || {},
                body: req.body
            }))
        };

        try {
            const response = await fetch(`${this.endpoint}/$batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(batchBody)
            });

            if (!response.ok) {
                throw new Error(`Batch request failed: ${response.statusText}`);
            }

            const result = await response.json();
            return result.responses;
        } catch (error) {
            this.logError('Batch request failed', error);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.logInfo('Cleared all cache');
    }

    /**
     * Logging helpers
     */
    logInfo(message, data = null) {
        if (this.config.app.logLevel === 'info' || this.config.app.logLevel === 'debug') {
            console.log(`[GraphAPI] ${message}`, data || '');
        }
    }

    logWarn(message, data = null) {
        if (this.config.app.logLevel !== 'none' && this.config.app.logLevel !== 'error') {
            console.warn(`[GraphAPI] ${message}`, data || '');
        }
    }

    logError(message, error) {
        if (this.config.app.logLevel !== 'none') {
            console.error(`[GraphAPI] ${message}`, error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphAPI;
}

