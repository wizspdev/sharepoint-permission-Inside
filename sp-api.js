/**
 * SharePoint REST API Client
 * Χειρίζεται όλες τις κλήσεις στο SharePoint REST API
 * 
 */

class SharePointAPI {
    constructor(authManager, config) {
        this.authManager = authManager;
        this.config = config;
        this.cache = new Map();
    }

    /**
     * Generic GET request στο SharePoint REST API
     */
    async get(url, useCache = true) {
        // Check cache
        if (useCache && this.cache.has(url)) {
            const cached = this.cache.get(url);
            if (Date.now() - cached.timestamp < this.config.app.cacheTimeout) {
                this.logInfo('Returning cached data for', url);
                return cached.data;
            }
        }

        const token = await this.authManager.getSharePointToken(url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/json;odata=verbose'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the result
            if (useCache) {
                this.cache.set(url, {
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
     * Generic POST request στο SharePoint REST API
     */
    async post(url, body, headers = {}) {
        const token = await this.authManager.getSharePointToken(url);
        const siteUrl = this.getSiteUrlFromEndpoint(url);
        const formDigest = await this.getFormDigestValue(siteUrl);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/json;odata=verbose',
                    'X-RequestDigest': formDigest,
                    ...headers
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Clear cache για αυτό το site
            this.clearCacheForSite(siteUrl);

            return await response.json();
        } catch (error) {
            this.logError('POST request failed', error);
            throw error;
        }
    }

    /**
     * Generic DELETE request
     */
    async delete(url) {
        const token = await this.authManager.getSharePointToken(url);
        const siteUrl = this.getSiteUrlFromEndpoint(url);
        const formDigest = await this.getFormDigestValue(siteUrl);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=verbose',
                    'X-RequestDigest': formDigest,
                    'X-HTTP-Method': 'DELETE',
                    'IF-MATCH': '*'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Clear cache
            this.clearCacheForSite(siteUrl);

            return true;
        } catch (error) {
            this.logError('DELETE request failed', error);
            throw error;
        }
    }

    /**
     * Παίρνει Form Digest Value για POST requests
     */
    async getFormDigestValue(siteUrl) {
        const url = `${siteUrl}/_api/contextinfo`;
        const token = await this.authManager.getSharePointToken(siteUrl);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=verbose'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get form digest');
            }

            const data = await response.json();
            return data.d.GetContextWebInformation.FormDigestValue;
        } catch (error) {
            this.logError('Failed to get form digest', error);
            throw error;
        }
    }

    /**
     * Παίρνει πληροφορίες για ένα site
     */
    async getSiteInfo(siteUrl) {
        const url = `${siteUrl}/_api/web?$select=Id,Title,Url,Description,Created,ServerRelativeUrl`;
        return await this.get(url);
    }

