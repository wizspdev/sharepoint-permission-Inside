/**
 * TEST SCRIPT - User Lookup Flow με Site Filtering
 * Τρέξε αυτό στο console ΠΡΙΝ κάνεις το actual test
 */

console.log('🧪 ========================================');
console.log('🧪 TEST: User Lookup Flow');
console.log('🧪 ========================================');

// 1. Check initial state
console.log('\n📋 Step 1: Check Initial State');
console.log('  app.components.userLookup:', app.components.userLookup);
console.log('  selectedSites:', app.components.userLookup?.selectedSites);
console.log('  siteSelector:', app.components.userLookup?.siteSelector);

// 2. Check config
console.log('\n📋 Step 2: Check Config');
console.log('  monitoredSites:', CONFIG.sharepoint.monitoredSites);
console.log('  ⚠️  If this shows only root site, that\'s the fallback!');

// 3. Test function for manual testing
window.testUserLookupFlow = async function(email, siteUrls) {
    console.log('\n🧪 ========================================');
    console.log('🧪 MANUAL TEST: User Lookup');
    console.log('🧪 ========================================');
    console.log('📧 Email:', email);
    console.log('🌐 Sites:', siteUrls);
    
    try {
        // Set selected sites
        if (app.components.userLookup) {
            console.log('\n🔧 Setting selectedSites...');
            app.components.userLookup.selectedSites = siteUrls || [];
            console.log('  selectedSites set to:', app.components.userLookup.selectedSites);
            
            // Run search
            console.log('\n🔍 Running search...');
            await app.components.userLookup.loadUserPermissions(email);
            
            console.log('\n✅ Search complete!');
            console.log('  Results:', app.components.userLookup.userPermissions);
        } else {
            console.error('❌ userLookup component not found!');
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// 4. Instructions
console.log('\n📝 ========================================');
console.log('📝 MANUAL TEST INSTRUCTIONS');
console.log('📝 ========================================');
console.log('\nΕπιλογή 1 - Με UI (Recommended):');
console.log('  1. Πήγαινε στο "Αναζήτηση Χρήστη" tab');
console.log('  2. Γράψε "kb" στο search box του site selector');
console.log('  3. Κλικ στο site "kb"');
console.log('  4. Γράψε email: m.apostolidis@wizsp.com');
console.log('  5. Κλικ "Αναζήτηση"');
console.log('  6. Παρακολούθησε το console για logs:');
console.log('     - 🟢 [SiteSelector] Site added: ...');
console.log('     - 🔵 [UserLookup] onSelectionChange called...');
console.log('     - 🔍 [UserLookup] Loading permissions...');
console.log('     - Checking X sites: [...]');
console.log('     - ✅ Found site permissions...');
console.log('     - ✅ Adding group: ...');
console.log('\nΕπιλογή 2 - Με Console (Για debug):');
console.log('  testUserLookupFlow(');
console.log('    "m.apostolidis@wizsp.com",');
console.log('    ["https://wiz365.sharepoint.com/sites/kb"]');
console.log('  );');
console.log('\n📊 Expected Results:');
console.log('  - Sites: 1 (μόνο kb)');
console.log('  - Groups: 1+ (SharePoint groups από kb)');
console.log('  - NO errors about WIZ365 root site');
console.log('\n🐛 If you see "Checking 1 sites: [root]":');
console.log('  - selectedSites is empty/null');
console.log('  - Falls back to CONFIG.sharepoint.monitoredSites');
console.log('  - Check the 🔵 logs to see what happened');

console.log('\n✅ Test script loaded! Ready to debug!');

