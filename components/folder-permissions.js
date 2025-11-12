/**
 * Folder Permissions Component
 * Εμφανίζει και επεξεργάζεται permissions σε folder level
 */

class FolderPermissionsComponent {
    constructor(container, spAPI, graphAPI, config) {
        this.container = container;
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
        this.currentSite = null;
        this.folders = [];
        this.filteredFolders = [];
        this.currentPage = 1;
        this.pageSize = config.app.pageSize;
    }

    /**
     * Render το component
     */
    async render() {
        this.container.innerHTML = `
            <div class="folder-permissions-container">
                <!-- Header -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h4><i class="bi ${ICONS.folder}"></i> Δικαιώματα Φακέλων</h4>
                    </div>
                    <div class="col-md-6 text-end">
                        <button class="btn btn-primary btn-sm" id="refreshFolderPermsBtn">
                            <i class="bi ${ICONS.refresh}"></i> Ανανέωση
                        </button>
                        <button class="btn btn-success btn-sm" id="exportFolderPermsBtn">
                            <i class="bi ${ICONS.export}"></i> Εξαγωγή
                        </button>
                    </div>
                </div>

                <!-- Site Selector -->
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <label for="folderSiteSelector" class="form-label">Επιλέξτε Site</label>
                                <select class="form-select" id="folderSiteSelector">
                                    <option value="">-- Επιλέξτε Site --</option>
                                    ${this.config.sharepoint.monitoredSites.map(site => 
                                        `<option value="${site}">${this._getSiteName(site)}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Φίλτρα</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="showOnlyUnique" checked>
                                    <label class="form-check-label" for="showOnlyUnique">
                                        Μόνο με μοναδικά δικαιώματα
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Folders List -->
                <div class="card">
                    <div class="card-body">
                        <div id="foldersListContainer">
                            <div class="text-center text-muted py-5">
                                <i class="bi ${ICONS.info} fs-1"></i>
                                <p class="mt-2">Επιλέξτε ένα site για να δείτε τους φακέλους</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="folderPermsPagination" class="mt-3"></div>
            </div>
        `;

        this._attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        // Site selector
        const siteSelector = document.getElementById('folderSiteSelector');
        siteSelector?.addEventListener('change', (e) => {
            this.loadFolderPermissions(e.target.value);
        });

        // Show only unique checkbox
        document.getElementById('showOnlyUnique')?.addEventListener('change', (e) => {
            this._filterFolders();
        });

        // Refresh button
        document.getElementById('refreshFolderPermsBtn')?.addEventListener('click', () => {
            if (this.currentSite) {
                this.spAPI.clearCacheForSite(this.currentSite);
                this.loadFolderPermissions(this.currentSite);
            } else {
                showNotification('Επιλέξτε πρώτα ένα site', 'warning');
            }
        });

        // Export button
        document.getElementById('exportFolderPermsBtn')?.addEventListener('click', () => {
            this._exportFolders();
        });
    }

    /**
     * Load folder permissions
     */
    async loadFolderPermissions(siteUrl) {
        if (!siteUrl) return;

        this.currentSite = siteUrl;
        showLoading('Φόρτωση φακέλων...');

        try {
            // Get all folders with unique permissions
            const foldersWithUniquePerms = await this.spAPI.getAllFoldersWithUniquePermissions(siteUrl);
            
            // Process folders
            this.folders = await this._processFolders(foldersWithUniquePerms, siteUrl);
            this._filterFolders();
            
            hideLoading();
            showNotification(`Βρέθηκαν ${this.folders.length} φάκελοι`, 'success');
        } catch (error) {
            hideLoading();
            console.error('Failed to load folder permissions', error);
            showNotification('Αποτυχία φόρτωσης φακέλων', 'error');
            
            document.getElementById('foldersListContainer').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Αποτυχία φόρτωσης φακέλων: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Process folders data
     */
    async _processFolders(folders, siteUrl) {
        const processed = [];

        for (const folder of folders) {
            const hasUnique = await this.spAPI.hasUniquePermissions(siteUrl, folder.ServerRelativeUrl);
            
            processed.push({
                name: folder.Name,
                path: folder.ServerRelativeUrl,
                library: folder.library,
                itemCount: folder.ItemCount || 0,
                created: folder.TimeCreated,
                modified: folder.TimeLastModified,
                hasUniquePermissions: hasUnique,
                permissionsCount: folder.permissions?.length || 0,
                permissions: folder.permissions || []
            });
        }

        return processed;
    }

    /**
     * Filter folders
     */
    _filterFolders() {
        const showOnlyUnique = document.getElementById('showOnlyUnique')?.checked;
        
        if (showOnlyUnique) {
            this.filteredFolders = this.folders.filter(f => f.hasUniquePermissions);
        } else {
            this.filteredFolders = [...this.folders];
        }
        
        this.currentPage = 1;
        this._renderFoldersList();
    }

    /**
     * Render folders list
     */
    _renderFoldersList() {
        const container = document.getElementById('foldersListContainer');
        
        if (this.filteredFolders.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info} fs-1"></i>
                    <p class="mt-2">Δεν βρέθηκαν φάκελοι</p>
                </div>
            `;
            return;
        }