    /**
     * Παίρνει όλα τα role assignments για ένα site
     */
    async getSitePermissions(siteUrl) {
        const url = `${siteUrl}/_api/web/roleassignments?$expand=Member,RoleDefinitionBindings&$select=Member/Title,Member/PrincipalType,Member/Id,Member/LoginName,RoleDefinitionBindings/Name,RoleDefinitionBindings/Id`;
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει όλα τα lists/libraries από ένα site
     */
    async getSiteLists(siteUrl) {
        const url = `${siteUrl}/_api/web/lists?$filter=Hidden eq false&$select=Id,Title,ItemCount,BaseType,RootFolder/ServerRelativeUrl&$expand=RootFolder`;
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει folders από ένα library
     */
    async getFolders(siteUrl, libraryName, folderPath = '') {
        let url;
        if (folderPath) {
            url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/Folders?$select=Name,ServerRelativeUrl,ItemCount,TimeCreated,TimeLastModified`;
        } else {
            url = `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')/RootFolder/Folders?$select=Name,ServerRelativeUrl,ItemCount,TimeCreated,TimeLastModified`;
        }
        
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει permissions για ένα συγκεκριμένο folder
     */
    async getFolderPermissions(siteUrl, folderPath) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/RoleAssignments?$expand=Member,RoleDefinitionBindings&$select=Member/Title,Member/PrincipalType,Member/Id,Member/LoginName,RoleDefinitionBindings/Name,RoleDefinitionBindings/Id`;
        
        try {
            const data = await this.get(url);
            return data.d.results;
        } catch (error) {
            // Αν δεν έχει unique permissions, θα πετάξει error
            if (error.message.includes('403') || error.message.includes('404')) {
                return null; // Δεν έχει broken inheritance
            }
            throw error;
        }
    }

    /**
     * Ελέγχει αν ένας folder έχει unique permissions
     */
    async hasUniquePermissions(siteUrl, folderPath) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/HasUniqueRoleAssignments`;
        
        try {
            const data = await this.get(url);
            return data.d.HasUniqueRoleAssignments;
        } catch (error) {
            // 404 means folder doesn't exist or not accessible - return false instead of throwing
            if (error.message.includes('404') || error.message.includes('403')) {
                this.logWarn(`Folder not accessible: ${folderPath}`);
                return false;
            }
            this.logError('Failed to check unique permissions', error);
            return false;
        }
    }

    /**
     * Παίρνει folder properties
     */
    async getFolderProperties(siteUrl, folderPath) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')?$select=Name,ServerRelativeUrl,ItemCount,TimeCreated,TimeLastModified&$expand=ListItemAllFields,Properties`;
        
        try {
            const data = await this.get(url);
            return data.d;
        } catch (error) {
            this.logError('Failed to get folder properties', error);
            throw error;
        }
    }

    /**
     * Παίρνει sharing links για ένα folder
     */
    async getFolderSharingLinks(siteUrl, folderPath) {
        // Χρησιμοποιούμε το sharing API
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/GetSharingInformation?$expand=permissionsInformation,pickerSettings`;
        
        try {
            const data = await this.get(url, false); // Δεν κάνουμε cache τα sharing links
            return data.d;
        } catch (error) {
            this.logError('Failed to get sharing links', error);
            return null;
        }
    }

    /**
     * Προσθέτει χρήστη/group σε site με συγκεκριμένο role
     */
    async addSitePermission(siteUrl, principalId, roleDefId) {
        const url = `${siteUrl}/_api/web/roleassignments/addroleassignment(principalid=${principalId},roledefid=${roleDefId})`;
        return await this.post(url, {});
    }

    /**
     * Αφαιρεί χρήστη/group από site
     */
    async removeSitePermission(siteUrl, principalId) {
        const url = `${siteUrl}/_api/web/roleassignments/removeroleassignment(principalid=${principalId})`;
        return await this.delete(url);
    }

    /**
     * Προσθέτει permissions σε folder
     */
    async addFolderPermission(siteUrl, folderPath, principalId, roleDefId) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/roleassignments/addroleassignment(principalid=${principalId},roledefid=${roleDefId})`;
        return await this.post(url, {});
    }

    /**
     * Αφαιρεί permissions από folder
     */
    async removeFolderPermission(siteUrl, folderPath, principalId) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/roleassignments/removeroleassignment(principalid=${principalId})`;
        return await this.delete(url);
    }

    /**
     * Break permission inheritance για folder
     */
    async breakFolderInheritance(siteUrl, folderPath, copyRoleAssignments = true) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/breakroleinheritance(copyroleassignments=${copyRoleAssignments},clearsubscopes=true)`;
        return await this.post(url, {});
    }

    /**
     * Restore permission inheritance για folder
     */
    async restoreFolderInheritance(siteUrl, folderPath) {
        const url = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${folderPath}')/ListItemAllFields/resetroleinheritance`;
        return await this.post(url, {});
    }

