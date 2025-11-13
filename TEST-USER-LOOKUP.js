/**
 * Test User Lookup για m.apostolidis@wizsp.com
 * Copy-paste αυτό στο Browser Console (F12)
 */

(async function testUserLookup() {
    console.clear();
    console.log('🔍 Testing User Lookup for: m.apostolidis@wizsp.com\n');
    
    const userEmail = 'm.apostolidis@wizsp.com';
    
    // Step 1: Get sites to search
    console.log('1️⃣ Getting sites to search...');
    const sitesToSearch = [
        'https://wiz365.sharepoint.com/sites/CRM',
        'https://wiz365.sharepoint.com/sites/kb'
    ];
    console.log(`   Sites: ${sitesToSearch.length}`);
    sitesToSearch.forEach(s => console.log(`   - ${s}`));
    
    // Step 2: Search for user in each site
    console.log('\n2️⃣ Searching for user permissions...\n');
    
    const userPermissions = {
        sites: [],
        folders: [],
        groups: []
    };
    
    for (const siteUrl of sitesToSearch) {
        try {
            console.log(`   Checking site: ${siteUrl}`);
            
            // Get site permissions
            const sitePerms = await app.spAPI.getSitePermissions(siteUrl);
            console.log(`   - Found ${sitePerms.length} role assignments`);
            
            // Check if user has direct access
            const userDirectAccess = sitePerms.find(p => {
                const loginName = p.Member?.LoginName || '';
                return loginName.toLowerCase().includes(userEmail.toLowerCase());
            });
            
            if (userDirectAccess) {
                console.log(`   ✅ Direct access found!`);
                const roles = userDirectAccess.RoleDefinitionBindings.results.map(r => r.Name);
                userPermissions.sites.push({
                    site: siteUrl,
                    siteName: siteUrl.split('/').pop(),
                    permissions: roles,
                    accessType: 'Direct',
                    via: null
                });
            }
            
            // Check group memberships
            const groups = await app.spAPI.getSiteGroups(siteUrl);
            console.log(`   - Checking ${groups.length} groups...`);
            
            for (const group of groups) {
                try {
                    const members = await app.spAPI.getGroupMembers(siteUrl, group.Id);
                    
                    // Check if user is in this group
                    const isMember = members.some(m => {
                        const loginName = m.LoginName || '';
                        const email = m.Email || '';
                        return loginName.toLowerCase().includes(userEmail.toLowerCase()) ||
                               email.toLowerCase() === userEmail.toLowerCase();
                    });
                    
                    if (isMember) {
                        console.log(`   ✅ Member of: ${group.Title}`);
                        
                        // Get group's permissions
                        const groupPerm = sitePerms.find(p => p.Member?.Id === group.Id);
                        if (groupPerm) {
                            const roles = groupPerm.RoleDefinitionBindings.results.map(r => r.Name);
                            
                            userPermissions.sites.push({
                                site: siteUrl,
                                siteName: siteUrl.split('/').pop(),
                                permissions: roles,
                                accessType: 'Via Group',
                                via: group.Title
                            });
                            
                            userPermissions.groups.push({
                                groupName: group.Title,
                                site: siteUrl,
                                siteName: siteUrl.split('/').pop(),
                                permissions: roles
                            });
                        }
                    }
                } catch (err) {
                    console.warn(`   ⚠️ Failed to check group ${group.Title}:`, err.message);
                }
            }
            
        } catch (error) {
            console.error(`   ❌ Error checking site ${siteUrl}:`, error.message);
        }
    }
    
    // Step 3: Results
    console.log('\n3️⃣ RESULTS:\n');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`📊 SUMMARY:`);
    console.log(`   Sites with Access: ${userPermissions.sites.length}`);
    console.log(`   Folders with Access: ${userPermissions.folders.length}`);
    console.log(`   Group Memberships: ${userPermissions.groups.length}`);
    
    if (userPermissions.sites.length > 0) {
        console.log(`\n📌 SITES:\n`);
        console.table(userPermissions.sites);
    }
    
    if (userPermissions.groups.length > 0) {
        console.log(`\n👥 GROUPS:\n`);
        console.table(userPermissions.groups);
    }
    
    if (userPermissions.sites.length === 0) {
        console.log('\n⚠️ No access found to configured sites');
        console.log('   Possible reasons:');
        console.log('   - User has access to different sites');
        console.log('   - User permissions are through nested groups');
        console.log('   - Try adding more sites to config.js');
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Test Complete!\n');
    
    return {
        summary: {
            sites: userPermissions.sites.length,
            folders: userPermissions.folders.length,
            groups: userPermissions.groups.length
        },
        details: userPermissions
    };
})();