        // Paginate
        const paginated = paginateArray(this.filteredFolders, this.currentPage, this.pageSize);

        let html = '<div class="accordion" id="foldersAccordion">';

        for (const [index, folder] of paginated.data.entries()) {
            const collapseId = `folder-${index}`;
            
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                            <div class="d-flex align-items-center w-100">
                                <i class="bi ${folder.hasUniquePermissions ? ICONS.folderOpen : ICONS.folder} me-2"></i>
                                <div class="flex-grow-1">
                                    <strong>${escapeHtml(folder.name)}</strong>
                                    <br>
                                    <small class="text-muted">
                                        ${escapeHtml(folder.library)} • 
                                        ${folder.itemCount} items •
                                        ${folder.hasUniquePermissions ? 
                                            `<span class="badge bg-warning text-dark">Μοναδικά Δικαιώματα</span>` : 
                                            `<span class="badge bg-secondary">Κληρονομικά</span>`
                                        }
                                    </small>
                                </div>
                            </div>
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse" 
                         data-bs-parent="#foldersAccordion">
                        <div class="accordion-body">
                            ${this._renderFolderDetails(folder)}
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        html += `
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Εμφάνιση ${(paginated.currentPage - 1) * this.pageSize + 1} - 
                    ${Math.min(paginated.currentPage * this.pageSize, paginated.totalItems)} 
                    από ${paginated.totalItems}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Render pagination
        this._renderPagination(paginated);
    }

    /**
     * Render folder details
     */
    _renderFolderDetails(folder) {
        let html = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Πληροφορίες Φακέλου</h6>
                    <ul class="list-unstyled">
                        <li><strong>Διαδρομή:</strong> ${escapeHtml(folder.path)}</li>
                        <li><strong>Βιβλιοθήκη:</strong> ${escapeHtml(folder.library)}</li>
                        <li><strong>Αριθμός Items:</strong> ${folder.itemCount}</li>
                        <li><strong>Δημιουργήθηκε:</strong> ${formatDate(folder.created)}</li>
                        <li><strong>Τροποποιήθηκε:</strong> ${formatDate(folder.modified)}</li>
                    </ul>
                </div>
                <div class="col-md-6 text-end">
                    ${folder.hasUniquePermissions ? `
                        <button class="btn btn-sm btn-warning restore-inheritance-btn mb-2"
                                data-folder-path="${escapeHtml(folder.path)}">
                            <i class="bi ${ICONS.unlock}"></i> Επαναφορά Κληρονομικότητας
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-warning break-inheritance-btn mb-2"
                                data-folder-path="${escapeHtml(folder.path)}">
                            <i class="bi ${ICONS.lock}"></i> Διακοπή Κληρονομικότητας
                        </button>
                    `}
                    <br>
                    <button class="btn btn-sm btn-primary add-folder-perm-btn"
                            data-folder-path="${escapeHtml(folder.path)}">
                        <i class="bi ${ICONS.add}"></i> Προσθήκη Δικαιώματος
                    </button>
                </div>
            </div>
        `;

        if (folder.permissions.length > 0) {
            html += `
                <h6>Δικαιώματα (${folder.permissions.length})</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Όνομα</th>
                                <th>Τύπος</th>
                                <th>Δικαιώματα</th>
                                <th>Ενέργειες</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (const perm of folder.permissions) {
                html += `
                    <tr>
                        <td>
                            <i class="bi ${getPrincipalIcon(perm.Member.PrincipalType)} me-1"></i>
                            ${escapeHtml(perm.Member.Title)}
                        </td>
                        <td>
                            <span class="badge bg-secondary">
                                ${getPrincipalTypeName(perm.Member.PrincipalType)}
                            </span>
                        </td>
                        <td>
                            ${perm.RoleDefinitionBindings.results.map(r => {
                                const permInfo = getPermissionLevelInfo(r.Name);
                                return `<span class="badge bg-${permInfo.color} me-1">
                                            <i class="bi ${permInfo.icon}"></i> ${r.Name}
                                        </span>`;
                            }).join('')}
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger remove-folder-perm-btn"
                                    data-folder-path="${escapeHtml(folder.path)}"
                                    data-principal-id="${perm.Member.Id}"
                                    data-principal-name="${escapeHtml(perm.Member.Title)}">
                                <i class="bi ${ICONS.delete}"></i>
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
        } else {
            html += `
                <div class="alert alert-info">
                    <i class="bi ${ICONS.info}"></i>
                    Ο φάκελος κληρονομεί τα δικαιώματα από το parent του.
                </div>
            `;
        }

        // Attach event listeners for buttons
        setTimeout(() => {
            this._attachFolderEventListeners();
        }, 100);

        return html;
    }

