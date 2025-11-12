/**
 * User Selector Component
 * Modal για επιλογή χρήστη ή group
 */

class UserSelectorComponent {
    constructor(graphAPI, spAPI, config) {
        this.graphAPI = graphAPI;
        this.spAPI = spAPI;
        this.config = config;
        this.selectedPrincipal = null;
        this.siteUrl = null;
    }

    /**
     * Show user selector modal
     */
    async show(options = {}) {
        this.siteUrl = options.siteUrl || null;
        
        return new Promise((resolve, reject) => {
            this._createModal();
            this._attachEventListeners(resolve, reject);
            
            const modal = new bootstrap.Modal(document.getElementById('userSelectorModal'));
            modal.show();
        });
    }

    /**
     * Create modal HTML
     */
    _createModal() {
        // Remove existing modal
        const existing = document.getElementById('userSelectorModal');
        if (existing) {
            existing.remove();
        }

        const modalHtml = `
            <div class="modal fade" id="userSelectorModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi ${ICONS.user}"></i> Επιλογή Χρήστη ή Ομάδας
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Search Box -->
                            <div class="mb-3">
                                <label for="principalSearch" class="form-label">Αναζήτηση</label>
                                <input type="text" class="form-control" id="principalSearch" 
                                       placeholder="Αναζήτηση χρήστη ή ομάδας...">
                            </div>

                            <!-- Tabs -->
                            <ul class="nav nav-tabs mb-3" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" id="users-tab" data-bs-toggle="tab" 
                                       href="#users-panel" role="tab">
                                        <i class="bi ${ICONS.user}"></i> Χρήστες
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" id="groups-tab" data-bs-toggle="tab" 
                                       href="#groups-panel" role="tab">
                                        <i class="bi ${ICONS.group}"></i> Ομάδες
                                    </a>
                                </li>
                            </ul>

                            <!-- Tab Content -->
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="users-panel" role="tabpanel">
                                    <div id="usersList" style="max-height: 400px; overflow-y: auto;">
                                        <div class="text-center text-muted py-3">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <p class="mt-2">Φόρτωση χρηστών...</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="tab-pane fade" id="groups-panel" role="tabpanel">
                                    <div id="groupsList" style="max-height: 400px; overflow-y: auto;">
                                        <div class="text-center text-muted py-3">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <p class="mt-2">Φόρτωση ομάδων...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Selected Principal -->
                            <div id="selectedPrincipalDisplay" class="alert alert-info mt-3" style="display: none;">
                                <strong>Επιλεγμένο:</strong>
                                <span id="selectedPrincipalName"></span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Ακύρωση</button>
                            <button type="button" class="btn btn-primary" id="selectPrincipalBtn" disabled>
                                Επιλογή
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners(resolve, reject) {
        const modal = document.getElementById('userSelectorModal');

        // Load users when modal is shown
        modal.addEventListener('shown.bs.modal', async () => {
            await this._loadUsers();
        });

        // Load groups when groups tab is clicked
        document.getElementById('groups-tab').addEventListener('click', async () => {
            await this._loadGroups();
        });

        // Search input
        const searchInput = document.getElementById('principalSearch');
        searchInput?.addEventListener('input', debounce((e) => {
            this._filterPrincipals(e.target.value);
        }, 300));

        // Select button
        document.getElementById('selectPrincipalBtn')?.addEventListener('click', () => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal?.hide();
            resolve(this.selectedPrincipal);
        });

        // Cancel/close
        modal.addEventListener('hidden.bs.modal', () => {
            if (!this.selectedPrincipal) {
                reject(new Error('User selection cancelled'));
            }
            modal.remove();
        });
    }

    /**
     * Load users
     */
    async _loadUsers() {
        const container = document.getElementById('usersList');
        
        try {
            let users;
            
            if (this.siteUrl) {
                // Load site users
                users = await this.spAPI.getSiteUsers(this.siteUrl);
            } else {
                // Load all users from Graph
                users = await this.graphAPI.getAllUsers(50);
            }

            this._renderPrincipalsList(users, container, 'user');
        } catch (error) {
            console.error('Failed to load users', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Αποτυχία φόρτωσης χρηστών
                </div>
            `;
        }
    }

    /**
     * Load groups
     */
    async _loadGroups() {
        const container = document.getElementById('groupsList');
        
        // Check if already loaded
        if (container.dataset.loaded === 'true') {
            return;
        }

        try {
            let groups;
            
            if (this.siteUrl) {
                // Load site groups
                groups = await this.spAPI.getSiteGroups(this.siteUrl);
            } else {
                // Load all groups from Graph
                groups = await this.graphAPI.getGroups(50);
            }

            this._renderPrincipalsList(groups, container, 'group');
            container.dataset.loaded = 'true';
        } catch (error) {
            console.error('Failed to load groups', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi ${ICONS.error}"></i>
                    Αποτυχία φόρτωσης ομάδων
                </div>
            `;
        }
    }

    /**
     * Render principals list
     */
    _renderPrincipalsList(principals, container, type) {
        if (principals.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi ${ICONS.info}"></i>
                    <p class="mt-2">Δεν βρέθηκαν ${type === 'user' ? 'χρήστες' : 'ομάδες'}</p>
                </div>
            `;
            return;
        }

        let html = '<div class="list-group">';

        for (const principal of principals) {
            const id = principal.Id || principal.id;
            const title = principal.Title || principal.displayName;
            const subtitle = principal.Email || principal.LoginName || principal.mail || principal.userPrincipalName;
            
            html += `
                <button type="button" class="list-group-item list-group-item-action principal-item"
                        data-id="${id}"
                        data-title="${escapeHtml(title)}"
                        data-subtitle="${escapeHtml(subtitle || '')}"
                        data-type="${type}">
                    <div class="d-flex w-100 align-items-center">
                        <i class="bi ${type === 'user' ? ICONS.user : ICONS.group} me-2"></i>
                        <div class="flex-grow-1">
                            <strong>${escapeHtml(title)}</strong>
                            ${subtitle ? `<br><small class="text-muted">${escapeHtml(subtitle)}</small>` : ''}
                        </div>
                        <i class="bi bi-check-circle text-success" style="display: none;"></i>
                    </div>
                </button>
            `;
        }

        html += '</div>';

        container.innerHTML = html;

        // Attach click handlers
        container.querySelectorAll('.principal-item').forEach(item => {
            item.addEventListener('click', () => {
                this._selectPrincipal(item);
            });
        });
    }

    /**
     * Select principal
     */
    _selectPrincipal(element) {
        // Clear previous selection
        document.querySelectorAll('.principal-item').forEach(item => {
            item.classList.remove('active');
            item.querySelector('.bi-check-circle').style.display = 'none';
        });

        // Mark as selected
        element.classList.add('active');
        element.querySelector('.bi-check-circle').style.display = 'inline';

        // Store selection
        this.selectedPrincipal = {
            id: element.dataset.id,
            title: element.dataset.title,
            subtitle: element.dataset.subtitle,
            type: element.dataset.type
        };

        // Update display
        document.getElementById('selectedPrincipalName').textContent = this.selectedPrincipal.title;
        document.getElementById('selectedPrincipalDisplay').style.display = 'block';

        // Enable select button
        document.getElementById('selectPrincipalBtn').disabled = false;
    }

    /**
     * Filter principals
     */
    _filterPrincipals(searchTerm) {
        const activeTab = document.querySelector('.tab-pane.active');
        const items = activeTab.querySelectorAll('.principal-item');

        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const title = item.dataset.title.toLowerCase();
            const subtitle = (item.dataset.subtitle || '').toLowerCase();
            
            if (title.includes(term) || subtitle.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserSelectorComponent;
}

