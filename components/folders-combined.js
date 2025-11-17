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
        this.allFolders = [];
        this.sharedFolders = [];
        this.siteSelector = null;
        this.rawFolders = [];
        this.includeSystemFolders = false;
        this.hiddenFolderCount = 0;
        this.totalFolderCount = 0;
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

                    <div class="d-flex flex-wrap justify-content-between align-items-center mt-2 gap-2">
                        <div id="foldersFilterInfo" class="text-muted small"></div>
                        <div class="form-check form-switch mb-0">
                            <input class="form-check-input" type="checkbox" id="foldersSystemToggle">
                            <label class="form-check-label small" for="foldersSystemToggle">
                                Εμφάνιση συστημικών φακέλων (Forms, _cts)
                            </label>
                        </div>
                    </div>
                    
                    <!-- Tabs -->
                    <ul class="nav nav-tabs mt-3" role="tablist">
                        <li class="nav-item">
                            <button class="nav-link active" id="allFolders-tab" data-bs-toggle="tab" data-bs-target="#allFoldersTab">
                                <i class="bi ${ICONS.folder}"></i> Φάκελοι (<span id="allFoldersCount">0</span>)
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
                        <div class="tab-pane fade show active" id="allFoldersTab">
                            <div id="allFoldersContent">
                                <div class="text-center text-muted py-5">
                                    <i class="bi ${ICONS.info} fs-1"></i>
                                    <p class="mt-2">Επιλέξτε site για να δείτε όλους τους φακέλους</p>
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

        const systemToggle = document.getElementById('foldersSystemToggle');
        systemToggle?.addEventListener('change', async (event) => {
            this.includeSystemFolders = event.target.checked;
            await this._refreshFolderData({ forceSharingRefresh: false });
        });
    }

    /**
     * Load folders από πολλαπλά sites (Προεπιλεγμένα)
     */
    async loadAllFoldersMultiSite(siteUrls) {
        showLoading(`Φόρτωση φακέλων από ${siteUrls.length} sites...`);
        
        const timeoutId = setTimeout(() => {
            hideLoading();
            showNotification('Η φόρτωση πήρε πολύ ώρα', 'error');
        }, 120000);

        try {
            console.log(`Loading folders from ${siteUrls.length} sites:`, siteUrls);
            
            this.rawFolders = [];
            
            for (const siteUrl of siteUrls) {
                try {
                    const libraryFolders = await this.spAPI.getFoldersGroupedByLibrary(siteUrl);
                    libraryFolders.forEach(folder => {
                        folder.siteUrl = siteUrl;
                        folder.siteName = this._extractSiteName(siteUrl);
                    });
                    this.rawFolders.push(...libraryFolders);
                } catch (error) {
                    console.error(`Failed to load folders from ${siteUrl}:`, error);
                }
            }
            
            await this._refreshFolderData({ forceSharingRefresh: true });
            
            clearTimeout(timeoutId);
            hideLoading();

            showNotification(`Φόρτωση ολοκληρώθηκε: ${this.allFolders.length} φάκελοι, ${this.sharedFolders.length} κοινόχρηστοι από ${siteUrls.length} sites`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('Failed to load folders:', error);
            showNotification('Αποτυχία φόρτωσης φακέλων', 'error');
        }
    }

    /**
     * Load folders για ένα site
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
            
            const folders = await this.spAPI.getFoldersGroupedByLibrary(siteUrl);
            
            this.rawFolders = folders.map(folder => ({
                ...folder,
                siteUrl,
                siteName: this._extractSiteName(siteUrl)
            }));
            
            await this._refreshFolderData({ forceSharingRefresh: true });
            
            clearTimeout(timeoutId);
            hideLoading();
            
            showNotification(`Φόρτωση ολοκληρώθηκε: ${this.allFolders.length} φάκελοι, ${this.sharedFolders.length} κοινόχρηστοι`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            hideLoading();
            console.error('Failed to load folders:', error);
            showNotification('Αποτυχία φόρτωσης φακέλων', 'error');
        }
    }

    /**
     * Εντοπίζει τους κοινόχρηστους φακέλους
     */
    async _identifySharedFolders(options = {}) {
        const { forceRefresh = false } = options;
        this.sharedFolders = [];

        for (const folder of this.allFolders) {
            if (folder.sharingInfoLoaded && !forceRefresh) {
                if (folder.isShared) {
                    this.sharedFolders.push(folder);
                }
                continue;
            }

            try {
                const sharingInfo = await this.spAPI.getFolderSharingLinks(folder.siteUrl, folder.ServerRelativeUrl);
                if (this._hasSharingLinks(sharingInfo)) {
                    folder.isShared = true;
                    folder.sharingInfo = sharingInfo;
                    this.sharedFolders.push(folder);
                } else {
                    folder.isShared = false;
                    folder.sharingInfo = null;
                }
            } catch (error) {
                console.warn(`Failed to detect sharing info for ${folder.Name}`, error);
                folder.isShared = false;
                folder.sharingInfo = null;
            }

            folder.sharingInfoLoaded = true;

            if (folder.isShared) {
                this.sharedFolders.push(folder);
            }
        }
    }

    /**
     * Re-apply filters (e.g., after toggling system folders) και ενημέρωση UI
     */
    async _refreshFolderData({ forceSharingRefresh = false } = {}) {
        if (!Array.isArray(this.rawFolders)) {
            this.rawFolders = [];
        }

        this.totalFolderCount = this.rawFolders.length;

        if (this.totalFolderCount === 0) {
            this.allFolders = [];
            this.sharedFolders = [];
            this.hiddenFolderCount = 0;
            this._updateCountsAndRender();
            this._updateFilterInfo();
            return;
        }

        this.allFolders = this._filterExcludedLists(this.rawFolders);
        this.hiddenFolderCount = this.totalFolderCount - this.allFolders.length;

        await this._identifySharedFolders({ forceRefresh: forceSharingRefresh });
        this._updateCountsAndRender();
        this._updateFilterInfo();
    }

    _updateCountsAndRender() {
        const allCountEl = document.getElementById('allFoldersCount');
        const sharedCountEl = document.getElementById('sharedFoldersCount');

        if (allCountEl) {
            allCountEl.textContent = this.allFolders.length;
        }
        if (sharedCountEl) {
            sharedCountEl.textContent = this.sharedFolders.length;
        }

        this._renderAllFolders();
        this._renderSharedFolders();
    }

    _updateFilterInfo() {
        const infoEl = document.getElementById('foldersFilterInfo');
        if (!infoEl) return;

        if (this.totalFolderCount === 0) {
            infoEl.textContent = '';
            return;
        }

        if (this.hiddenFolderCount > 0 && !this.includeSystemFolders) {
            infoEl.innerHTML = `<i class="bi ${ICONS.info}"></i> Φιλτράρονται ${this.hiddenFolderCount} συστημικοί φάκελοι. Ενεργοποιήστε την επιλογή για να τους προβάλετε.`;
            return;
        }

        if (this.includeSystemFolders) {
            infoEl.innerHTML = `<i class="bi ${ICONS.success}"></i> Προβάλλονται και οι συστημικοί φάκελοι.`;
            return;
        }

        infoEl.textContent = '';
    }

    /**
     * Helper: Έχει sharing links;
     */
    _hasSharingLinks(sharingInfo) {
        if (!sharingInfo || !sharingInfo.permissionsInformation) {
            return false;
        }

        const permissions = sharingInfo.permissionsInformation;
        const links = permissions.links;

        if (!links) return false;
        if (Array.isArray(links)) {
            return links.length > 0;
        }

        if (links.results && Array.isArray(links.results)) {
            return links.results.length > 0;
        }

        if (typeof links.length === 'number') {
            return links.length > 0;
        }

        return false;
    }

    /**
     * Render all folders tab
     */
    _renderAllFolders() {
        this._renderFolderList(this.allFolders, 'allFoldersContent', 'all');
    }

    /**
     * Generic folder list renderer (accordion)
     */
    _renderFolderList(folders, containerId, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!folders || folders.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi ${ICONS.info} fs-1"></i>
                    <p class="mt-2">${type === 'shared' ? 'Δεν βρέθηκαν κοινόχρηστοι φάκελοι' : 'Δεν βρέθηκαν φάκελοι'}</p>
                </div>
            `;
            return;
        }

        const accordionId = `${containerId}Accordion`;

        let html = `<div class="accordion" id="${accordionId}">`;

        folders.forEach((folder, index) => {
            const collapseId = `${accordionId}-collapse-${index}`;
            const headerId = `${accordionId}-header-${index}`;
            const permsContainerId = `${collapseId}-perms`;
            const creatorName = folder.createdBy?.name || 'Άγνωστος';
            const creatorEmail = folder.createdBy?.email || '';
            const badges = [];

            if (folder.hasUniquePermissions) {
                badges.push(`<span class="badge bg-warning text-dark me-1"><i class="bi bi-shield-lock"></i> Unique</span>`);
            } else {
                badges.push(`<span class="badge bg-secondary me-1">Inherited</span>`);
            }

            if (folder.isShared) {
                badges.push(`<span class="badge bg-success me-1"><i class="bi ${ICONS.share}"></i> Shared</span>`);
            }

            if (folder.siteName) {
                badges.push(`<span class="badge bg-dark me-1">${escapeHtml(folder.siteName)}</span>`);
            }

            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="${headerId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                            <div class="w-100">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>${escapeHtml(folder.Name)}</strong>
                                        <small class="text-muted d-block">${escapeHtml(folder.library || 'N/A')}</small>
                                    </div>
                                    <div>${badges.join('')}</div>
                                </div>
                                <div class="mt-1 small text-muted">
                                    Δημιουργός: ${escapeHtml(creatorName)}${creatorEmail ? ` • ${escapeHtml(creatorEmail)}` : ''}
                                </div>
                            </div>
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse"
                         data-bs-parent="#${accordionId}"
                         data-folder-type="${type}"
                         data-folder-index="${index}"
                         data-perms-container-id="${permsContainerId}">
                        <div class="accordion-body">
                            ${this._renderFolderInfoBlock(folder)}
                            ${type === 'shared' && folder.sharingInfo ? this._renderSharingSummary(folder.sharingInfo) : ''}
                            <div class="mt-3">
                                <h6>Δικαιώματα</h6>
                                <div class="folder-permissions-container" id="${permsContainerId}">
                                    <div class="text-muted small">Πατήστε για να δείτε ποιοι χρήστες έχουν πρόσβαση.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        this._attachAccordionEvents(accordionId, type);
    }

    /**
     * Attach accordion events για φόρτωση δικαιωμάτων
     */
    _attachAccordionEvents(accordionId, type) {
        const accordion = document.getElementById(accordionId);
        if (!accordion) return;

        accordion.querySelectorAll('.accordion-collapse').forEach(collapse => {
            collapse.addEventListener('show.bs.collapse', async (event) => {
                const target = event.currentTarget;
                const index = parseInt(target.dataset.folderIndex, 10);
                const permsContainerId = target.dataset.permsContainerId;
                const permsContainer = document.getElementById(permsContainerId);
                await this._ensureFolderPermissions(type, index, permsContainer);
            });
        });
    }

    /**
     * Φόρτωση δικαιωμάτων μόλις ανοιχτεί το accordion
     */
    async _ensureFolderPermissions(type, index, container) {
        if (!container) return;
        const collection = type === 'shared' ? this.sharedFolders : this.allFolders;
        const folder = collection[index];
        if (!folder) return;

        if (folder.permissionsLoaded) {
            container.innerHTML = folder.permissionsHtml;
            return;
        }

        container.innerHTML = `
            <div class="text-muted small">
                <span class="spinner-border spinner-border-sm me-2"></span> Φόρτωση δικαιωμάτων...
            </div>
        `;

        try {
            const permissions = await this.spAPI.getFolderPermissions(folder.siteUrl, folder.ServerRelativeUrl);
            folder.permissions = permissions;
            folder.permissionsLoaded = true;
            folder.permissionsHtml = permissions
                ? this._renderFolderPermissionsTable(permissions)
                : `<div class="alert alert-info"><i class="bi ${ICONS.info}"></i> Ο φάκελος κληρονομεί δικαιώματα από το parent.</div>`;

            container.innerHTML = folder.permissionsHtml;
        } catch (error) {
            console.error('Failed to load folder permissions', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Αποτυχία φόρτωσης δικαιωμάτων: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }

    /**
     * Render folder info block
     */
    _renderFolderInfoBlock(folder) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <ul class="list-unstyled small mb-3">
                        <li><strong>Document Library:</strong> ${escapeHtml(folder.library || 'N/A')}</li>
                        <li><strong>Document List:</strong> ${escapeHtml(folder.library || 'N/A')}</li>
                        <li><strong>Site:</strong> ${escapeHtml(folder.siteName || '')}</li>
                        <li><strong>Διαδρομή:</strong> <span class="font-monospace">${escapeHtml(folder.ServerRelativeUrl)}</span></li>
                        <li><strong>Items:</strong> ${folder.ItemCount || 0}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <ul class="list-unstyled small mb-0">
                        <li><strong>Δημιουργός:</strong> ${escapeHtml(folder.createdBy?.name || 'Άγνωστος')}</li>
                        ${folder.createdBy?.email ? `<li><strong>Email:</strong> ${escapeHtml(folder.createdBy.email)}</li>` : ''}
                        <li><strong>Δημιουργήθηκε:</strong> ${formatDate(folder.TimeCreated)}</li>
                        <li><strong>Τροποποιήθηκε:</strong> ${formatDate(folder.TimeLastModified)}</li>
                        <li><strong>Unique Permissions:</strong> ${folder.hasUniquePermissions ? 'Ναι' : 'Όχι'}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Render sharing info summary
     */
    _renderSharingSummary(sharingInfo) {
        if (!sharingInfo || !sharingInfo.permissionsInformation) {
            return '';
        }

        const permissions = sharingInfo.permissionsInformation;
        const linksCount = permissions.links ? permissions.links.length : 0;

        return `
            <div class="alert alert-info small">
                <strong><i class="bi ${ICONS.share}"></i> Sharing Links</strong>
                <div class="mt-2">
                    <span class="badge bg-primary me-2">${linksCount} links</span>
                    ${permissions.hasInheritedLinks ? '<span class="badge bg-secondary">Κληρονομικά links</span>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Helper: Extract site name από URL
     */
    _extractSiteName(siteUrl) {
        if (!siteUrl) return 'N/A';
        try {
            const url = new URL(siteUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            if (pathParts.length === 0) {
                return url.hostname.split('.')[0];
            }
            return pathParts[pathParts.length - 1];
        } catch {
            return siteUrl;
        }
    }

    /**
     * Render shared folders tab
     */
    _renderSharedFolders() {
        this._renderFolderList(this.sharedFolders, 'sharedFoldersContent', 'shared');
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
        const excludedLower = new Set(excludedLists.map(name => name.toLowerCase()));
        const defaultDisallowed = [
            'forms',
            'form templates',
            'audio',
            'video',
            'images',
            'imagine activă',
            'redare video'
        ];
        const disallowedConfig = this.config?.sharepoint?.disallowedDocumentLibraries || [];
        [...defaultDisallowed, ...disallowedConfig].forEach(name => {
            if (name) {
                excludedLower.add(name.toLowerCase());
            }
        });
        const disallowedFolderNames = new Set([
            'forms',
            'form templates',
            '_cts',
            'attachments',
            'site assets'
        ]);
        const disallowedFoldersConfig = this.config?.sharepoint?.disallowedFolders || [];
        disallowedFoldersConfig.forEach(name => {
            if (name) {
                disallowedFolderNames.add(name.toLowerCase());
            }
        });
        const disallowedFolderPathPatterns = [
            /\/forms($|\/)/i,
            /\/_cts($|\/)/i
        ];
        const configPathPatterns = (this.config?.sharepoint?.disallowedFolderPathPatterns || []).map(pattern => {
            try {
                return new RegExp(pattern, 'i');
            } catch {
                console.warn('[FoldersCombined] Invalid regex pattern in disallowedFolderPathPatterns:', pattern);
                return null;
            }
        }).filter(Boolean);
        disallowedFolderPathPatterns.push(...configPathPatterns);
        const customOnlyPattern = this.config?.sharepoint?.customLibrariesOnlyPattern 
            ? new RegExp(this.config.sharepoint.customLibrariesOnlyPattern, 'i')
            : null;

        return folders.filter(folder => {
            const libraryName = (folder.library || '').trim();
            const lowerName = libraryName.toLowerCase();
            const folderName = (folder.Name || '').trim().toLowerCase();
            const serverRelativeUrl = (folder.ServerRelativeUrl || folder.serverRelativeUrl || '').toLowerCase();

            if (!libraryName) return false;
            if (excludedLower.has(lowerName)) {
                return false;
            }
            if (!this.includeSystemFolders) {
                if (disallowedFolderNames.has(folderName)) {
                    return false;
                }
                if (disallowedFolderPathPatterns.some(pattern => pattern.test(serverRelativeUrl))) {
                    return false;
                }
            }
            if (customOnlyPattern) {
                return customOnlyPattern.test(libraryName);
            }
            return true;
        });
    }
}

