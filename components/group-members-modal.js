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
                <div class="accordion" id="groupMembersGroupsAccordion">
            `;

            groups.forEach((group, index) => {
                const collapseId = `groupMembersGroup-${group.Id || index}`;
                html += `
                    <div class="accordion-item" data-group-index="${index}">
                        <h2 class="accordion-header" id="${collapseId}-header">
                            <button class="accordion-button collapsed" type="button"
                                    data-bs-toggle="collapse"
                                    data-group-index="${index}"
                                    data-bs-target="#${collapseId}">
                                <div class="w-100">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <i class="bi bi-people-fill me-2"></i>
                                            <strong>${escapeHtml(group.Title)}</strong>
                                        </div>
                                        <span class="badge bg-secondary">${this._getPrincipalTypeName(group.PrincipalType)}</span>
                                    </div>
                                    ${group.Email ? `<small class="text-muted">${escapeHtml(group.Email)}</small>` : ''}
                                </div>
                            </button>
                        </h2>
                        <div id="${collapseId}" class="accordion-collapse collapse"
                             data-bs-parent="#groupMembersGroupsAccordion"
                             data-group-index="${index}">
                            <div class="accordion-body">
                                <div class="text-muted small">Ανοίξτε για να δείτε τα μέλη της ομάδας.</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;

        if (groups.length > 0) {
            this._attachGroupAccordionListeners(groups);
        }
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

    /**
     * Attach accordion listeners για nested groups
     */
    _attachGroupAccordionListeners(groups) {
        const accordion = document.getElementById('groupMembersGroupsAccordion');
        if (!accordion) return;

        accordion.querySelectorAll('.accordion-collapse').forEach(collapse => {
            collapse.addEventListener('show.bs.collapse', async (event) => {
                const target = event.currentTarget;
                if (target.dataset.loaded === 'true') return;
                const index = parseInt(target.dataset.groupIndex, 10);
                const group = groups[index];
                const body = target.querySelector('.accordion-body');
                await this._loadNestedGroupMembers(group, body);
                target.dataset.loaded = 'true';
            });
        });
    }

    /**
     * Load nested group members (SharePoint group or Azure AD group)
     */
    async _loadNestedGroupMembers(group, container) {
        if (!container || !group) return;

        container.innerHTML = `
            <div class="text-center py-2">
                <div class="spinner-border spinner-border-sm" role="status"></div>
                <p class="text-muted small mt-2 mb-0">Φόρτωση μελών...</p>
            </div>
        `;

        try {
            if (group.PrincipalType === 8) {
                const members = await this.spAPI.getGroupMembers(this.currentSiteUrl, group.Id);
                container.innerHTML = this._renderNestedMembersTable(members);
            } else if (group.PrincipalType === 4) {
                const members = await this._loadAzureADGroupMembers(group);
                container.innerHTML = this._renderAADGroupMembers(members);
            } else {
                container.innerHTML = `
                    <div class="alert alert-info mb-0">
                        <i class="bi bi-info-circle"></i>
                        Η προβολή μελών υποστηρίζεται μόνο για SharePoint και Azure AD groups.
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load nested group members', error);
            container.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="bi bi-x-circle"></i>
                    Αποτυχία φόρτωσης μελών: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }

    /**
     * Load Azure AD group members using Graph API
     */
    async _loadAzureADGroupMembers(group) {
        const query = group.Email || group.Title;
        if (!query) {
            throw new Error('Δεν υπάρχει email για την ομάδα');
        }

        const results = await this.graphAPI.searchGroups(query, 1);
        if (!results || results.length === 0) {
            throw new Error('Η ομάδα δεν βρέθηκε στο Azure AD');
        }

        const matchedGroup = results.find(g => g.mail?.toLowerCase() === query.toLowerCase()) || results[0];
        if (!matchedGroup?.id) {
            throw new Error('Αδυναμία ανάκτησης Azure AD group ID');
        }

        const members = await this.graphAPI.getGroupMembers(matchedGroup.id);
        return members;
    }

    /**
     * Render nested SharePoint group members table
     */
    _renderNestedMembersTable(members) {
        if (!members || members.length === 0) {
            return `<div class="text-muted small">Η ομάδα δεν έχει μέλη.</div>`;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Όνομα</th>
                            <th>Email</th>
                            <th>Login Name</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        members.forEach(member => {
            const email = member.Email || this._extractEmailFromLogin(member.LoginName);
            html += `
                <tr>
                    <td>${escapeHtml(member.Title)}</td>
                    <td>${escapeHtml(email || '-')}</td>
                    <td><small class="text-muted">${escapeHtml(member.LoginName || '-')}</small></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    /**
     * Render Azure AD group members
     */
    _renderAADGroupMembers(members) {
        if (!members || members.length === 0) {
            return `<div class="text-muted small">Η ομάδα δεν έχει μέλη στο Azure AD.</div>`;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Όνομα</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        members.forEach(member => {
            html += `
                <tr>
                    <td>${escapeHtml(member.displayName || member.userPrincipalName || '-')}</td>
                    <td>${escapeHtml(member.mail || member.userPrincipalName || '-')}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupMembersModal;
}