    /**
     * Παίρνει όλα τα role definitions (permission levels) για το site
     */
    async getRoleDefinitions(siteUrl) {
        const url = `${siteUrl}/_api/web/roledefinitions?$select=Id,Name,Description,BasePermissions`;
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει χρήστες από το site
     */
    async getSiteUsers(siteUrl) {
        const url = `${siteUrl}/_api/web/siteusers?$select=Id,Title,LoginName,Email,IsSiteAdmin,PrincipalType`;
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει groups από το site
     */
    async getSiteGroups(siteUrl) {
        const url = `${siteUrl}/_api/web/sitegroups?$select=Id,Title,Description,OwnerTitle,LoginName`;
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει members ενός group
     */
    async getGroupMembers(siteUrl, groupId) {
        const url = `${siteUrl}/_api/web/sitegroups/getbyid(${groupId})/users?$select=Id,Title,LoginName,Email,PrincipalType`;
        const data = await this.get(url);
        return data.d.results;
    }

    /**
     * Παίρνει permissions για ένα συγκεκριμένο list
     */
    async getListPermissions(siteUrl, listId) {
        const url = `${siteUrl}/_api/web/lists(guid'${listId}')/RoleAssignments?$expand=Member,RoleDefinitionBindings`;
        try {
            const data = await this.get(url);
            return data.d.results;
        } catch (error) {
            this.logError(`Failed to get list permissions for ${listId}`, error);
            return [];
        }
    }

    /**
     * Παίρνει shared folders (κοινόχρηστοι με sharing links)
     */
    async getSharedFolders(siteUrl) {
        try {
            console.log(`Getting shared folders for: ${siteUrl}`);
            
            const lists = await this.getSiteLists(siteUrl);
            const sharedItems = [];

            // Λίστες που αγνοούμε
            const excludedLists = [
                'Form Templates', 'Site Assets', 'Style Library', 'Site Pages',
                'Site Collection Documents', 'Site Collection Images', 'Pages',
                'wizsp', 'WIZSP'
            ];

            for (const list of lists) {
                if (list.BaseType === 1 && !excludedLists.includes(list.Title)) { // Document Library
                    try {
                        // Παίρνουμε items με sharing links
                        const url = `${siteUrl}/_api/web/lists(guid'${list.Id}')/items?$select=Id,FileRef,FileLeafRef,FSObjType,FileSystemObjectType,SharingInformation&$filter=SharingInformation ne null&$top=100`;
                        
                        try {
                            const data = await this.get(url);
                            if (data.d && data.d.results) {
                                data.d.results.forEach(item => {
                                    // FSObjType: 1 = Folder, 0 = File
                                    if (item.FileSystemObjectType === 1 || item.FSObjType === 1) {
                                        sharedItems.push({
                                            name: item.FileLeafRef,
                                            path: item.FileRef,
                                            siteUrl: siteUrl,
                                            library: list.Title,
                                            isFolder: true,
                                            sharingInfo: item.SharingInformation
                                        });
                                    }
                                });
                            }
                        } catch (err) {
                            // SharingInformation field may not be available, try alternative approach
                            console.warn(`Cannot get sharing info for ${list.Title}, trying alternative method`);
                        }
                    } catch (error) {
                        this.logWarn(`Failed to get shared items from ${list.Title}`, error);
                    }
                }
            }

            this.logInfo(`Found ${sharedItems.length} shared folders`);
            return sharedItems;
            
        } catch (error) {
            this.logError('Failed to get shared folders', error);
            return [];
        }
    }

    /**
     * Αναζητά όλους τους folders με unique permissions σε ένα site
     */
    async getAllFoldersWithUniquePermissions(siteUrl) {
        try {
            const lists = await this.getSiteLists(siteUrl);
            const foldersWithUniquePerms = [];

            this.logInfo(`Checking ${lists.length} lists for unique permissions`);

            for (const list of lists) {
                if (list.BaseType === 1) { // Document Library
                    try {
                        const folders = await this.getFoldersRecursive(siteUrl, list.RootFolder.ServerRelativeUrl);
                        this.logInfo(`Found ${folders.length} folders in ${list.Title}`);
                        
                        for (const folder of folders) {
                            try {
                                const hasUnique = await this.hasUniquePermissions(siteUrl, folder.ServerRelativeUrl);
                                if (hasUnique) {
                                    try {
                                        const permissions = await this.getFolderPermissions(siteUrl, folder.ServerRelativeUrl);
                                        if (permissions) {
                                            foldersWithUniquePerms.push({
                                                ...folder,
                                                permissions: permissions,
                                                library: list.Title,
                                                hasUniquePermissions: true
                                            });
                                        }
                                    } catch (permErr) {
                                        this.logWarn(`Failed to get permissions for ${folder.Name}`, permErr);
                                    }
                                }
                            } catch (uniqueErr) {
                                // Skip folders that error on hasUniquePermissions check
                                this.logWarn(`Skipping folder ${folder.Name}`, uniqueErr.message);
                            }
                        }
                    } catch (error) {
                        this.logWarn(`Failed to process library ${list.Title}`, error);
                    }
                }
            }

            this.logInfo(`Found ${foldersWithUniquePerms.length} folders with unique permissions`);
            return foldersWithUniquePerms;
        } catch (error) {
            this.logError('Failed to get folders with unique permissions', error);
            // Return empty array instead of throwing - graceful degradation
            return [];
        }
    }

    /**
     * Recursive folder retrieval
     */
    async getFoldersRecursive(siteUrl, folderPath, allFolders = []) {
        try {
            const folders = await this.getFolders(siteUrl, null, folderPath);
            
            for (const folder of folders) {
                allFolders.push(folder);
                // Recursively get subfolders
                await this.getFoldersRecursive(siteUrl, folder.ServerRelativeUrl, allFolders);
            }
        } catch (error) {
            this.logWarn(`Failed to get folders for ${folderPath}`, error);
        }

        return allFolders;
    }

    /**
     * Helper: Παίρνει το site URL από ένα endpoint
     */
    getSiteUrlFromEndpoint(url) {
        const match = url.match(/(https?:\/\/[^\/]+\/sites\/[^\/]+)/);
        return match ? match[1] : url.split('/_api/')[0];
    }

    /**
     * Clear cache για specific site
     */
    clearCacheForSite(siteUrl) {
        const keysToDelete = [];
        for (const [key] of this.cache) {
            if (key.startsWith(siteUrl)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        this.logInfo('Cleared cache for site', siteUrl);
    }

    /**
     * Clear όλο το cache
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
            console.log(`[SharePointAPI] ${message}`, data || '');
        }
    }

    logWarn(message, data = null) {
        if (this.config.app.logLevel !== 'none' && this.config.app.logLevel !== 'error') {
            console.warn(`[SharePointAPI] ${message}`, data || '');
        }
    }

    logError(message, error) {
        if (this.config.app.logLevel !== 'none') {
            console.error(`[SharePointAPI] ${message}`, error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointAPI;
}

