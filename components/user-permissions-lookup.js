/**
 * User Permissions Lookup Component
 * Αναζήτηση χρήστη και εμφάνιση όλων των sites/folders όπου έχει πρόσβαση
 * Αυτό είναι το "reverse lookup" feature
 */

class UserPermissionsLookupComponent {
    constructor(container, spAPI, graphAPI, permissionAggregator, config, azureStorage) {
        this.container = container;
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.permissionAggregator = permissionAggregator;
        this.config = config;
        this.azureStorage = azureStorage;
        this.siteSelector = null;
        this.selectedSites = [];
        this.currentUser = null;
        this.userPermissions = null;
    }

    /**
     * Render το component
     */
    async render() {
        this.container.innerHTML = `
            <div class="user-lookup-container">
                <!-- Header -->
                <div class="row mb-3">
                    <div class="col-md-12">
                        <h4><i class="bi ${ICONS.user}"></i> Αναζήτηση Δικαιωμάτων Χρήστη</h4>
                        <p class="text-muted">Αναζητήστε έναν χρήστη για να δείτε σε ποια sites και φακέλους έχει πρόσβαση</p>
                    </div>
                </div>

                <!-- Site Filter -->
                <div class="card mb-3">
                    <div class="card-body">
                        <label class="form-label">Φιλτράρισμα Sites (προαιρετικό)</label>
                        <div id="userLookupSiteSelector"></div>
                        <small class="text-muted">Αφήστε κενό για αναζήτηση σε όλα τα configured sites</small>
                    </div>
                </div>

                <!-- Search Box -->
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-10">
                                <label for="userSearchInput" class="form-label">Email Χρήστη</label>
                                <input type="email" class="form-control" id="userSearchInput" 
                                       placeholder="Εισάγετε email χρήστη (π.χ. user@domain.com)">
                                <div id="userSearchSuggestions" class="list-group mt-2" style="display: none;"></div>
                            </div>
                            <div class="col-md-2 d-flex align-items-end">
                                <button class="btn btn-primary w-100" id="searchUserBtn">
                                    <i class="bi ${ICONS.search}"></i> Αναζήτηση
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- User Info -->
                <div id="userInfoContainer" style="display: none;">
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <h5 id="userName"></h5>
                                    <p class="text-muted mb-0" id="userEmail"></p>
                                </div>
                                <div class="col-md-4 text-end">
                                    <button class="btn btn-success btn-sm" id="exportUserPermsBtn">
                                        <i class="bi ${ICONS.export}"></i> Εξαγωγή
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="row mb-3" id="summaryCards"></div>

                    <!-- Tabs for Sites and Folders -->
                    <div class="card">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" id="sites-tab" data-bs-toggle="tab" href="#sites-content" role="tab">
                                        <i class="bi ${ICONS.site}"></i> Sites (<span id="sitesCount">0</span>)
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" id="folders-tab" data-bs-toggle="tab" href="#folders-content" role="tab">
                                        <i class="bi ${ICONS.folder}"></i> Φάκελοι (<span id="foldersCount">0</span>)
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" id="groups-tab" data-bs-toggle="tab" href="#groups-content" role="tab">
                                        <i class="bi ${ICONS.group}"></i> Ομάδες (<span id="groupsCount">0</span>)
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="sites-content" role="tabpanel"></div>
                                <div class="tab-pane fade" id="folders-content" role="tabpanel"></div>
                                <div class="tab-pane fade" id="groups-content" role="tabpanel"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Initial Message -->
                <div id="initialMessage">
                    <div class="card">
                        <div class="card-body text-center text-muted py-5">
                            <i class="bi ${ICONS.search} fs-1"></i>
                            <p class="mt-2">Εισάγετε email χρήστη για να ξεκινήσετε την αναζήτηση</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Site Selector Component για filtering
        this.siteSelector = new SiteSelectorComponent(this.graphAPI, this.azureStorage, this.config);
        await this.siteSelector.render('userLookupSiteSelector', {
            mode: 'multi',
            showDefaultOption: true,
            onSelectionChange: async (sites, isDefault) => {
                console.log('🔵 [UserLookup] onSelectionChange called with:', { sites, isDefault });
                this.selectedSites = sites;
                console.log('🔵 [UserLookup] this.selectedSites updated to:', this.selectedSites);
                
                // Αν έχει ήδη γίνει αναζήτηση χρήστη, ξανακάνε την αναζήτηση με το νέο φίλτρο
                if (this.currentUser) {
                    console.log('🔵 [UserLookup] Re-running search for:', this.currentUser);
                    await this.loadUserPermissions(this.currentUser);
                } else {
                    console.log('🔵 [UserLookup] No current user, waiting for search');
                }
            }
        });
        
        console.log('🔵 [UserLookup] Site selector rendered, initial selectedSites:', this.selectedSites);

        this._attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        // Search input with autocomplete
        const searchInput = document.getElementById('userSearchInput');
        searchInput?.addEventListener('input', debounce(async (e) => {
            await this._searchUsers(e.target.value);
        }, 300));

        // Search button
        document.getElementById('searchUserBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('userSearchInput').value.trim();
            if (email) {
                await this.loadUserPermissions(email);
            } else {
                showNotification('Παρακαλώ εισάγετε email χρήστη', 'warning');
            }
        });

        // Enter key on search input
        searchInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const email = e.target.value.trim();
                if (email) {
                    await this.loadUserPermissions(email);
                }
            }
        });

        // Export button
        document.getElementById('exportUserPermsBtn')?.addEventListener('click', () => {
            this._exportUserPermissions();
        });
    }

    /**
     * Search users (autocomplete)
     */
    async _searchUsers(query) {
        if (!query || query.length < 3) {
            document.getElementById('userSearchSuggestions').style.display = 'none';
            return;
        }

        try {
            const result = await this.graphAPI.searchUsers(query, 5);
            const users = result.value || [];

            const suggestionsContainer = document.getElementById('userSearchSuggestions');
            
            if (users.length === 0) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            let html = '';
            for (const user of users) {
                html += `
                    <button type="button" class="list-group-item list-group-item-action user-suggestion"
                            data-email="${escapeHtml(user.mail || user.userPrincipalName)}">
                        <i class="bi ${ICONS.user} me-2"></i>
                        <strong>${escapeHtml(user.displayName)}</strong>
                        <br>
                        <small class="text-muted">${escapeHtml(user.mail || user.userPrincipalName)}</small>
                    </button>
                `;
            }

            suggestionsContainer.innerHTML = html;
            suggestionsContainer.style.display = 'block';

            // Attach click handlers
            document.querySelectorAll('.user-suggestion').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const email = btn.dataset.email;
                    document.getElementById('userSearchInput').value = email;
                    suggestionsContainer.style.display = 'none';
                    await this.loadUserPermissions(email);
                });
            });
        } catch (error) {
            console.error('Failed to search users', error);
        }
    }

    /**
     * Load user permissions
     */
    async loadUserPermissions(email) {
        this.currentUser = email;
        
        showLoading('Αναζήτηση δικαιωμάτων χρήστη...');
        
        // Timeout protection
        const timeoutId = setTimeout(() => {
            console.error('User lookup timeout');
            hideLoading();
            showNotification('Η αναζήτηση πήρε πολύ ώρα', 'error');
        }, 60000);

        try {
            console.log('🔍 [UserLookup] =====================================');
            console.log('🔍 [UserLookup] Loading permissions for user:', email);
            console.log('🔍 [UserLookup] this.selectedSites:', this.selectedSites);
            console.log('🔍 [UserLookup] selectedSites type:', typeof this.selectedSites);
            console.log('🔍 [UserLookup] selectedSites length:', this.selectedSites?.length);
            console.log('🔍 [UserLookup] selectedSites is array?', Array.isArray(this.selectedSites));
            
            // Get user permissions using the permission aggregator
            // Pass selectedSites για filtering (αν υπάρχουν)
            const sitesToPass = this.selectedSites && this.selectedSites.length > 0 ? this.selectedSites : null;
            console.log('🔍 [UserLookup] Passing to aggregator:', sitesToPass);
            console.log('🔍 [UserLookup] =====================================');
            
            this.userPermissions = await this.permissionAggregator.getUserPermissions(
                email,
                sitesToPass
            );
            
            console.log('User permissions loaded:', this.userPermissions);
            
            // Hide initial message, show results
            document.getElementById('initialMessage').style.display = 'none';
            document.getElementById('userInfoContainer').style.display = 'block';

            // Update user info
            this._renderUserInfo();

            // Render summary cards
            this._renderSummaryCards();

            // Render tabs content
            this._renderSitesTab();
            this._renderFoldersTab();
            this._renderGroupsTab();

            clearTimeout(timeoutId);
            hideLoading();
            showNotification(`Βρέθηκαν ${this.userPermissions.sites.length} sites, ${this.userPermissions.groups.length} ομάδες`, 'success');
            
            console.log('✅ User lookup completed successfully');
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('❌ Failed to load user permissions', error);
            showNotification('Αποτυχία αναζήτησης δικαιωμάτων χρήστη', 'error');
            
            document.getElementById('initialMessage').innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="alert alert-danger">
                            <i class="bi ${ICONS.error}"></i>
                            Αποτυχία αναζήτησης: ${error.message}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Render user info
     */
    _renderUserInfo() {
        document.getElementById('userName').textContent = this.userPermissions.user.displayName;
        document.getElementById('userEmail').textContent = this.userPermissions.user.email;
    }

    /**
     * Render summary cards
     */
    _renderSummaryCards() {
        const summary = this.userPermissions.summary;
        
        const html = `
            <div class="col-md-3">
                <div class="card text-center bg-primary text-white">
                    <div class="card-body">
                        <h3 class="mb-0">${summary.totalSites}</h3>
                        <small>Sites</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center bg-success text-white">
                    <div class="card-body">
                        <h3 class="mb-0">${summary.totalFolders}</h3>
                        <small>Φάκελοι</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center bg-info text-white">
                    <div class="card-body">
                        <h3 class="mb-0">${summary.sitesWithDirectAccess}</h3>
                        <small>Άμεση Πρόσβαση (Sites)</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center bg-warning text-white">
                    <div class="card-body">
                        <h3 class="mb-0">${this.userPermissions.groups.length}</h3>
                        <small>Ομάδες</small>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('summaryCards').innerHTML = html;

        // Update counts in tabs
        document.getElementById('sitesCount').textContent = summary.totalSites;
        document.getElementById('foldersCount').textContent = summary.totalFolders;
        document.getElementById('groupsCount').textContent = this.userPermissions.groups.length;
    }

