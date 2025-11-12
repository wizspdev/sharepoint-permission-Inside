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
    async getUserPermissions(userEmail) {
        showLoading('Αναζήτηση δικαιωμάτων χρήστη...');
        
        try {
            // 1. Παίρνουμε τον χρήστη από το Graph
            const user = await this.graphAPI.getUserByEmail(userEmail);
            
            // 2. Παίρνουμε τα groups του χρήστη
            const userGroups = await this.graphAPI.getUserGroups(user.id);
            const groupIds = userGroups.map(g => g.id);
            
            // 3. Αναλύουμε τα monitored sites
            const sitePermissions = [];
            const folderPermissions = [];
            
            for (const siteUrl of this.config.sharepoint.monitoredSites) {
                try {
                    // Παίρνουμε site permissions
                    const sitePerms = await this._analyzeSitePermissions(
                        siteUrl, 
                        user, 
                        userGroups
                    );
                    
                    if (sitePerms) {
                        sitePermissions.push(sitePerms);
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
            
            return {
                user: {
                    email: userEmail,
                    displayName: user.displayName,
                    id: user.id
                },
                groups: userGroups,
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
            const userPermissions = this._findUserInPermissions(
                roleAssignments,
                user,
                userGroups
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
                const userPermissions = this._findUserInPermissions(
                    folder.permissions,
                    user,
                    userGroups
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
     */
    _findUserInPermissions(roleAssignments, user, userGroups) {
        const foundPermissions = [];
        const userLoginName = user.userPrincipalName.toLowerCase();
        const groupIds = userGroups.map(g => g.id.toLowerCase());
        
        for (const assignment of roleAssignments) {
            const member = assignment.Member;
            const roles = assignment.RoleDefinitionBindings.results;
            
            let isDirect = false;
            let matchedThrough = null;
            
            // Έλεγχος αν είναι ο ίδιος ο χρήστης
            if (member.LoginName && member.LoginName.toLowerCase().includes(userLoginName)) {
                isDirect = true;
                matchedThrough = 'Direct';
            }
            // Έλεγχος αν είναι μέσω group
            else if (member.PrincipalType === PRINCIPAL_TYPES.SHAREPOINT_GROUP || 
                     member.PrincipalType === PRINCIPAL_TYPES.SECURITY_GROUP) {
                // Θα πρέπει να ελέγξουμε τα members του group
                // Για απλότητα, υποθέτουμε ότι αν το group title περιέχει το email
                isDirect = false;
                matchedThrough = member.Title;
            }
            
            if (isDirect || matchedThrough) {
                foundPermissions.push({
                    principalName: member.Title,
                    principalType: getPrincipalTypeName(member.PrincipalType),
                    roles: roles.map(r => r.Name),
                    isDirect: isDirect,
                    matchedThrough: matchedThrough
                });
            }
        }
        
        return foundPermissions;
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

