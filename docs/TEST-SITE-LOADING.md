# 🧪 Test Site Loading - Debug Script

## 🔍 Τι να Κάνεις Όταν το Loading Κολλάει

### Βήμα 1: Άνοιξε Console (F12)

Πάτα **F12** και πήγαινε στο **Console** tab.

### Βήμα 2: Τρέξε αυτό το Script

Αντίγραψε και κάνε paste στο Console:

```javascript
// 🧪 Test Site Loading
(async function testSiteLoading() {
    console.clear();
    console.log('🧪 Starting Site Loading Test...\n');
    
    // Test 1: Check if app is initialized
    console.log('1️⃣ Testing App Initialization...');
    if (!window.app) {
        console.error('❌ App not initialized!');
        return;
    }
    console.log('✅ App initialized');
    
    // Test 2: Check components
    console.log('\n2️⃣ Testing Components...');
    const sitePerms = window.app.components?.sitePermissions;
    if (!sitePerms) {
        console.error('❌ SitePermissions component not found!');
        return;
    }
    console.log('✅ SitePermissions component exists');
    
    // Test 3: Check Site Selector
    console.log('\n3️⃣ Testing Site Selector...');
    const selector = sitePerms.siteSelector;
    if (!selector) {
        console.error('❌ Site Selector not initialized!');
        return;
    }
    console.log('✅ Site Selector exists');
    console.log(`   Default Sites: ${selector.defaultSites?.length || 0}`);
    console.log(`   All Sites: ${selector.allSites?.length || 0}`);
    
    // Show default sites
    if (selector.defaultSites?.length > 0) {
        console.log('\n📌 Default Sites:');
        selector.defaultSites.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.name} → ${s.url}`);
        });
    }
    
    // Test 4: Test SharePoint API με πρώτο site
    const testSiteUrl = selector.defaultSites?.[0]?.url || CONFIG.sharepoint.monitoredSites?.[0];
    
    if (!testSiteUrl || testSiteUrl.includes('YOUR_TENANT')) {
        console.error('❌ No valid site URL found!');
        console.log('⚠️ You need to update config.js with real site URLs!');
        console.log('\n💡 Example:');
        console.log('   monitoredSites: [');
        console.log('       \'https://wiz365.sharepoint.com/sites/YourSite\',');
        console.log('       \'https://wiz365.sharepoint.com\'');
        console.log('   ]');
        return;
    }
    
    console.log(`\n4️⃣ Testing SharePoint API with: ${testSiteUrl}`);
    
    try {
        // Test getSiteInfo
        console.log('   Testing getSiteInfo...');
        const siteInfo = await app.spAPI.getSiteInfo(testSiteUrl);
        console.log(`   ✅ Site Title: ${siteInfo.d?.Title}`);
        
        // Test getSitePermissions
        console.log('   Testing getSitePermissions...');
        const permissions = await app.spAPI.getSitePermissions(testSiteUrl);
        console.log(`   ✅ Found ${permissions.length} role assignments`);
        
        console.log('\n✅ ALL TESTS PASSED! 🎉');
        console.log('The site selector should work now.');
        
    } catch (error) {
        console.error('\n❌ SharePoint API Test Failed:');
        console.error('   Error:', error.message);
        console.error('   Full Error:', error);
        
        if (error.message.includes('403')) {
            console.log('\n💡 Suggestion: You don\'t have permissions to this site');
            console.log('   Try a different site URL in config.js');
        } else if (error.message.includes('404')) {
            console.log('\n💡 Suggestion: The site doesn\'t exist');
            console.log('   Check the site URL in config.js');
        } else if (error.message.includes('401')) {
            console.log('\n💡 Suggestion: Authentication issue');
            console.log('   Try logging out and back in');
        }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();
```

### Βήμα 3: Διάβασε το Output

Το script θα σου πει:
- ✅ Αν το app είναι initialized
- ✅ Αν τα components υπάρχουν
- ✅ Πόσα sites έχει load-άρει
- ✅ Αν μπορεί να κάνει API call στο SharePoint
- ❌ Ή θα σου πει τι ακριβώς πάει στραβά!

## 🎯 Αναμενόμενο Output (Success)

```
🧪 Starting Site Loading Test...

1️⃣ Testing App Initialization...
✅ App initialized

2️⃣ Testing Components...
✅ SitePermissions component exists

3️⃣ Testing Site Selector...
✅ Site Selector exists
   Default Sites: 2
   All Sites: 2

📌 Default Sites:
   1. HR → https://wiz365.sharepoint.com/sites/HR
   2. IT → https://wiz365.sharepoint.com/sites/IT

4️⃣ Testing SharePoint API with: https://wiz365.sharepoint.com/sites/HR
   Testing getSiteInfo...
   ✅ Site Title: HR Portal
   Testing getSitePermissions...
   ✅ Found 15 role assignments

✅ ALL TESTS PASSED! 🎉
```

## 🐛 Possible Error Outputs

### ❌ Error: "App not initialized"
**Αιτία:** Η εφαρμογή δεν φόρτωσε σωστά
**Λύση:** Refresh (Ctrl+F5) και ξανά-δοκίμασε

### ❌ Error: "No valid site URL found"
**Αιτία:** Τα `monitoredSites` έχουν placeholder URLs
**Λύση:** Ενημέρωσε το config.js με πραγματικά sites!

### ❌ Error: "403 Forbidden"
**Αιτία:** Δεν έχεις permissions στο site
**Λύση:** 
- Δοκίμασε με διαφορετικό site που έχεις πρόσβαση
- Ή ζήτα Site Collection Administrator permissions

### ❌ Error: "404 Not Found"
**Αιτία:** Το site δεν υπάρχει
**Λύση:** Έλεγξε το URL - πιθανόν έχει typo

### ❌ Error: "401 Unauthorized"
**Αιτία:** Token expired ή authentication issue
**Λύση:** 
- Logout και login ξανά
- Clear browser cache

## 🔧 Quick Fixes

### Fix 1: Force Hide Loading
Αν το loading κολλάει, τρέξε:
```javascript
hideLoading();
```

### Fix 2: Test με το Root Site
Στο config.js:
```javascript
monitoredSites: [
    'https://wiz365.sharepoint.com'  // Το root site πάντα δουλεύει
]
```

### Fix 3: Check Console Logs
Κοίτα το console - θα δεις αναλυτικά logs:
- "Getting site info..."
- "Site info loaded: SiteName"
- "Getting site permissions..."
- "Loaded X role assignments"

Αν κολλάει σε κάποιο βήμα, θα δεις που!

---

## 📞 Στείλε μου το Output

Τρέξε το test script και στείλε μου:
1. Το console output
2. Οποιαδήποτε error messages
3. Σε ποιο βήμα κολλάει

Και θα το λύσουμε! 😊

