/**
 * Permission Modal Component
 * Modal για προσθήκη/επεξεργασία permissions
 */

class PermissionModalComponent {
    constructor(spAPI, graphAPI, userSelector, config) {
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.userSelector = userSelector;
        this.config = config;
        this.selectedPrincipal = null;
        this.selectedRole = null;
        this.roleDefinitions = [];
    }

    /**
     * Show permission modal
     */
    async show(options = {}) {
        this.options = options;
        const { mode, targetType, targetUrl, folderPath, principalId, principalName, currentRoles } = options;

        // Load role definitions
        await this._loadRoleDefinitions(targetUrl);

        return new Promise((resolve, reject) => {
            this._createModal(mode, targetType, principalName, currentRoles);
            this._attachEventListeners(resolve, reject);
            
            const modal = new bootstrap.Modal(document.getElementById('permissionModal'));
            modal.show();
        });
    }

    /**
     * Load role definitions
     */
    async _loadRoleDefinitions(siteUrl) {
        try {
            const roles = await this.spAPI.getRoleDefinitions(siteUrl);
            this.roleDefinitions = roles.filter(r => 
                // Filter out "Limited Access" as it's not assignable
                r.Name !== 'Limited Access'
            );
        } catch (error) {
            console.error('Failed to load role definitions', error);
            this.roleDefinitions = [];
        }
    }

    /**
     * Create modal HTML
     */
    _createModal(mode, targetType, principalName, currentRoles) {
        // Remove existing modal
        const existing = document.getElementById('permissionModal');
        if (existing) {
            existing.remove();
        }

        const isEdit = mode === 'edit';
        const title = isEdit ? 'Επεξεργασία Δικαιώματος' : 'Προσθήκη Δικαιώματος';

        const modalHtml = `
            <div class="modal fade" id="permissionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi ${isEdit ? ICONS.edit : ICONS.add}"></i> ${title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Target Info -->
                            <div class="alert alert-info">
                                <strong>Τοποθεσία:</strong> 
                                ${targetType === 'site' ? 'Site' : 'Φάκελος'}
                            </div>

                            ${isEdit ? `
                                <!-- Existing Principal (Edit Mode) -->
                                <div class="mb-3">
                                    <label class="form-label">Χρήστης/Ομάδα</label>
                                    <div class="alert alert-secondary">
                                        <i class="bi ${ICONS.user}"></i> ${escapeHtml(principalName)}
                                    </div>
                                </div>
                            ` : `
                                <!-- Principal Selector (Add Mode) -->
                                <div class="mb-3">
                                    <label class="form-label">Επιλέξτε Χρήστη ή Ομάδα</label>
                                    <button type="button" class="btn btn-outline-primary w-100" id="selectPrincipalBtn">
                                        <i class="bi ${ICONS.user}"></i> Επιλογή Χρήστη/Ομάδας
                                    </button>
                                    <div id="selectedPrincipalDisplay" class="alert alert-success mt-2" style="display: none;">
                                        <strong>Επιλεγμένο:</strong>
                                        <span id="selectedPrincipalName"></span>
                                    </div>
                                </div>
                            `}

                            <!-- Role Selector -->
                            <div class="mb-3">
                                <label for="roleSelector" class="form-label">Επίπεδο Δικαιώματος</label>
                                <select class="form-select" id="roleSelector">
                                    <option value="">-- Επιλέξτε Δικαίωμα --</option>
                                    ${this.roleDefinitions.map(role => {
                                        const permInfo = getPermissionLevelInfo(role.Name);
                                        const isSelected = isEdit && currentRoles && currentRoles.includes(role.Name);
                                        return `
                                            <option value="${role.Id}" ${isSelected ? 'selected' : ''}>
                                                ${role.Name} - ${permInfo.description}
                                            </option>
                                        `;
                                    }).join('')}
                                </select>
                                <div class="form-text">Επιλέξτε το επίπεδο πρόσβασης που θέλετε να δώσετε</div>
                            </div>

                            <!-- Role Info -->
                            <div id="roleInfoDisplay" style="display: none;"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Ακύρωση</button>
                            <button type="button" class="btn btn-primary" id="savePermissionBtn" disabled>
                                ${isEdit ? 'Ενημέρωση' : 'Προσθήκη'}
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
        const modal = document.getElementById('permissionModal');
        const isEdit = this.options.mode === 'edit';

        // Select principal button (add mode only)
        if (!isEdit) {
            document.getElementById('selectPrincipalBtn')?.addEventListener('click', async () => {
                try {
                    this.selectedPrincipal = await this.userSelector.show({
                        siteUrl: this.options.targetUrl
                    });
                    
                    // Update display
                    document.getElementById('selectedPrincipalName').textContent = this.selectedPrincipal.title;
                    document.getElementById('selectedPrincipalDisplay').style.display = 'block';
                    
                    // Enable save if role is also selected
                    this._updateSaveButton();
                } catch (error) {
                    // User cancelled selection
                    console.log('User selection cancelled');
                }
            });
        } else {
            // In edit mode, principal is already set
            this.selectedPrincipal = {
                id: this.options.principalId
            };
        }

        // Role selector
        document.getElementById('roleSelector')?.addEventListener('change', (e) => {
            this.selectedRole = e.target.value;
            this._showRoleInfo(this.selectedRole);
            this._updateSaveButton();
        });

        // Save button
        document.getElementById('savePermissionBtn')?.addEventListener('click', async () => {
            await this._savePermission(resolve);
        });

        // Cancel/close
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Show role info
     */
    _showRoleInfo(roleId) {
        if (!roleId) {
            document.getElementById('roleInfoDisplay').style.display = 'none';
            return;
        }

        const role = this.roleDefinitions.find(r => r.Id == roleId);
        if (!role) return;

        const permInfo = getPermissionLevelInfo(role.Name);

        const html = `
            <div class="card">
                <div class="card-body">
                    <h6>
                        <span class="badge bg-${permInfo.color}">
                            <i class="bi ${permInfo.icon}"></i> ${role.Name}
                        </span>
                    </h6>
                    <p class="mb-0">${permInfo.description}</p>
                </div>
            </div>
        `;

        const display = document.getElementById('roleInfoDisplay');
        display.innerHTML = html;
        display.style.display = 'block';
    }

    /**
     * Update save button state
     */
    _updateSaveButton() {
        const saveBtn = document.getElementById('savePermissionBtn');
        const isEdit = this.options.mode === 'edit';
        
        // In add mode, need both principal and role
        // In edit mode, only need role (principal is already set)
        const canSave = (isEdit || this.selectedPrincipal) && this.selectedRole;
        
        saveBtn.disabled = !canSave;
    }

    /**
     * Save permission
     */
    async _savePermission(resolve) {
        const principalId = this.selectedPrincipal.id;
        const roleDefId = this.selectedRole;

        // Call the onSave callback from options
        if (this.options.onSave) {
            await this.options.onSave(principalId, roleDefId);
        }

        // Close modal
        const bsModal = bootstrap.Modal.getInstance(document.getElementById('permissionModal'));
        bsModal?.hide();

        resolve({ principalId, roleDefId });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PermissionModalComponent;
}

