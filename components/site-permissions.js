/**
 * Site Permissions Component
 * Εμφανίζει και επεξεργάζεται permissions σε site level
 */

class SitePermissionsComponent {
    constructor(container, spAPI, graphAPI, config, azureStorage) {
        this.container = container;
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
        this.azureStorage = azureStorage;
        this.siteSelector = null;
        this.currentSite = null;
        this.currentSites = []; // Για multi-site support
        this.isMultiSite = false;
        this.permissions = [];
        this.filteredPermissions = [];
        this.currentPage = 1;
        this.pageSize = config.app.pageSize;
        this.sortColumn = 'principalName';
        this.sortAscending = true;
    }

    /**
     * Render το component
     */
    async render() {
        this.container.innerHTML = `
            <div class="site-permissions-container">
                <!-- Header -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h4><i class="bi ${ICONS.site}"></i> Δικαιώματα Sites</h4>
                    </div>
                    <div class="col-md-6 text-end">
                        <button class="btn btn-primary btn-sm" id="refreshSitePermsBtn">
                            <i class="bi ${ICONS.refresh}"></i> Ανανέωση
                        </button>
                        <button class="btn btn-success btn-sm" id="exportSitePermsBtn">
                            <i class="bi ${ICONS.export}"></i> Εξαγωγή
                        </button>
                    </div>
                </div>

                <!-- Site Selector -->
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <label class="form-label">Επιλέξτε Site</label>
                                <div id="sitePermsSiteSelector"></div>
                            </div>
                            <div class="col-md-4">
                                <label for="searchSitePerms" class="form-label">Αναζήτηση</label>
                                <input type="text" class="form-control" id="searchSitePerms" 
                                       placeholder="Αναζήτηση χρήστη/group...">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Permissions Table -->
                <div class="card">
                    <div class="card-body">
                        <div id="sitePermissionsTable">
                            <div class="text-center text-muted py-5">
                                <i class="bi ${ICONS.info} fs-1"></i>
                                <p class="mt-2">Επιλέξτε ένα site για να δείτε τα δικαιώματα</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="sitePermsPagination" class="mt-3"></div>
            </div>
        `;

        // Initialize Site Selector Component
        this.siteSelector = new SiteSelectorComponent(this.graphAPI, this.azureStorage, this.config);
        await this.siteSelector.render('sitePermsSiteSelector', {
            mode: 'single',
            showDefaultOption: true,
            placeholder: 'Επιλέξτε Site',
            onSelectionChange: async (sites, isDefault) => {
                await this._handleSiteSelection(sites, isDefault);
            }
        });

        this._attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        // Search
        const searchInput = document.getElementById('searchSitePerms');
        searchInput?.addEventListener('input', debounce((e) => {
            this._filterPermissions(e.target.value);
        }, 300));

        // Refresh button
        document.getElementById('refreshSitePermsBtn')?.addEventListener('click', () => {
            if (this.currentSite || this.currentSites.length > 0) {
                if (this.isMultiSite) {
                    this.currentSites.forEach(site => this.spAPI.clearCacheForSite(site));
                    this._handleSiteSelection(this.currentSites, true);
                } else {
                    this.spAPI.clearCacheForSite(this.currentSite);
                    this.loadSitePermissions(this.currentSite);
                }
            } else {
                showNotification('Επιλέξτε πρώτα ένα site', 'warning');
            }
        });

        // Export button
        document.getElementById('exportSitePermsBtn')?.addEventListener('click', () => {
            this._exportPermissions();
        });
    }

    /**
     * Handle site selection από το SiteSelectorComponent
     */
    async _handleSiteSelection(sites, isDefault) {
        if (!sites || sites.length === 0) {
            this.currentSite = null;
            this.currentSites = [];
            this.isMultiSite = false;
            this.permissions = [];
            this.filteredPermissions = [];
            this._renderTable();
            return;
        }

        if (isDefault && sites.length > 1) {
            // Multi-site mode (προεπιλεγμένα)
            this.isMultiSite = true;
            this.currentSites = sites;
            this.currentSite = null;
            await this._loadMultiSitePermissions(sites);
        } else {
            // Single site mode
            this.isMultiSite = false;
            this.currentSite = sites[0];
            this.currentSites = [];
            await this.loadSitePermissions(sites[0]);
        }
    }

