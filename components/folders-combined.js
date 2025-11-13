/**
 * Folders Combined Component
 * Συνδυάζει Folder Permissions + Shared Folders σε ένα component με tabs
 */

class FoldersCombinedComponent {
    constructor(container, spAPI, graphAPI, config, azureStorage) {
        this.container = container;
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
        this.azureStorage = azureStorage;
        
        this.selectedSites = [];
        this.uniquePermFolders = [];
        this.sharedFolders = [];
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
                        <i class="bi ${ICONS.folder}"></i> Φάκελοι & Κοινόχρηστοι
                    </h5>
                </div>
                <div class="card-body">
                    <!-- Site Selector -->
                    <div id="foldersCombinedSiteSelector"></div>
                    
                    <!-- Tabs -->
                    <ul class="nav nav-tabs mt-3" role="tablist">
                        <li class="nav-item">
                            <button class="nav-link active" id="uniquePerms-tab" data-bs-toggle="tab" data-bs-target="#uniquePermsTab">
                                <i class="bi ${ICONS.folder}"></i> Unique Permissions (<span id="uniquePermsCount">0</span>)
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" id="sharedFolders-tab" data-bs-toggle="tab" data-bs-target="#sharedFoldersTab">
                                <i class="bi ${ICONS.share}"></i> Κοινόχρηστοι (<span id="sharedFoldersCount">0</span>)
                            </button>
                        </li>
                    </ul>
                    
                    <!-- Tab Content -->
                    <div class="tab-content mt-3">
                        <div class="tab-pane fade show active" id="uniquePermsTab">
                            <div id="uniquePermsContent">
                                <div class="text-center text-muted py-5">
                                    <i class="bi ${ICONS.info} fs-1"></i>
                                    <p class="mt-2">Επιλέξτε site για να δείτε φακέλους με unique permissions</p>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="sharedFoldersTab">
                            <div id="sharedFoldersContent">
                                <div class="text-center text-muted py-5">
                                    <i class="bi ${ICONS.info} fs-1"></i>
                                    <p class="mt-2">Επιλέξτε site για να δείτε κοινόχρηστους φακέλους</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Site Selector με Προεπιλεγμένα option
        this.siteSelector = new SiteSelectorComponent(this.graphAPI, this.azureStorage, this.config);
        await this.siteSelector.render('foldersCombinedSiteSelector', {
            mode: 'multi',
            showDefaultOption: true,
            onSelectionChange: async (sites, isDefault) => {
                console.log('🟢 [FoldersCombined] Site selection changed:', sites);
                if (sites && sites.length > 0) {
                    if (sites.length === 1) {
                        // Single site
                        await this.loadAllFolders(sites[0]);
                    } else {
                        // Multiple sites (Προεπιλεγμένα)
                        await this.loadAllFoldersMultiSite(sites);
                    }
                }
            }
        });
    }

