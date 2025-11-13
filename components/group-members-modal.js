/**
 * Group Members Modal Component
 * Εμφανίζει τα μέλη ενός SharePoint Group σε modal
 */

class GroupMembersModal {
    constructor(spAPI, graphAPI, config) {
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
        this.modalId = 'groupMembersModal';
        this.modal = null;
        this.currentGroup = null;
        this.currentSiteUrl = null;
    }

    /**
     * Show modal με τα members του group
     */
    async show(groupName, principalId, siteUrl) {
        this.currentGroup = groupName;
        this.currentSiteUrl = siteUrl;

        // Create modal if doesn't exist
        if (!document.getElementById(this.modalId)) {
            this._createModal();
        }

        // Show modal
        this.modal = new bootstrap.Modal(document.getElementById(this.modalId));
        this.modal.show();

        // Load members
        await this._loadGroupMembers(principalId, siteUrl);
    }

    /**
     * Create modal HTML
     */
    _createModal() {
        const modalHtml = `
            <div class="modal fade" id="${this.modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-people"></i> 
                                Μέλη Ομάδας: <span id="groupMembersModalTitle"></span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="groupMembersContent">
                                <div class="text-center py-4">
                                    <div class="spinner-border" role="status"></div>
                                    <p class="mt-2">Φόρτωση μελών...</p>
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

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Load group members
     */
    async _loadGroupMembers(principalId, siteUrl) {
        const titleElement = document.getElementById('groupMembersModalTitle');
        const contentElement = document.getElementById('groupMembersContent');

        titleElement.textContent = this.currentGroup;

        try {
            console.log(`Loading members for group: ${this.currentGroup} (ID: ${principalId})`);

            // Get group members
            const members = await this.spAPI.getGroupMembers(siteUrl, principalId);
            console.log(`Found ${members.length} members`);

            if (members.length === 0) {
                contentElement.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        Η ομάδα δεν έχει μέλη
                    </div>
                `;
                return;
            }

            // Render members table
            this._renderMembersTable(members, contentElement);

        } catch (error) {
            console.error('Failed to load group members', error);
            contentElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i>
                    <strong>Αποτυχία φόρτωσης μελών</strong><br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    /**
     * Render members table
     */
    _renderMembersTable(members, container) {
        // Separate users and groups
        const users = members.filter(m => m.PrincipalType === 1); // User
        const groups = members.filter(m => m.PrincipalType !== 1); // Groups/Other

        let html = `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">
                        <i class="bi bi-person"></i> Χρήστες (${users.length})
                    </h6>
                    <small class="text-muted">Σύνολο: ${members.length} μέλη</small>
                </div>
        `;

        if (users.length > 0) {
            html += `
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Όνομα</th>
                                <th>Email</th>
                                <th>Login Name</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (const user of users) {
                const email = user.Email || this._extractEmailFromLogin(user.LoginName);
                html += `
                    <tr>
                        <td>
                            <i class="bi bi-person-circle me-2"></i>
                            ${escapeHtml(user.Title)}
                        </td>
                        <td>${escapeHtml(email || '-')}</td>
                        <td><small class="text-muted">${escapeHtml(user.LoginName || '-')}</small></td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += '<p class="text-muted"><small>Δεν υπάρχουν χρήστες</small></p>';
        }

        // Groups section
        if (groups.length > 0) {
            html += `
                <h6 class="mt-3 mb-2">
                    <i class="bi bi-people"></i> Ομάδες (${groups.length})
                </h6>
                <div class="list-group">
            `;

            for (const group of groups) {
                html += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-people-fill me-2"></i>
                                <strong>${escapeHtml(group.Title)}</strong>
                            </div>
                            <span class="badge bg-secondary">${this._getPrincipalTypeName(group.PrincipalType)}</span>
                        </div>
                        ${group.Email ? `<small class="text-muted">${escapeHtml(group.Email)}</small>` : ''}
                    </div>
                `;
            }

            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;
    }

    /**
     * Extract email from login name
     */
    _extractEmailFromLogin(loginName) {
        if (!loginName) return null;
        const match = loginName.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        return match ? match[1] : null;
    }

    /**
     * Get principal type name
     */
    _getPrincipalTypeName(type) {
        switch(type) {
            case 1: return 'User';
            case 4: return 'AD Group';
            case 8: return 'SharePoint Group';
            default: return 'Other';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupMembersModal;
}

