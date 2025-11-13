/**
 * Permission Aggregator
 * Service για aggregation και ανάλυση δικαιωμάτων ανά χρήστη
 */

class PermissionAggregator {
    constructor(spAPI, graphAPI, config) {
        this.spAPI = spAPI;
        this.graphAPI = graphAPI;
        this.config = config;
    }

    /**
     * Παίρνει όλα τα permissions για έναν συγκεκριμένο χρήστη
     * Επιστρέφει: { sites: [], folders: [], groups: [] }
     */
    async getUserPermissions(userEmail, customSites = null) {
        showLoading('Αναζήτηση δικαιωμάτων χρήστη...');
        
        try {
            // 1. Παίρνουμε τον χρήστη από το Graph
            const user = await this.graphAPI.getUserByEmail(userEmail);
            
            // 2. Παίρνουμε τα groups του χρήστη
            const userGroups = await this.graphAPI.getUserGroups(user.id);
            const groupIds = userGroups.map(g => g.id);
            
            // 3. Αναλύουμε τα sites (custom ή monitored)
            const sitesToCheck = customSites && customSites.length > 0 
                ? customSites 
                : this.config.sharepoint.monitoredSites;
            
            console.log(`Checking ${sitesToCheck.length} sites for user ${userEmail}:`, sitesToCheck);
            
            const sitePermissions = [];
            const folderPermissions = [];
            const allGroups = [];
            
            for (const siteUrl of sitesToCheck) {
                try {
                    console.log(`Analyzing site: ${siteUrl}`);
                    
                    // Παίρνουμε site permissions
                    const sitePerms = await this._analyzeSitePermissions(
                        siteUrl, 
                        user, 
                        userGroups
                    );
                    
                    if (sitePerms) {
                        sitePermissions.push(sitePerms);
                        console.log(`✅ Found site permissions:`, sitePerms);
                        
                        // Collect SharePoint groups που ανήκει ο χρήστης
                        sitePerms.permissions.forEach(perm => {
                            console.log(`  🔹 Permission:`, perm);
                            if (!perm.isDirect && perm.matchedThrough && perm.matchedThrough !== 'Direct') {
                                const groupInfo = {
                                    groupName: perm.matchedThrough,
                                    site: siteUrl,
                                    siteName: sitePerms.siteTitle,
                                    permissions: perm.roles
                                };
                                console.log(`    ✅ Adding group:`, groupInfo);
                                allGroups.push(groupInfo);
                            } else {
                                console.log(`    ⏭️ Skipping (isDirect=${perm.isDirect}, matchedThrough="${perm.matchedThrough}")`);
                            }
                        });
                    }
                    
                    // Παίρνουμε folder permissions
                    const folderPerms = await this._analyzeFolderPermissions(
                        siteUrl,
                        user,
                        userGroups
                    );
                    
                    if (folderPerms.length > 0) {
                        folderPermissions.push(...folderPerms);
                    }
                } catch (error) {
                    console.error(`Failed to analyze ${siteUrl}`, error);
                }
            }
            
            hideLoading();
            
            console.log(`User permissions aggregation complete:`, {
                sites: sitePermissions.length,
                folders: folderPermissions.length,
                groups: allGroups.length
            });
            
            return {
                user: {
                    email: userEmail,
                    displayName: user.displayName,
                    id: user.id
                },
                groups: allGroups, // SharePoint groups με permissions (όχι Azure AD groups)
                sites: sitePermissions,
                folders: folderPermissions,
                summary: this._createSummary(sitePermissions, folderPermissions)
            };
        } catch (error) {
            hideLoading();
            console.error('Failed to get user permissions', error);
            throw error;
        }
    }

    /**
     * Αναλύει τα permissions ενός χρήστη σε ένα site
     */
    async _analyzeSitePermissions(siteUrl, user, userGroups) {
        try {
            // Παίρνουμε site info
            const siteInfo = await this.spAPI.getSiteInfo(siteUrl);
            
            // Παίρνουμε site permissions
            const roleAssignments = await this.spAPI.getSitePermissions(siteUrl);
            
            // Ελέγχουμε αν ο χρήστης ή τα groups του έχουν permissions
            const userPermissions = await this._findUserInPermissionsAsync(
                roleAssignments,
                user,
                userGroups,
                siteUrl
            );
            
            if (userPermissions.length > 0) {
                return {
                    siteUrl: siteUrl,
                    siteTitle: siteInfo.d.Title,
                    permissions: userPermissions,
                    directPermissions: userPermissions.filter(p => p.isDirect),
                    inheritedPermissions: userPermissions.filter(p => !p.isDirect)
                };
            }
            
            return null;
        } catch (error) {
            console.error(`Failed to analyze site ${siteUrl}`, error);
            return null;
        }
    }

