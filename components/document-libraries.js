/**
 * Document Libraries Component
 * Εμφανίζει όλα τα Document Libraries με τα permissions τους
 * Κλικ σε library → modal με χρήστες & φακέλους
 */

class DocumentLibrariesComponent {
    constructor(container, spAPI, graphAPI, config, azureStorage) {
        this.container = container;
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
        this.azureStorage = azureStorage;
        
        this.selectedSites = [];
        this.libraries = [];
        this.siteSelector = null;
    }

    /**
     * Initialize and render component
     */
    async render() {
        this.container.innerHTML = `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="bi ${ICONS.folder}"></i> Document Libraries
                    </h5>
                </div>
                <div class="card-body">
                    <!-- Site Selector -->
                    <div id="docLibSiteSelector"></div>
                    
                    <!-- Results -->
                    <div id="docLibResults" class="mt-3">
                        <div class="text-center text-muted py-5">
                            <i class="bi ${ICONS.info} fs-1"></i>
                            <p class="mt-2">Επιλέξτε site για να δείτε τα Document Libraries</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Site Selector με Προεπιλεγμένα option
        this.siteSelector = new SiteSelectorComponent(this.graphAPI, this.azureStorage, this.config);
        await this.siteSelector.render('docLibSiteSelector', {
            mode: 'multi',
            showDefaultOption: true,
            onSelectionChange: async (sites, isDefault) => {
                console.log('🟢 [DocLibraries] Site selection changed:', sites);
                if (sites && sites.length > 0) {
                    if (sites.length === 1) {
                        // Single site
                        await this.loadLibraries(sites[0]);
                    } else {
                        // Multiple sites (Προεπιλεγμένα)
                        await this.loadLibrariesMultiSite(sites);
                    }
                }
            }
        });
    }

    /**
     * Load document libraries από πολλαπλά sites (Προεπιλεγμένα)
     */
    async loadLibrariesMultiSite(siteUrls) {
        showLoading(`Φόρτωση Document Libraries από ${siteUrls.length} sites...`);
        
        // Timeout protection
        const timeoutId = setTimeout(() => {
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα', 'error');
        }, 120000); // 2 minutes for multi-site

        try {
            console.log(`Loading document libraries from ${siteUrls.length} sites:`, siteUrls);
            
            this.libraries = [];
            
            // Load από όλα τα sites in parallel
            const promises = siteUrls.map(async (siteUrl) => {
                try {
                    const siteLibs = await this._loadLibrariesForSite(siteUrl);
                    return siteLibs;
                } catch (error) {
                    console.error(`Failed to load libraries from ${siteUrl}:`, error);
                    return [];
                }
            });
            
            const results = await Promise.all(promises);
            
            // Flatten results
            results.forEach(libs => {
                this.libraries.push(...libs);
            });
            
            clearTimeout(timeoutId);
            hideLoading();
            
            this._renderLibraries();
            showNotification(`Βρέθηκαν ${this.libraries.length} Document Libraries από ${siteUrls.length} sites`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('Failed to load document libraries:', error);
            showNotification('Αποτυχία φόρτωσης Document Libraries', 'error');
        }
    }

    /**
     * Load document libraries για ένα site
     */
    async loadLibraries(siteUrl) {
        showLoading('Φόρτωση Document Libraries...');
        
        // Timeout protection
        const timeoutId = setTimeout(() => {
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα', 'error');
        }, 60000);

        try {
            this.libraries = await this._loadLibrariesForSite(siteUrl);
            
            clearTimeout(timeoutId);
            hideLoading();
            
            this._renderLibraries();
            showNotification(`Βρέθηκαν ${this.libraries.length} Document Libraries`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('Failed to load document libraries:', error);
            showNotification('Αποτυχία φόρτωσης Document Libraries', 'error');
            
            document.getElementById('docLibResults').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Σφάλμα: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Helper: Load libraries για ένα site (reusable)
     */
    async _loadLibrariesForSite(siteUrl) {
        console.log(`Loading document libraries for: ${siteUrl}`);
        
        // Παίρνουμε όλα τα lists
        const allLists = await this.spAPI.getSiteLists(siteUrl);
        
        // Λίστες που θέλουμε να αγνοήσουμε
        const excludedLists = ['Form Templates', 'Site Assets', 'Style Library', 'Site Pages'];
        
        // Φιλτράρουμε μόνο Document Libraries (BaseType = 1) και όχι excluded
        const docLibs = allLists.filter(list => 
            list.BaseType === 1 && 
            !excludedLists.includes(list.Title)
        );
        
        console.log(`Found ${docLibs.length} document libraries in ${siteUrl}`);
        
        // Για κάθε library, παίρνουμε τα permissions
        const libraries = [];
        for (const lib of docLibs) {
            try {
                const permissions = await this.spAPI.getListPermissions(siteUrl, lib.Id);
                
                // Count folders
                let folderCount = 0;
                try {
                    const folders = await this.spAPI.getFoldersRecursive(siteUrl, lib.RootFolder.ServerRelativeUrl);
                    folderCount = folders.length;
                } catch (err) {
                    console.warn(`Failed to count folders for ${lib.Title}:`, err.message);
                }
                
                libraries.push({
                    siteUrl: siteUrl,
                    id: lib.Id,
                    title: lib.Title,
                    description: lib.Description,
                    itemCount: lib.ItemCount,
                    folderCount: folderCount,
                    serverRelativeUrl: lib.RootFolder.ServerRelativeUrl,
                    permissions: permissions,
                    hasUniquePermissions: lib.HasUniqueRoleAssignments
                });
            } catch (error) {
                console.warn(`Failed to get permissions for ${lib.Title}:`, error.message);
            }
        }
        
        return libraries;
    }

    /**
     * Render libraries table
     */
    _renderLibraries() {
        const container = document.getElementById('docLibResults');
        
        if (this.libraries.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info}"></i>
                    <p>Δεν βρέθηκαν Document Libraries</p>
                </div>
            `;
            return;
        }