    /**
     * Render sites tab
     */
    _renderSitesTab() {
        const container = document.getElementById('sites-content');
        const sites = this.userPermissions.sites;

        if (sites.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info}"></i>
                    <p>Ο χρήστης δεν έχει πρόσβαση σε κανένα site</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Site</th>
                            <th>Δικαιώματα</th>
                            <th>Τύπος Πρόσβασης</th>
                            <th>Μέσω</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const site of sites) {
            for (const perm of site.permissions) {
                html += `
                    <tr>
                        <td>
                            <i class="bi ${ICONS.site} me-2"></i>
                            <strong>${escapeHtml(site.siteTitle)}</strong>
                            <br>
                            <small class="text-muted">${escapeHtml(site.siteUrl)}</small>
                        </td>
                        <td>
                            ${perm.roles.map(role => {
                                const permInfo = getPermissionLevelInfo(role);
                                return `<span class="badge bg-${permInfo.color} me-1">
                                            <i class="bi ${permInfo.icon}"></i> ${role}
                                        </span>`;
                            }).join('')}
                        </td>
                        <td>
                            ${perm.isDirect ? 
                                '<span class="badge bg-success">Άμεση</span>' : 
                                '<span class="badge bg-secondary">Μέσω Ομάδας</span>'
                            }
                        </td>
                        <td>${escapeHtml(perm.matchedThrough)}</td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Render folders tab
     */
    _renderFoldersTab() {
        const container = document.getElementById('folders-content');
        const folders = this.userPermissions.folders;

        if (folders.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info}"></i>
                    <p>Ο χρήστης δεν έχει μοναδικά δικαιώματα σε φακέλους</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Φάκελος</th>
                            <th>Βιβλιοθήκη</th>
                            <th>Δικαιώματα</th>
                            <th>Τύπος Πρόσβασης</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const folder of folders) {
            for (const perm of folder.permissions) {
                html += `
                    <tr>
                        <td>
                            <i class="bi ${ICONS.folder} me-2"></i>
                            <strong>${escapeHtml(folder.folderName)}</strong>
                            <br>
                            <small class="text-muted">${escapeHtml(folder.folderPath)}</small>
                        </td>
                        <td>${escapeHtml(folder.library)}</td>
                        <td>
                            ${perm.roles.map(role => {
                                const permInfo = getPermissionLevelInfo(role);
                                return `<span class="badge bg-${permInfo.color} me-1">
                                            <i class="bi ${permInfo.icon}"></i> ${role}
                                        </span>`;
                            }).join('')}
                        </td>
                        <td>
                            ${perm.isDirect ? 
                                '<span class="badge bg-success">Άμεση</span>' : 
                                '<span class="badge bg-secondary">Μέσω Ομάδας</span>'
                            }
                        </td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Render groups tab
     */
    _renderGroupsTab() {
        const container = document.getElementById('groups-content');
        const groups = this.userPermissions.groups;

        console.log('Rendering groups tab:', groups);

        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info} fs-1"></i>
                    <p class="mt-2">Ο χρήστης δεν ανήκει σε καμία SharePoint ομάδα με δικαιώματα</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Ομάδα</th>
                            <th>Site</th>
                            <th>Δικαιώματα</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const group of groups) {
            const groupName = group.groupName || group.displayName || 'Unknown';
            const siteName = group.siteName || this._extractSiteName(group.site);
            const permissions = Array.isArray(group.permissions) ? group.permissions.join(', ') : 'N/A';
            
            html += `
                <tr>
                    <td>
                        <i class="bi ${ICONS.group} me-2"></i>
                        <strong>${escapeHtml(groupName)}</strong>
                    </td>
                    <td>
                        <small class="text-muted">${escapeHtml(siteName)}</small>
                    </td>
                    <td>
                        ${this._renderPermissionBadges(group.permissions)}
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
     * Helper: Render permission badges
     */
    _renderPermissionBadges(permissions) {
        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            return '<span class="badge bg-secondary">N/A</span>';
        }
        
        return permissions.map(perm => {
            const permInfo = getPermissionLevelInfo(perm);
            return `<span class="badge bg-${permInfo.color} me-1">
                        <i class="bi ${permInfo.icon}"></i> ${perm}
                    </span>`;
        }).join('');
    }

    /**
     * Helper: Extract site name from URL
     */
    _extractSiteName(siteUrl) {
        if (!siteUrl) return 'N/A';
        try {
            const url = new URL(siteUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            return pathParts[pathParts.length - 1] || url.hostname;
        } catch {
            return siteUrl;
        }
    }

    /**
     * Export user permissions
     */
    _exportUserPermissions() {
        if (!this.userPermissions) {
            showNotification('Δεν υπάρχουν δεδομένα για εξαγωγή', 'warning');
            return;
        }

        const exportData = [];

        // Sites
        for (const site of this.userPermissions.sites) {
            for (const perm of site.permissions) {
                exportData.push({
                    'Χρήστης': this.userPermissions.user.displayName,
                    'Email': this.userPermissions.user.email,
                    'Τύπος': 'Site',
                    'Τοποθεσία': site.siteTitle,
                    'URL': site.siteUrl,
                    'Δικαιώματα': perm.roles.join(', '),
                    'Τύπος Πρόσβασης': perm.isDirect ? 'Άμεση' : 'Μέσω Ομάδας',
                    'Μέσω': perm.matchedThrough
                });
            }
        }

        // Folders
        for (const folder of this.userPermissions.folders) {
            for (const perm of folder.permissions) {
                exportData.push({
                    'Χρήστης': this.userPermissions.user.displayName,
                    'Email': this.userPermissions.user.email,
                    'Τύπος': 'Φάκελος',
                    'Τοποθεσία': folder.folderName,
                    'URL': folder.folderPath,
                    'Δικαιώματα': perm.roles.join(', '),
                    'Τύπος Πρόσβασης': perm.isDirect ? 'Άμεση' : 'Μέσω Ομάδας',
                    'Μέσω': perm.matchedThrough || 'N/A'
                });
            }
        }

        const filename = `user-permissions-${this.currentUser.split('@')[0]}-${formatDate(new Date(), 'YYYYMMDD')}.csv`;
        exportToCSV(exportData, filename);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserPermissionsLookupComponent;
}