    /**
     * Αναλύει τα folder permissions για έναν χρήστη
     */
    async _analyzeFolderPermissions(siteUrl, user, userGroups) {
        try {
            const foldersWithPerms = [];
            
            // Παίρνουμε όλους τους folders με unique permissions
            const uniquePermFolders = await this.spAPI.getAllFoldersWithUniquePermissions(siteUrl);
            
            for (const folder of uniquePermFolders) {
                // Ελέγχουμε αν ο χρήστης έχει permissions σε αυτόν τον folder
                const userPermissions = await this._findUserInPermissionsAsync(
                    folder.permissions,
                    user,
                    userGroups,
                    siteUrl
                );
                
                if (userPermissions.length > 0) {
                    foldersWithPerms.push({
                        siteUrl: siteUrl,
                        folderPath: folder.ServerRelativeUrl,
                        folderName: folder.Name,
                        library: folder.library,
                        permissions: userPermissions,
                        directPermissions: userPermissions.filter(p => p.isDirect),
                        inheritedPermissions: userPermissions.filter(p => !p.isDirect)
                    });
                }
            }
            
            return foldersWithPerms;
        } catch (error) {
            console.error(`Failed to analyze folders in ${siteUrl}`, error);
            return [];
        }
    }

    /**
     * Βρίσκει αν ένας χρήστης ή τα groups του έχουν permissions
     * Αυτή είναι ASYNC τώρα γιατί ελέγχει group membership
     */
    async _findUserInPermissionsAsync(roleAssignments, user, userGroups, siteUrl) {
        const foundPermissions = [];
        const userLoginName = (user.userPrincipalName || user.mail || '').toLowerCase();
        const userEmail = (user.mail || user.userPrincipalName || '').toLowerCase();
        
        for (const assignment of roleAssignments) {
            const member = assignment.Member;
            const roles = assignment.RoleDefinitionBindings.results;
            
            let isDirect = false;
            let matchedThrough = null;
            
            // Έλεγχος αν είναι ο ίδιος ο χρήστης
            const memberLogin = (member.LoginName || '').toLowerCase();
            if (memberLogin.includes(userLoginName) || memberLogin.includes(userEmail)) {
                isDirect = true;
                matchedThrough = 'Direct';
                
                foundPermissions.push({
                    principalName: member.Title,
                    principalType: getPrincipalTypeName(member.PrincipalType),
                    roles: roles.map(r => r.Name),
                    isDirect: isDirect,
                    matchedThrough: matchedThrough
                });
            }
            // Έλεγχος αν είναι μέσω SharePoint group
            else if (member.PrincipalType === PRINCIPAL_TYPES.SHAREPOINT_GROUP) {
                try {
                    // Ελέγχουμε τα members του group
                    const groupMembers = await this.spAPI.getGroupMembers(siteUrl, member.Id);
                    const isMember = groupMembers.some(m => {
                        const mLogin = (m.LoginName || '').toLowerCase();
                        const mEmail = (m.Email || '').toLowerCase();
                        return mLogin.includes(userEmail) || mEmail === userEmail || mLogin.includes(userLoginName);
                    });
                    
                    if (isMember) {
                        foundPermissions.push({
                            principalName: member.Title,
                            principalType: getPrincipalTypeName(member.PrincipalType),
                            roles: roles.map(r => r.Name),
                            isDirect: false,
                            matchedThrough: member.Title
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to check group ${member.Title}:`, err.message);
                }
            }
        }
        
        return foundPermissions;
    }
    
    /**
     * OLD - Sync version (deprecated)
     */
    _findUserInPermissions(roleAssignments, user, userGroups) {
        console.warn('Using deprecated sync _findUserInPermissions');
        return [];
    }

    /**
     * Δημιουργεί σύνοψη των permissions
     */
    _createSummary(sitePermissions, folderPermissions) {
        const totalSites = sitePermissions.length;
        const totalFolders = folderPermissions.length;
        
        // Collect all unique permission levels
        const allRoles = new Set();
        
        sitePermissions.forEach(site => {
            site.permissions.forEach(perm => {
                perm.roles.forEach(role => allRoles.add(role));
            });
        });
        
        folderPermissions.forEach(folder => {
            folder.permissions.forEach(perm => {
                perm.roles.forEach(role => allRoles.add(role));
            });
        });
        
        return {
            totalSites,
            totalFolders,
            totalLocations: totalSites + totalFolders,
            uniquePermissionLevels: Array.from(allRoles),
            sitesWithDirectAccess: sitePermissions.filter(s => 
                s.directPermissions.length > 0
            ).length,
            foldersWithDirectAccess: folderPermissions.filter(f => 
                f.directPermissions.length > 0
            ).length
        };
    }

    /**
     * Παίρνει όλους τους χρήστες με πρόσβαση σε ένα συγκεκριμένο site
     */
    async getAllUsersForSite(siteUrl) {
        try {
            const roleAssignments = await this.spAPI.getSitePermissions(siteUrl);
            const users = new Map();
            
            for (const assignment of roleAssignments) {
                const member = assignment.Member;
                const roles = assignment.RoleDefinitionBindings.results.map(r => r.Name);
                
                // Αν είναι user
                if (member.PrincipalType === PRINCIPAL_TYPES.USER) {
                    users.set(member.LoginName, {
                        name: member.Title,
                        loginName: member.LoginName,
                        type: 'User',
                        roles: roles,
                        isDirect: true
                    });
                }
                // Αν είναι group, παίρνουμε τα members
                else if (member.PrincipalType === PRINCIPAL_TYPES.SHAREPOINT_GROUP ||
                         member.PrincipalType === PRINCIPAL_TYPES.SECURITY_GROUP) {
                    try {
                        const groupMembers = await this.spAPI.getGroupMembers(siteUrl, member.Id);
                        
                        groupMembers.forEach(groupMember => {
                            if (groupMember.PrincipalType === PRINCIPAL_TYPES.USER) {
                                const existing = users.get(groupMember.LoginName);
                                
                                if (existing) {
                                    // Merge roles
                                    existing.roles = [...new Set([...existing.roles, ...roles])];
                                    existing.groups = existing.groups || [];
                                    existing.groups.push(member.Title);
                                } else {
                                    users.set(groupMember.LoginName, {
                                        name: groupMember.Title,
                                        loginName: groupMember.LoginName,
                                        email: groupMember.Email,
                                        type: 'User',
                                        roles: roles,
                                        isDirect: false,
                                        groups: [member.Title]
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        console.warn(`Failed to get members for group ${member.Title}`, error);
                    }
                }
            }
            
            return Array.from(users.values());
        } catch (error) {
            console.error('Failed to get all users for site', error);
            throw error;
        }
    }

    /**
     * Παίρνει όλους τους χρήστες με πρόσβαση σε έναν folder
     */
    async getAllUsersForFolder(siteUrl, folderPath) {
        try {
            const roleAssignments = await this.spAPI.getFolderPermissions(siteUrl, folderPath);
            
            if (!roleAssignments) {
                // Αν δεν έχει unique permissions, παίρνουμε από το parent (site)
                return await this.getAllUsersForSite(siteUrl);
            }
            
            const users = new Map();
            
            for (const assignment of roleAssignments) {
                const member = assignment.Member;
                const roles = assignment.RoleDefinitionBindings.results.map(r => r.Name);
                
                if (member.PrincipalType === PRINCIPAL_TYPES.USER) {
                    users.set(member.LoginName, {
                        name: member.Title,
                        loginName: member.LoginName,
                        type: 'User',
                        roles: roles,
                        isDirect: true
                    });
                }
                else if (member.PrincipalType === PRINCIPAL_TYPES.SHAREPOINT_GROUP ||
                         member.PrincipalType === PRINCIPAL_TYPES.SECURITY_GROUP) {
                    try {
                        const groupMembers = await this.spAPI.getGroupMembers(siteUrl, member.Id);
                        
                        groupMembers.forEach(groupMember => {
                            if (groupMember.PrincipalType === PRINCIPAL_TYPES.USER) {
                                const existing = users.get(groupMember.LoginName);
                                
                                if (existing) {
                                    existing.roles = [...new Set([...existing.roles, ...roles])];
                                    existing.groups = existing.groups || [];
                                    existing.groups.push(member.Title);
                                } else {
                                    users.set(groupMember.LoginName, {
                                        name: groupMember.Title,
                                        loginName: groupMember.LoginName,
                                        email: groupMember.Email,
                                        type: 'User',
                                        roles: roles,
                                        isDirect: false,
                                        groups: [member.Title]
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        console.warn(`Failed to get members for group ${member.Title}`, error);
                    }
                }
            }
            
            return Array.from(users.values());
        } catch (error) {
            console.error('Failed to get all users for folder', error);
            throw error;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PermissionAggregator;
}