        // Check if multi-site mode (more than 1 unique site)
        const uniqueSites = [...new Set(this.libraries.map(l => l.siteUrl))];
        const isMultiSite = uniqueSites.length > 1;

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            ${isMultiSite ? '<th>Site</th>' : ''}
                            <th>Library</th>
                            <th>Items</th>
                            <th>Φάκελοι</th>
                            <th>Permissions</th>
                            <th>Unique Perms</th>
                            <th>Ενέργειες</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const lib of this.libraries) {
            const siteName = this._extractSiteName(lib.siteUrl);
            const uniquePermsIcon = lib.hasUniquePermissions 
                ? `<span class="badge bg-warning"><i class="bi bi-shield-lock"></i> Yes</span>`
                : `<span class="badge bg-secondary">No</span>`;
            
            // Count unique permission levels
            const permLevels = new Set();
            lib.permissions.forEach(perm => {
                perm.RoleDefinitionBindings.results.forEach(role => {
                    permLevels.add(role.Name);
                });
            });
            
            html += `
                <tr>
                    ${isMultiSite ? `
                        <td>
                            <small class="text-muted">${escapeHtml(siteName)}</small>
                        </td>
                    ` : ''}
                    <td>
                        <strong><i class="bi ${ICONS.folder}"></i> ${escapeHtml(lib.title)}</strong>
                        ${lib.description ? `<br><small class="text-muted">${escapeHtml(lib.description)}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge bg-info">${lib.itemCount}</span>
                    </td>
                    <td>
                        <span class="badge bg-primary">${lib.folderCount}</span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${lib.permissions.length} assignments</span>
                        <br>
                        <small class="text-muted">${Array.from(permLevels).slice(0, 2).join(', ')}${permLevels.size > 2 ? '...' : ''}</small>
                    </td>
                    <td>${uniquePermsIcon}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-lib-details" data-lib-id="${lib.id}">
                            <i class="bi ${ICONS.info}"></i> Λεπτομέρειες
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Attach event listeners
        document.querySelectorAll('.view-lib-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const libId = e.currentTarget.dataset.libId;
                const library = this.libraries.find(l => l.id === libId);
                if (library) {
                    this._showLibraryDetailsModal(library);
                }
            });
        });
    }

    /**
     * Show library details modal (χρήστες & φάκελοι)
     */
    async _showLibraryDetailsModal(library) {
        showLoading('Φόρτωση λεπτομερειών...');

        try {
            // Get folders in this library
            let folders = [];
            try {
                folders = await this.spAPI.getFoldersRecursive(library.siteUrl, library.serverRelativeUrl);
            } catch (err) {
                console.warn('Failed to get folders:', err.message);
            }

            hideLoading();

            // Create modal HTML
            const modalHtml = `
                <div class="modal fade" id="libDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi ${ICONS.folder}"></i> ${escapeHtml(library.title)}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Tabs -->
                                <ul class="nav nav-tabs mb-3" role="tablist">
                                    <li class="nav-item">
                                        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#libPerms">
                                            <i class="bi ${ICONS.user}"></i> Χρήστες & Ομάδες (${library.permissions.length})
                                        </button>
                                    </li>
                                    <li class="nav-item">
                                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#libFolders">
                                            <i class="bi ${ICONS.folder}"></i> Φάκελοι (${folders.length})
                                        </button>
                                    </li>
                                </ul>

                                <!-- Tab Content -->
                                <div class="tab-content">
                                    <!-- Permissions Tab -->
                                    <div class="tab-pane fade show active" id="libPerms">
                                        ${this._renderPermissionsTab(library)}
                                    </div>
                                    
                                    <!-- Folders Tab -->
                                    <div class="tab-pane fade" id="libFolders">
                                        ${this._renderFoldersTab(folders)}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Κλείσιμο</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            const existing = document.getElementById('libDetailsModal');
            if (existing) existing.remove();

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('libDetailsModal'));
            modal.show();

            // Cleanup on hide
            document.getElementById('libDetailsModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });

        } catch (error) {
            hideLoading();
            console.error('Failed to show library details:', error);
            showNotification('Αποτυχία φόρτωσης λεπτομερειών', 'error');
        }
    }

    /**
     * Render permissions tab content
     */
    _renderPermissionsTab(library) {
        let html = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Χρήστης/Ομάδα</th>
                            <th>Τύπος</th>
                            <th>Δικαιώματα</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const perm of library.permissions) {
            const member = perm.Member;
            const roles = perm.RoleDefinitionBindings.results;
            const principalType = getPrincipalTypeName(member.PrincipalType);

            html += `
                <tr>
                    <td>
                        <strong>${escapeHtml(member.Title)}</strong>
                        ${member.LoginName ? `<br><small class="text-muted">${escapeHtml(member.LoginName)}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge ${principalType === 'Χρήστης' ? 'bg-primary' : 'bg-info'}">
                            <i class="bi ${principalType === 'Χρήστης' ? ICONS.user : ICONS.group}"></i>
                            ${principalType}
                        </span>
                    </td>
                    <td>
                        ${roles.map(role => {
                            const info = getPermissionLevelInfo(role.Name);
                            return `<span class="badge bg-${info.color} me-1">
                                        <i class="bi ${info.icon}"></i> ${role.Name}
                                    </span>`;
                        }).join('')}
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    /**
     * Render folders tab content
     */
    _renderFoldersTab(folders) {
        if (folders.length === 0) {
            return `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info}"></i>
                    <p>Δεν βρέθηκαν φάκελοι</p>
                </div>
            `;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>Φάκελος</th>
                            <th>Path</th>
                            <th>Items</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const folder of folders) {
            html += `
                <tr>
                    <td>
                        <i class="bi ${ICONS.folder}"></i> <strong>${escapeHtml(folder.Name)}</strong>
                    </td>
                    <td>
                        <small class="text-muted font-monospace">${escapeHtml(folder.ServerRelativeUrl)}</small>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${folder.ItemCount || 0}</span>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    /**
     * Helper: Extract site name από URL
     */
    _extractSiteName(siteUrl) {
        if (!siteUrl) return 'N/A';
        try {
            const url = new URL(siteUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            // Αν είναι root site
            if (pathParts.length === 0) {
                return url.hostname.split('.')[0];
            }
            // Αν είναι subsite
            return pathParts[pathParts.length - 1];
        } catch {
            return siteUrl;
        }
    }
}

