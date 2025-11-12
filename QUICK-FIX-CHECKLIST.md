# 🚀 Quick Fix Checklist - Site Loading Issue

## ✅ Τι Διορθώθηκε

1. ✅ Azure Storage UPSERT error (400) - Fixed
2. ✅ Site Selector loading state - Fixed  
3. ✅ Fallback σε config sites αν Graph API αποτύχει
4. ✅ Όλα τα components ενημερώθηκαν (site-permissions, folder-permissions, shared-folders, user-lookup)

## 📋 Checklist για να Δουλέψει

### 1. Ενημέρωσε το config.js (ΑΠΑΡΑΙΤΗΤΟ)

Άνοιξε το **config.js** και άλλαξε γραμμές 59-65:

```javascript
monitoredSites: [
    'https://wiz365.sharepoint.com/sites/YourActualSite1',  // ⬅️ Βάλε πραγματικό URL
    'https://wiz365.sharepoint.com/sites/YourActualSite2',  // ⬅️ Βάλε πραγματικό URL
    'https://wiz365.sharepoint.com'  // ⬅️ Ή έστω το root site
]
```

### 2. Upload τα Ενημερωμένα Αρχεία

Upload στο SharePoint (SiteAssets/SPAccess/):
- ✅ `azure-storage.js` (fixed UPSERT)
- ✅ `config.js` (με πραγματικά sites)
- ✅ `components/site-selector.js` (fixed loading)
- ✅ `components/site-permissions.js` (updated)
- ✅ `components/folder-permissions.js` (updated)
- ✅ `components/shared-folders.js` (updated)
- ✅ `components/user-permissions-lookup.js` (updated)
- ✅ `app.js` (updated)
- ✅ `index.html` (updated)
- ✅ `graph-api.js` (με getAllSites)

### 3. Test

1. Refresh την εφαρμογή (Ctrl+F5)
2. Άνοιξε Console (F12)
3. Πήγαινε στο **Sites** tab
4. Θα πρέπει να δεις sites στο dropdown!

## 🔍 Debug Commands

### Έλεγξε αν τα Sites Φορτώνουν

Άνοιξε Console (F12) και τρέξε:

```javascript
// Test 1: Έλεγξε το config
console.log('Config Sites:', CONFIG.sharepoint.monitoredSites);

// Test 2: Έλεγξε το SiteSelector
console.log('SiteSelector Default Sites:', app.components.sitePermissions.siteSelector?.defaultSites);
console.log('SiteSelector All Sites:', app.components.sitePermissions.siteSelector?.allSites);

// Test 3: Δοκίμασε να φορτώσεις sites από Graph
app.graphAPI.getAllSites({ top: 10 })
    .then(sites => {
        console.log('✅ Graph API Sites:', sites);
        sites.forEach(s => console.log(`  - ${s.displayName}: ${s.webUrl}`));
    })
    .catch(err => console.error('❌ Graph API Error:', err));
```

## 🎯 Αναμενόμενα Αποτελέσματα

### Αν Όλα Είναι OK:
```
[SiteSelector] Loaded 2 default sites from config
[SiteSelector] Loaded 15 sites from Graph API
```

### Αν Graph API Αποτυγχάνει (αλλά config sites δουλεύουν):
```
[GraphAPI] Failed to get all sites: [error]
[SiteSelector] Using 2 sites from config as fallback
```

## ⚠️ Συνηθισμένα Προβλήματα

### "Δεν βρέθηκαν sites" στο dropdown
**Αιτία:** Τα monitoredSites είναι κενά ή invalid
**Λύση:** 
```javascript
// Στο config.js, βάλε έστω το root site:
monitoredSites: [
    'https://wiz365.sharepoint.com'
]
```

### "SiteSelectorComponent is not defined"
**Αιτία:** Το site-selector.js δεν φορτώθηκε
**Λύση:** Έλεγξε το index.html - το `<script src="components/site-selector.js">` πρέπει να είναι ΠΡΙΝ τα άλλα components

### Graph API 403 Forbidden
**Αιτία:** Δεν έχεις Sites.Read.All permission
**Λύση:** Πήγαινε στο Azure AD App → API Permissions → Έλεγξε ότι έχεις Grant admin consent

## 🆘 Emergency Fallback

Αν τίποτα δεν δουλεύει, άλλαξε προσωρινά το config:

```javascript
azureStorage: {
    enabled: false  // ⬅️ Disable Azure Storage προσωρινά
}

monitoredSites: [
    'https://wiz365.sharepoint.com'  // ⬅️ Μόνο το root site
]
```

Refresh και θα πρέπει να δεις τουλάχιστον 1 site στο dropdown!

## 📞 Next Steps

1. Ενημέρωσε το `config.js` με πραγματικά sites
2. Upload όλα τα ενημερωμένα αρχεία
3. Refresh την εφαρμογή (Ctrl+F5)
4. Test το dropdown
5. Αν δουλεύει, ενεργοποίησε το Azure Storage (`enabled: true`)

---

**Χρειάζεσαι βοήθεια με κάτι συγκεκριμένο;** 😊

