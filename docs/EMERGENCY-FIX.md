# 🆘 Emergency Fix - Loading Κολλάει

## ⚡ Άμεση Λύση (Τρέξε στο Console ΤΩΡΑ)

### Βήμα 1: Force Hide το Loading

Άνοιξε Console (F12) και τρέξε:

```javascript
// Force κλείσιμο του loading modal
hideLoading();

// Clear όλα τα timeouts (αν κάτι έχει κολλήσει)
for (let i = 0; i < 10000; i++) clearTimeout(i);
```

### Βήμα 2: Δοκίμασε Manual Loading

```javascript
// Test με το πρώτο site από το config
const testSite = CONFIG.sharepoint.monitoredSites[0];
console.log('Testing site:', testSite);

// Δοκίμασε να φορτώσεις manually
app.components.sitePermissions.loadSitePermissions(testSite)
    .then(() => console.log('✅ Success!'))
    .catch(err => {
        console.error('❌ Error:', err);
        hideLoading(); // Force hide αν κολλήσει
    });
```

### Βήμα 3: Έλεγξε το Console

Κοίτα το console - θα δεις ΑΚΡΙΒΩΣ που κολλάει:

**Αν δεις:**
```
Loading permissions for: https://...
Getting site info...
```
Και στάθηκε εκεί → **Το getSiteInfo() κολλάει**

**Αν δεις:**
```
Getting site info...
Site info loaded: MySite
Getting site permissions...
```
Και στάθηκε εκεί → **Το getSitePermissions() κολλάει**

## 🔍 Πιθανές Αιτίες

### 1. Invalid Site URL
**Έλεγξε:** Το site URL στο config είναι σωστό;

Τρέξε:
```javascript
console.log('Sites από config:', CONFIG.sharepoint.monitoredSites);
```

Αν δεις `YOUR_TENANT` → **Πρέπει να ενημερώσεις το config!**

### 2. Permissions Issue
**Έλεγξε:** Έχεις πρόσβαση στο site;

Τρέξε:
```javascript
// Test άμεση πρόσβαση
fetch('https://wiz365.sharepoint.com/sites/YourSite/_api/web', {
    headers: {
        'Authorization': 'Bearer ' + await app.authManager.getSharePointToken('https://wiz365.sharepoint.com'),
        'Accept': 'application/json'
    }
})
.then(r => r.json())
.then(d => console.log('✅ Site accessible:', d.d?.Title))
.catch(e => console.error('❌ Not accessible:', e));
```

### 3. Token Issue
**Λύση:**
```javascript
// Logout και login ξανά
await app.authManager.logout();
// Μετά κάνε login ξανά από το UI
```

## 🎯 Γρήγορη Διόρθωση - Update config.js

Στο **config.js** γραμμή 59, βάλε ΕΝΑ site που ΞΕΡΕΙΣ ότι υπάρχει:

```javascript
monitoredSites: [
    'https://wiz365.sharepoint.com'  // ⬅️ Το root site
]
```

Αυτό πάντα δουλεύει!

## 🔧 Upload Updated Files

Upload αυτά τα αρχεία (με τα timeout fixes):
- ✅ `components/site-permissions.js`
- ✅ `components/folder-permissions.js`
- ✅ `components/shared-folders.js`
- ✅ `azure-storage.js`

## 📋 Detailed Console Test

Τρέξε αυτό για ΠΛΗΡΗ έλεγχο:

```javascript
(async () => {
    console.clear();
    console.log('🔍 DETAILED LOADING TEST\n');
    
    // Force hide any stuck loading
    hideLoading();
    
    // Get test site
    const testSite = CONFIG.sharepoint.monitoredSites[0];
    console.log('Test Site:', testSite);
    
    if (!testSite || testSite.includes('YOUR_TENANT')) {
        console.error('❌ CONFIG ERROR: Invalid site URL!');
        console.log('Fix: Update config.js monitoredSites with real URLs');
        return;
    }
    
    // Test 1: Get Token
    console.log('\n1️⃣ Getting SharePoint token...');
    try {
        const token = await app.authManager.getSharePointToken(testSite);
        console.log('✅ Token obtained:', token.substring(0, 20) + '...');
    } catch (err) {
        console.error('❌ Token error:', err);
        return;
    }
    
    // Test 2: Get Site Info
    console.log('\n2️⃣ Getting site info...');
    try {
        const info = await app.spAPI.getSiteInfo(testSite);
        console.log('✅ Site Title:', info.d?.Title);
        console.log('   Site URL:', info.d?.Url);
    } catch (err) {
        console.error('❌ getSiteInfo error:', err.message);
        if (err.message.includes('403')) {
            console.log('💡 You don\'t have access to this site');
        } else if (err.message.includes('404')) {
            console.log('💡 Site doesn\'t exist - check URL');
        }
        return;
    }
    
    // Test 3: Get Permissions
    console.log('\n3️⃣ Getting site permissions...');
    try {
        const perms = await app.spAPI.getSitePermissions(testSite);
        console.log('✅ Permissions found:', perms.length);
        perms.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.Member?.Title} - ${p.RoleDefinitionBindings?.results?.[0]?.Name}`);
        });
    } catch (err) {
        console.error('❌ getSitePermissions error:', err.message);
        return;
    }
    
    console.log('\n✅ ALL API CALLS WORK! 🎉');
    console.log('The loading should work now.');
    console.log('\nIf loading still stuck, check:');
    console.log('1. Is hideLoading() function defined?');
    console.log('2. Any JavaScript errors in console?');
    console.log('3. Browser console errors tab?');
})();
```

## 🎯 Next Steps

1. **Τρέξε το detailed console test** (παραπάνω)
2. **Στείλε μου** το console output
3. Θα δω ΑΚΡΙΒΩΣ που κολλάει!

---

**Σημαντικό:** Με τα νέα timeout fixes, το loading θα κλείνει αυτόματα μετά από 30 δευτερόλεπτα ακόμα και αν κολλήσει! 

Upload τα updated files και θα δουλέψει! 😊