    /**
     * Attach folder-specific event listeners
     */
    _attachFolderEventListeners() {
        // Break inheritance buttons
        document.querySelectorAll('.break-inheritance-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const folderPath = btn.dataset.folderPath;
                await this._breakInheritance(folderPath);
            });
        });

        // Restore inheritance buttons
        document.querySelectorAll('.restore-inheritance-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const folderPath = btn.dataset.folderPath;
                await this._restoreInheritance(folderPath);
            });
        });

        // Add permission buttons
        document.querySelectorAll('.add-folder-perm-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const folderPath = btn.dataset.folderPath;
                this._addFolderPermission(folderPath);
            });
        });

        // Remove permission buttons
        document.querySelectorAll('.remove-folder-perm-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const folderPath = btn.dataset.folderPath;
                const principalId = btn.dataset.principalId;
                const principalName = btn.dataset.principalName;
                await this._removeFolderPermission(folderPath, principalId, principalName);
            });
        });
    }

    /**
     * Break inheritance
     */
    async _breakInheritance(folderPath) {
        const confirmed = await confirmDialog(
            'Είστε σίγουροι ότι θέλετε να διακόψετε την κληρονομικότητα; Ο φάκελος θα έχει δικά του δικαιώματα.',
            'Διακοπή Κληρονομικότητας'
        );

        if (!confirmed) return;

        try {
            showLoading('Διακοπή κληρονομικότητας...');
            await this.spAPI.breakFolderInheritance(this.currentSite, folderPath, true);
            hideLoading();
            showNotification('Η κληρονομικότητα διακόπηκε', 'success');
            this.loadFolderPermissions(this.currentSite);
        } catch (error) {
            hideLoading();
            showNotification('Αποτυχία διακοπής κληρονομικότητας', 'error');
        }
    }

    /**
     * Restore inheritance
     */
    async _restoreInheritance(folderPath) {
        const confirmed = await confirmDialog(
            'Είστε σίγουροι ότι θέλετε να επαναφέρετε την κληρονομικότητα; Όλα τα μοναδικά δικαιώματα θα χαθούν.',
            'Επαναφορά Κληρονομικότητας'
        );

        if (!confirmed) return;

        try {
            showLoading('Επαναφορά κληρονομικότητας...');
            await this.spAPI.restoreFolderInheritance(this.currentSite, folderPath);
            hideLoading();
            showNotification('Η κληρονομικότητα επαναφέρθηκε', 'success');
            this.loadFolderPermissions(this.currentSite);
        } catch (error) {
            hideLoading();
            showNotification('Αποτυχία επαναφοράς κληρονομικότητας', 'error');
        }
    }

    /**
     * Add folder permission
     */
    _addFolderPermission(folderPath) {
        window.app.showPermissionModal({
            mode: 'add',
            targetType: 'folder',
            targetUrl: this.currentSite,
            folderPath: folderPath,
            onSave: async (principalId, roleDefId) => {
                try {
                    showLoading('Προσθήκη δικαιώματος...');
                    await this.spAPI.addFolderPermission(this.currentSite, folderPath, principalId, roleDefId);
                    hideLoading();
                    showNotification('Το δικαίωμα προστέθηκε', 'success');
                    this.loadFolderPermissions(this.currentSite);
                } catch (error) {
                    hideLoading();
                    showNotification('Αποτυχία προσθήκης δικαιώματος', 'error');
                }
            }
        });
    }

    /**
     * Remove folder permission
     */
    async _removeFolderPermission(folderPath, principalId, principalName) {
        const confirmed = await confirmDialog(
            `Είστε σίγουροι ότι θέλετε να αφαιρέσετε το δικαίωμα από "${principalName}";`,
            'Αφαίρεση Δικαιώματος'
        );

        if (!confirmed) return;

        try {
            showLoading('Αφαίρεση δικαιώματος...');
            await this.spAPI.removeFolderPermission(this.currentSite, folderPath, principalId);
            hideLoading();
            showNotification('Το δικαίωμα αφαιρέθηκε', 'success');
            this.loadFolderPermissions(this.currentSite);
        } catch (error) {
            hideLoading();
            showNotification('Αποτυχία αφαίρεσης δικαιώματος', 'error');
        }
    }

    /**
     * Render pagination
     */
    _renderPagination(paginated) {
        const paginationContainer = document.getElementById('folderPermsPagination');
        
        if (paginated.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        paginationContainer.innerHTML = createPaginationHtml(
            paginated.totalPages,
            paginated.currentPage
        );

        // Attach pagination event listeners
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this._renderFoldersList();
                }
            });
        });
    }

    /**
     * Export folders
     */
    _exportFolders() {
        if (this.folders.length === 0) {
            showNotification('Δεν υπάρχουν δεδομένα για εξαγωγή', 'warning');
            return;
        }

        const exportData = this.folders.map(f => ({
            'Όνομα': f.name,
            'Διαδρομή': f.path,
            'Βιβλιοθήκη': f.library,
            'Μοναδικά Δικαιώματα': f.hasUniquePermissions ? 'Ναι' : 'Όχι',
            'Αριθμός Δικαιωμάτων': f.permissionsCount,
            'Items': f.itemCount,
            'Δημιουργήθηκε': formatDate(f.created),
            'Τροποποιήθηκε': formatDate(f.modified),
            'Site': this.currentSite
        }));

        const filename = `folder-permissions-${this._getSiteName(this.currentSite)}-${formatDate(new Date(), 'YYYYMMDD')}.csv`;
        exportToCSV(exportData, filename);
    }

    /**
     * Helper: Get site name from URL
     */
    _getSiteName(siteUrl) {
        try {
            const url = new URL(siteUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            return pathParts[pathParts.length - 1] || siteUrl;
        } catch {
            return siteUrl;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FolderPermissionsComponent;
}

