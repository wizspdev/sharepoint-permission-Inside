/**
 * Shared Folders Component
 * Εμφανίζει κοινόχρηστους φακέλους και τα sharing links τους
 */

class SharedFoldersComponent {
    constructor(container, spAPI, graphAPI, config) {
        this.container = container;
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
        this.currentSite = null;
        this.sharedFolders = [];
    }

    /**
     * Render το component
     */
    async render() {
        this.container.innerHTML = `
            <div class="shared-folders-container">
                <!-- Header -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h4><i class="bi ${ICONS.sharedFolder}"></i> Κοινόχρηστοι Φάκελοι</h4>
                    </div>
                    <div class="col-md-6 text-end">
                        <button class="btn btn-primary btn-sm" id="refreshSharedFoldersBtn">
                            <i class="bi ${ICONS.refresh}"></i> Ανανέωση
                        </button>
                    </div>
                </div>

                <!-- Site Selector -->
                <div class="card mb-3">
                    <div class="card-body">
                        <label for="sharedFolderSiteSelector" class="form-label">Επιλέξτε Site</label>
                        <select class="form-select" id="sharedFolderSiteSelector">
                            <option value="">-- Επιλέξτε Site --</option>
                            ${this.config.sharepoint.monitoredSites.map(site => 
                                `<option value="${site}">${this._getSiteName(site)}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <!-- Shared Folders List -->
                <div id="sharedFoldersListContainer">
                    <div class="text-center text-muted py-5">
                        <i class="bi ${ICONS.info} fs-1"></i>
                        <p class="mt-2">Επιλέξτε ένα site για να δείτε τους κοινόχρηστους φακέλους</p>
                    </div>
                </div>
            </div>
        `;

        this._attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        // Site selector
        const siteSelector = document.getElementById('sharedFolderSiteSelector');
        siteSelector?.addEventListener('change', (e) => {
            this.loadSharedFolders(e.target.value);
        });

        // Refresh button
        document.getElementById('refreshSharedFoldersBtn')?.addEventListener('click', () => {
            if (this.currentSite) {
                this.spAPI.clearCacheForSite(this.currentSite);
                this.loadSharedFolders(this.currentSite);
            } else {
                showNotification('Επιλέξτε πρώτα ένα site', 'warning');
            }
        });
    }

    /**
     * Load shared folders
     */
    async loadSharedFolders(siteUrl) {
        if (!siteUrl) return;

        this.currentSite = siteUrl;
        showLoading('Φόρτωση κοινόχρηστων φακέλων...');

        try {
            // Get all folders with unique permissions
            const allFolders = await this.spAPI.getAllFoldersWithUniquePermissions(siteUrl);
            
            // Filter folders that have sharing links
            this.sharedFolders = [];
            
            for (const folder of allFolders) {
                try {
                    const sharingInfo = await this.spAPI.getFolderSharingLinks(siteUrl, folder.ServerRelativeUrl);
                    
                    if (sharingInfo) {
                        this.sharedFolders.push({
                            ...folder,
                            sharingInfo: sharingInfo
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to get sharing info for ${folder.Name}`, error);
                }
            }
            
            this._renderSharedFoldersList();
            
            hideLoading();
            showNotification(`Βρέθηκαν ${this.sharedFolders.length} κοινόχρηστοι φάκελοι`, 'success');
        } catch (error) {
            hideLoading();
            console.error('Failed to load shared folders', error);
            showNotification('Αποτυχία φόρτωσης κοινόχρηστων φακέλων', 'error');
            
            document.getElementById('sharedFoldersListContainer').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Αποτυχία φόρτωσης: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Render shared folders list
     */
    _renderSharedFoldersList() {
        const container = document.getElementById('sharedFoldersListContainer');
        
        if (this.sharedFolders.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body text-center text-muted py-5">
                        <i class="bi ${ICONS.info} fs-1"></i>
                        <p class="mt-2">Δεν βρέθηκαν κοινόχρηστοι φάκελοι</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="row g-3">';

        for (const folder of this.sharedFolders) {
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">
                                <i class="bi ${ICONS.sharedFolder} text-primary"></i>
                                ${escapeHtml(folder.Name)}
                            </h5>
                            
                            <div class="mb-3">
                                <small class="text-muted">
                                    <i class="bi bi-folder2"></i> ${escapeHtml(folder.library)}
                                </small>
                            </div>

                            ${this._renderFolderProperties(folder)}
                            
                            ${this._renderSharingInfo(folder.sharingInfo)}
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-outline-primary view-details-btn"
                                    data-folder='${JSON.stringify({
                                        name: folder.Name,
                                        path: folder.ServerRelativeUrl,
                                        library: folder.library
                                    })}'>
                                <i class="bi ${ICONS.info}"></i> Λεπτομέρειες
                            </button>
                            <button class="btn btn-sm btn-outline-success copy-path-btn"
                                    data-path="${escapeHtml(folder.ServerRelativeUrl)}">
                                <i class="bi bi-clipboard"></i> Αντιγραφή
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';

        container.innerHTML = html;

        // Attach event listeners
        this._attachFolderEventListeners();
    }

    /**
     * Render folder properties
     */
    _renderFolderProperties(folder) {
        return `
            <ul class="list-unstyled small mb-3">
                <li><strong>Items:</strong> ${folder.ItemCount || 0}</li>
                <li><strong>Δημιουργήθηκε:</strong> ${formatDate(folder.TimeCreated)}</li>
                <li><strong>Τροποποιήθηκε:</strong> ${formatDate(folder.TimeLastModified)}</li>
                <li><strong>Δικαιώματα:</strong> ${folder.permissions?.length || 0}</li>
            </ul>
        `;
    }

    /**
     * Render sharing info
     */
    _renderSharingInfo(sharingInfo) {
        if (!sharingInfo || !sharingInfo.permissionsInformation) {
            return '<p class="text-muted small">Δεν υπάρχουν sharing links</p>';
        }

        const permissions = sharingInfo.permissionsInformation;
        
        return `
            <div class="alert alert-info mb-0">
                <strong><i class="bi bi-share"></i> Sharing Links</strong>
                <ul class="mb-0 mt-2 small">
                    ${permissions.links ? `<li>Links: ${permissions.links.length}</li>` : ''}
                    ${permissions.hasInheritedLinks ? '<li>Έχει κληρονομικά links</li>' : ''}
                </ul>
            </div>
        `;
    }

    /**
     * Attach folder event listeners
     */
    _attachFolderEventListeners() {
        // View details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const folder = JSON.parse(btn.dataset.folder);
                this._showFolderDetails(folder);
            });
        });

        // Copy path buttons
        document.querySelectorAll('.copy-path-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const path = btn.dataset.path;
                copyToClipboard(path);
            });
        });
    }

    /**
     * Show folder details modal
     */
    async _showFolderDetails(folder) {
        showLoading('Φόρτωση λεπτομερειών...');

        try {
            // Get full folder properties
            const properties = await this.spAPI.getFolderProperties(this.currentSite, folder.path);
            
            // Get permissions
            const permissions = await this.spAPI.getFolderPermissions(this.currentSite, folder.path);
            
            hideLoading();

            // Create modal
            let modalHtml = `
                <div class="modal fade" id="folderDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi ${ICONS.folder}"></i>
                                    ${escapeHtml(folder.name)}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <h6>Πληροφορίες Φακέλου</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <th>Διαδρομή:</th>
                                        <td>${escapeHtml(folder.path)}</td>
                                    </tr>
                                    <tr>
                                        <th>Βιβλιοθήκη:</th>
                                        <td>${escapeHtml(folder.library)}</td>
                                    </tr>
                                    <tr>
                                        <th>Items:</th>
                                        <td>${properties.ItemCount || 0}</td>
                                    </tr>
                                    <tr>
                                        <th>Δημιουργήθηκε:</th>
                                        <td>${formatDate(properties.TimeCreated)}</td>
                                    </tr>
                                    <tr>
                                        <th>Τροποποιήθηκε:</th>
                                        <td>${formatDate(properties.TimeLastModified)}</td>
                                    </tr>
                                </table>

                                ${permissions ? `
                                    <h6 class="mt-4">Δικαιώματα (${permissions.length})</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Όνομα</th>
                                                    <th>Τύπος</th>
                                                    <th>Δικαιώματα</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${permissions.map(perm => `
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
                                                                            ${r.Name}
                                                                        </span>`;
                                                            }).join('')}
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : `
                                    <div class="alert alert-info">
                                        Ο φάκελος κληρονομεί τα δικαιώματα από το parent του.
                                    </div>
                                `}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Κλείσιμο</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('folderDetailsModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('folderDetailsModal'));
            modal.show();

            // Remove modal from DOM after it's hidden
            document.getElementById('folderDetailsModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        } catch (error) {
            hideLoading();
            console.error('Failed to load folder details', error);
            showNotification('Αποτυχία φόρτωσης λεπτομερειών', 'error');
        }
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
    module.exports = SharedFoldersComponent;
}