    /**
     * Load folders από πολλαπλά sites (Προεπιλεγμένα)
     */
    async loadAllFoldersMultiSite(siteUrls) {
        showLoading(`Φόρτωση φακέλων από ${siteUrls.length} sites...`);
        
        // Timeout protection
        const timeoutId = setTimeout(() => {
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα', 'error');
        }, 120000); // 2 minutes for multi-site

        try {
            console.log(`Loading folders from ${siteUrls.length} sites:`, siteUrls);
            
            this.uniquePermFolders = [];
            this.sharedFolders = [];
            
            // Load από όλα τα sites
            for (const siteUrl of siteUrls) {
                try {
                    const [uniquePerms, shared] = await Promise.all([
                        this.spAPI.getAllFoldersWithUniquePermissions(siteUrl),
                        this.spAPI.getSharedFolders(siteUrl)
                    ]);
                    
                    // Filter excluded lists
                    const filteredUniquePerms = this._filterExcludedLists(uniquePerms);
                    
                    this.uniquePermFolders.push(...filteredUniquePerms);
                    this.sharedFolders.push(...shared);
                } catch (error) {
                    console.error(`Failed to load folders from ${siteUrl}:`, error);
                }
            }
            
            clearTimeout(timeoutId);
            hideLoading();
            
            // Update counts
            document.getElementById('uniquePermsCount').textContent = this.uniquePermFolders.length;
            document.getElementById('sharedFoldersCount').textContent = this.sharedFolders.length;
            
            // Render both tabs
            this._renderUniquePermFolders();
            this._renderSharedFolders();
            
            showNotification(`Φόρτωση ολοκληρώθηκε: ${this.uniquePermFolders.length} unique, ${this.sharedFolders.length} shared από ${siteUrls.length} sites`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('Failed to load folders:', error);
            showNotification('Αποτυχία φόρτωσης φακέλων', 'error');
        }
    }

    /**
     * Load both unique perm folders and shared folders
     */
    async loadAllFolders(siteUrl) {
        showLoading('Φόρτωση φακέλων...');
        
        // Timeout protection
        const timeoutId = setTimeout(() => {
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα', 'error');
        }, 60000);

        try {
            console.log(`Loading folders for: ${siteUrl}`);
            
            // Load both in parallel
            const [uniquePermFolders, sharedFolders] = await Promise.all([
                this.spAPI.getAllFoldersWithUniquePermissions(siteUrl),
                this.spAPI.getSharedFolders(siteUrl)
            ]);
            
            // Filter excluded lists
            this.uniquePermFolders = this._filterExcludedLists(uniquePermFolders);
            this.sharedFolders = sharedFolders;
            
            clearTimeout(timeoutId);
            hideLoading();
            
            // Update counts
            document.getElementById('uniquePermsCount').textContent = this.uniquePermFolders.length;
            document.getElementById('sharedFoldersCount').textContent = this.sharedFolders.length;
            
            // Render both tabs
            this._renderUniquePermFolders();
            this._renderSharedFolders();
            
            showNotification(`Φόρτωση ολοκληρώθηκε: ${this.uniquePermFolders.length} unique, ${this.sharedFolders.length} shared`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('Failed to load folders:', error);
            showNotification('Αποτυχία φόρτωσης φακέλων', 'error');
        }
    }

    /**
     * Render unique permission folders tab
     */
    _renderUniquePermFolders() {
        const container = document.getElementById('uniquePermsContent');
        
        if (this.uniquePermFolders.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info}"></i>
                    <p>Δεν βρέθηκαν φάκελοι με unique permissions</p>
                </div>
            `;
            return;
        }

        console.log(`Rendering ${this.uniquePermFolders.length} folders with unique permissions`);

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" id="selectAllFolders" class="form-check-input">
                            </th>
                            <th>Φάκελος</th>
                            <th>Library</th>
                            <th>Path</th>
                            <th>Permissions</th>
                            <th>Unique Perms</th>
                            <th>Ενέργειες</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const folder of this.uniquePermFolders) {
            const permCount = folder.permissions ? folder.permissions.length : 0;
            const hasUnique = folder.hasUniquePermissions || (permCount > 0);
            const uniqueBadge = hasUnique 
                ? '<span class="badge bg-warning"><i class="bi bi-shield-lock"></i> Yes</span>'
                : '<span class="badge bg-secondary">No</span>';
            
            html += `
                <tr>
                    <td>
                        <input type="checkbox" class="form-check-input folder-checkbox" data-folder-path="${escapeHtml(folder.ServerRelativeUrl)}">
                    </td>
                    <td>
                        <i class="bi ${ICONS.folder}"></i> <strong>${escapeHtml(folder.Name)}</strong>
                    </td>
                    <td>
                        <span class="badge bg-info">${escapeHtml(folder.library || 'N/A')}</span>
                    </td>
                    <td>
                        <small class="text-muted font-monospace">${escapeHtml(folder.ServerRelativeUrl)}</small>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${permCount} assignments</span>
                    </td>
                    <td>${uniqueBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-folder-perms" data-folder-path="${escapeHtml(folder.ServerRelativeUrl)}">
                            <i class="bi ${ICONS.info}"></i> Δικαιώματα
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
        document.querySelectorAll('.view-folder-perms').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const folderPath = e.currentTarget.dataset.folderPath;
                const folder = this.uniquePermFolders.find(f => f.ServerRelativeUrl === folderPath);
                if (folder) {
                    this._showFolderPermissionsModal(folder);
                }
            });
        });
    }

    /**
     * Render shared folders tab
     */
    _renderSharedFolders() {
        const container = document.getElementById('sharedFoldersContent');
        
        if (this.sharedFolders.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info}"></i>
                    <p>Δεν βρέθηκαν κοινόχρηστοι φάκελοι</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Φάκελος/Αρχείο</th>
                            <th>Shared With</th>
                            <th>Link Type</th>
                            <th>Expires</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const item of this.sharedFolders) {
            const sharedWith = item.sharedWith || [];
            const linkType = item.linkDetails?.type || 'N/A';
            const expires = item.linkDetails?.expirationDateTime 
                ? formatDate(new Date(item.linkDetails.expirationDateTime))
                : 'Never';
            
            html += `
                <tr>
                    <td>
                        <i class="bi ${item.fileExtension ? ICONS.file : ICONS.folder}"></i> 
                        <strong>${escapeHtml(item.name)}</strong>
                    </td>
                    <td>
                        ${sharedWith.length > 0 
                            ? `<span class="badge bg-primary">${sharedWith.length} users</span>`
                            : `<span class="badge bg-secondary">Anyone with link</span>`
                        }
                    </td>
                    <td>
                        <span class="badge bg-info">${linkType}</span>
                    </td>
                    <td>
                        <small class="text-muted">${expires}</small>
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
    }

    /**
     * Show folder permissions modal
     */
    _showFolderPermissionsModal(folder) {
        const modalHtml = `
            <div class="modal fade" id="folderPermsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi ${ICONS.folder}"></i> ${escapeHtml(folder.Name)}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted mb-3">
                                <small>${escapeHtml(folder.ServerRelativeUrl)}</small>
                            </p>
                            
                            ${this._renderFolderPermissionsTable(folder.permissions)}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Κλείσιμο</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existing = document.getElementById('folderPermsModal');
        if (existing) existing.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('folderPermsModal'));
        modal.show();

        // Cleanup on hide
        document.getElementById('folderPermsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    /**
     * Render folder permissions table
     */
    _renderFolderPermissionsTable(permissions) {
        if (!permissions || permissions.length === 0) {
            return `<div class="alert alert-info">Δεν βρέθηκαν permissions</div>`;
        }

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

        for (const perm of permissions) {
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
     * Filter folders από excluded lists
     */
    _filterExcludedLists(folders) {
        const excludedLists = [
            'Form Templates', 
            'Site Assets', 
            'Style Library', 
            'Site Pages',
            'Site Collection Documents',
            'Site Collection Images',
            'Pages',
            'wizsp',
            'WIZSP'
        ];
        return folders.filter(folder => !excludedLists.includes(folder.library));
    }
}