    /**
     * Load permissions από πολλά sites (aggregated view)
     */
    async _loadMultiSitePermissions(siteUrls) {
        showLoading('Φόρτωση δικαιωμάτων από πολλά sites...');
        
        // Timeout protection
        const timeoutId = setTimeout(() => {
            console.error('Multi-site loading timeout');
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα', 'error');
        }, 60000); // 60 seconds για πολλά sites

        try {
            const allPermissions = [];
            let successCount = 0;

            for (const siteUrl of siteUrls) {
                try {
                    console.log(`Loading permissions for: ${this._getSiteName(siteUrl)}`);
                    const roleAssignments = await this.spAPI.getSitePermissions(siteUrl);
                    const processed = await this._processPermissions(roleAssignments, siteUrl);
                    
                    // Προσθήκη site info σε κάθε permission
                    processed.forEach(p => {
                        p.siteUrl = siteUrl;
                        p.siteName = this._getSiteName(siteUrl);
                    });

                    allPermissions.push(...processed);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to load permissions for ${siteUrl}`, error);
                    // Συνεχίζουμε με τα υπόλοιπα sites
                }
            }

            this.permissions = allPermissions;
            this.filteredPermissions = [...this.permissions];
            
            this._sortPermissions();
            this._renderTable();
            
            clearTimeout(timeoutId);
            hideLoading();
            showNotification(`Φορτώθηκαν ${this.permissions.length} εγγραφές από ${successCount}/${siteUrls.length} sites`, 'success');
            
            console.log(`✅ Multi-site loading complete: ${successCount}/${siteUrls.length} sites`);
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            
            console.error('❌ Failed to load multi-site permissions', error);
            showNotification('Αποτυχία φόρτωσης δικαιωμάτων', 'error');
            
            document.getElementById('sitePermissionsTable').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Αποτυχία φόρτωσης δικαιωμάτων: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Load site permissions
     */
    async loadSitePermissions(siteUrl) {
        if (!siteUrl) {
            console.warn('No site URL provided');
            return;
        }

        this.currentSite = siteUrl;
        
        // Show loading with timeout protection
        showLoading('Φόρτωση δικαιωμάτων...');
        
        // Timeout protection - force hide loading after 30 seconds
        const timeoutId = setTimeout(() => {
            console.error('Loading timeout - forcing hideLoading()');
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα. Δοκιμάστε ξανά.', 'error');
        }, 30000);

        try {
            console.log(`Loading permissions for: ${siteUrl}`);
            
            // Get site info
            console.log('Getting site info...');
            const siteInfo = await this.spAPI.getSiteInfo(siteUrl);
            console.log('Site info loaded:', siteInfo.d?.Title);
            
            // Get permissions
            console.log('Getting site permissions...');
            const roleAssignments = await this.spAPI.getSitePermissions(siteUrl);
            console.log(`Loaded ${roleAssignments.length} role assignments`);
            
            // Process permissions
            console.log('Processing permissions...');
            this.permissions = await this._processPermissions(roleAssignments, siteUrl);
            this.filteredPermissions = [...this.permissions];
            
            // Sort and render
            this._sortPermissions();
            this._renderTable();
            
            // Clear timeout and hide loading
            clearTimeout(timeoutId);
            hideLoading();
            showNotification(`Φορτώθηκαν ${this.permissions.length} εγγραφές`, 'success');
            
            console.log('✅ Permissions loaded successfully');
        } catch (error) {
            // Clear timeout and hide loading
            clearTimeout(timeoutId);
            hideLoading();
            
            console.error('❌ Failed to load site permissions', error);
            showNotification('Αποτυχία φόρτωσης δικαιωμάτων: ' + error.message, 'error');
            
            document.getElementById('sitePermissionsTable').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    <strong>Αποτυχία φόρτωσης δικαιωμάτων</strong><br>
                    <small>${error.message}</small>
                    <hr>
                    <small class="text-muted">
                        Πιθανές αιτίες:<br>
                        • Δεν έχετε δικαιώματα στο site<br>
                        • Το site URL είναι λάθος<br>
                        • Το SharePoint API έχει πρόβλημα<br>
                        <br>
                        Ελέγξτε το Console (F12) για περισσότερες λεπτομέρειες.
                    </small>
                </div>
            `;
        }
    }

    /**
     * Process permissions data
     */
    async _processPermissions(roleAssignments, siteUrl) {
        const processed = [];

        for (const assignment of roleAssignments) {
            const member = assignment.Member;
            const roles = assignment.RoleDefinitionBindings.results;

            processed.push({
                principalId: member.Id,
                principalName: member.Title,
                principalType: getPrincipalTypeName(member.PrincipalType),
                principalTypeValue: member.PrincipalType,
                loginName: member.LoginName || '-',
                email: this._extractEmail(member.LoginName),
                roles: roles.map(r => r.Name),
                roleIds: roles.map(r => r.Id),
                icon: getPrincipalIcon(member.PrincipalType)
            });
        }

        return processed;
    }

    /**
     * Render permissions table
     */
    _renderTable() {
        const tableContainer = document.getElementById('sitePermissionsTable');
        
        if (this.filteredPermissions.length === 0) {
            tableContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info} fs-1"></i>
                    <p class="mt-2">Δεν βρέθηκαν δικαιώματα</p>
                </div>
            `;
            return;
        }

        // Paginate
        const paginated = paginateArray(this.filteredPermissions, this.currentPage, this.pageSize);

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th class="sortable" data-column="principalName">
                                Όνομα <i class="bi ${this._getSortIcon('principalName')}"></i>
                            </th>
                            <th class="sortable" data-column="principalType">
                                Τύπος <i class="bi ${this._getSortIcon('principalType')}"></i>
                            </th>
                            <th class="sortable" data-column="email">
                                Email <i class="bi ${this._getSortIcon('email')}"></i>
                            </th>
                            ${this.isMultiSite ? '<th class="sortable" data-column="siteName">Site <i class="bi ' + this._getSortIcon('siteName') + '"></i></th>' : ''}
                            <th>Δικαιώματα</th>
                            <th>Ενέργειες</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const perm of paginated.data) {
            html += `
                <tr>
                    <td>
                        <i class="bi ${perm.icon} me-2"></i>
                        ${escapeHtml(perm.principalName)}
                    </td>
                    <td>
                        <span class="badge bg-secondary">${perm.principalType}</span>
                    </td>
                    <td>${escapeHtml(perm.email)}</td>
                    ${this.isMultiSite ? `<td><small class="text-muted">${escapeHtml(perm.siteName || '')}</small></td>` : ''}
                    <td>${this._renderRoleBadges(perm.roles)}</td>
                    <td>
                        ${!this.isMultiSite ? `
                            <button class="btn btn-sm btn-outline-primary edit-perm-btn" 
                                    data-principal-id="${perm.principalId}"
                                    data-principal-name="${escapeHtml(perm.principalName)}"
                                    title="Επεξεργασία">
                                <i class="bi ${ICONS.edit}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger remove-perm-btn" 
                                    data-principal-id="${perm.principalId}"
                                    data-principal-name="${escapeHtml(perm.principalName)}"
                                    title="Αφαίρεση">
                                <i class="bi ${ICONS.delete}"></i>
                            </button>
                        ` : '<small class="text-muted">Multi-site view</small>'}
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="text-muted">
                    Εμφάνιση ${(paginated.currentPage - 1) * this.pageSize + 1} - 
                    ${Math.min(paginated.currentPage * this.pageSize, paginated.totalItems)} 
                    από ${paginated.totalItems}
                </div>
                <div>
                    <button class="btn btn-primary" id="addSitePermBtn">
                        <i class="bi ${ICONS.add}"></i> Προσθήκη Δικαιώματος
                    </button>
                </div>
            </div>
        `;

        tableContainer.innerHTML = html;

        // Attach event listeners
        this._attachTableEventListeners();

        // Render pagination
        this._renderPagination(paginated);
    }

    /**
     * Attach table event listeners
     */
    _attachTableEventListeners() {
        // Sort headers
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                if (this.sortColumn === column) {
                    this.sortAscending = !this.sortAscending;
                } else {
                    this.sortColumn = column;
                    this.sortAscending = true;
                }
                this._sortPermissions();
                this._renderTable();
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-perm-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const principalId = btn.dataset.principalId;
                const principalName = btn.dataset.principalName;
                this._editPermission(principalId, principalName);
            });
        });

        // Remove buttons
        document.querySelectorAll('.remove-perm-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const principalId = btn.dataset.principalId;
                const principalName = btn.dataset.principalName;
                await this._removePermission(principalId, principalName);
            });
        });

        // Add button
        document.getElementById('addSitePermBtn')?.addEventListener('click', () => {
            this._addPermission();
        });
    }

    /**
     * Add permission
     */
    async _addPermission() {
        // This will open the permission modal component
        window.app.showPermissionModal({
            mode: 'add',
            targetType: 'site',
            targetUrl: this.currentSite,
            onSave: async (principalId, roleDefId) => {
                try {
                    showLoading('Προσθήκη δικαιώματος...');
                    await this.spAPI.addSitePermission(this.currentSite, principalId, roleDefId);
                    hideLoading();
                    showNotification('Το δικαίωμα προστέθηκε', 'success');
                    this.loadSitePermissions(this.currentSite);
                } catch (error) {
                    hideLoading();
                    showNotification('Αποτυχία προσθήκης δικαιώματος', 'error');
                }
            }
        });
    }

    /**
     * Edit permission
     */
    _editPermission(principalId, principalName) {
        const perm = this.permissions.find(p => p.principalId === parseInt(principalId));
        
        window.app.showPermissionModal({
            mode: 'edit',
            targetType: 'site',
            targetUrl: this.currentSite,
            principalId: principalId,
            principalName: principalName,
            currentRoles: perm.roles,
            onSave: async (principalId, roleDefId) => {
                try {
                    showLoading('Ενημέρωση δικαιώματος...');
                    // Remove old and add new
                    await this.spAPI.removeSitePermission(this.currentSite, principalId);
                    await this.spAPI.addSitePermission(this.currentSite, principalId, roleDefId);
                    hideLoading();
                    showNotification('Το δικαίωμα ενημερώθηκε', 'success');
                    this.loadSitePermissions(this.currentSite);
                } catch (error) {
                    hideLoading();
                    showNotification('Αποτυχία ενημέρωσης δικαιώματος', 'error');
                }
            }
        });
    }

    /**
     * Remove permission
     */
    async _removePermission(principalId, principalName) {
        const confirmed = await confirmDialog(
            `Είστε σίγουροι ότι θέλετε να αφαιρέσετε το δικαίωμα από "${principalName}";`,
            'Αφαίρεση Δικαιώματος'
        );

        if (!confirmed) return;

        try {
            showLoading('Αφαίρεση δικαιώματος...');
            await this.spAPI.removeSitePermission(this.currentSite, principalId);
            hideLoading();
            showNotification('Το δικαίωμα αφαιρέθηκε', 'success');
            this.loadSitePermissions(this.currentSite);
        } catch (error) {
            hideLoading();
            showNotification('Αποτυχία αφαίρεσης δικαιώματος', 'error');
        }
    }

    /**
     * Filter permissions
     */
    _filterPermissions(searchTerm) {
        if (!searchTerm) {
            this.filteredPermissions = [...this.permissions];
        } else {
            this.filteredPermissions = filterBySearchTerm(
                this.permissions,
                searchTerm,
                ['principalName', 'email', 'principalType']
            );
        }
        
        this.currentPage = 1;
        this._renderTable();
    }

    /**
     * Sort permissions
     */
    _sortPermissions() {
        this.filteredPermissions = sortByKey(
            this.filteredPermissions,
            this.sortColumn,
            this.sortAscending
        );
    }

    /**
     * Render pagination
     */
    _renderPagination(paginated) {
        const paginationContainer = document.getElementById('sitePermsPagination');
        
        if (paginated.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        paginationContainer.innerHTML = createPaginationHtml(
            paginated.totalPages,
            paginated.currentPage,
            (page) => {
                this.currentPage = page;
                this._renderTable();
            }
        );

        // Attach pagination event listeners
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this._renderTable();
                }
            });
        });
    }

    /**
     * Export permissions
     */
    _exportPermissions() {
        if (this.permissions.length === 0) {
            showNotification('Δεν υπάρχουν δεδομένα για εξαγωγή', 'warning');
            return;
        }

        const exportData = this.permissions.map(p => ({
            'Όνομα': p.principalName,
            'Τύπος': p.principalType,
            'Email': p.email,
            'Δικαιώματα': p.roles.join(', '),
            'Site': this.currentSite
        }));

        const filename = `site-permissions-${this._getSiteName(this.currentSite)}-${formatDate(new Date(), 'YYYYMMDD')}.csv`;
        exportToCSV(exportData, filename);
    }

    /**
     * Helper: Render role badges
     */
    _renderRoleBadges(roles) {
        return roles.map(role => {
            const permInfo = getPermissionLevelInfo(role);
            return `<span class="badge bg-${permInfo.color} me-1" title="${permInfo.description}">
                        <i class="bi ${permInfo.icon}"></i> ${role}
                    </span>`;
        }).join('');
    }

    /**
     * Helper: Get sort icon
     */
    _getSortIcon(column) {
        if (this.sortColumn !== column) return 'bi-arrow-down-up';
        return this.sortAscending ? 'bi-arrow-up' : 'bi-arrow-down';
    }

    /**
     * Helper: Extract email from login name
     */
    _extractEmail(loginName) {
        if (!loginName) return '-';
        const match = loginName.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        return match ? match[1] : '-';
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
    module.exports = SitePermissionsComponent;
}

