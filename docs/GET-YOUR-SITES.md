# Πώς να Βρεις τα SharePoint Site URLs σου

## 🔍 Μέθοδος 1: Χρήση Console (ΓΡΗΓΟΡΗ)

Αντίγραψε αυτό στο **Browser Console** (F12):

```javascript
// Δοκίμασε πρώτα αυτό για να πάρεις τα sites
(async function getSites() {
    try {
        console.log('🔍 Φόρτωση sites από Graph API...');
        
        const token = await app.authManager.getGraphToken();
        const response = await fetch('https://graph.microsoft.com/v1.0/sites?$select=id,name,displayName,webUrl&$top=50', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        const sites = data.value || [];
        
        console.log(`\n✅ Βρέθηκαν ${sites.length} sites:\n`);
        console.log('Αντίγραψε αυτά τα URLs στο config.js -> monitoredSites:\n');
        
        sites
            .filter(s => s.webUrl && !s.webUrl.includes('/personal/'))
            .forEach((site, i) => {
                console.log(`${i + 1}. ${site.displayName || site.name}`);
                console.log(`   '${site.webUrl}',`);
            });
        
        // Return για copy-paste
        const urls = sites
            .filter(s => s.webUrl && !s.webUrl.includes('/personal/'))
            .map(s => s.webUrl);
        
        console.log('\n📋 Copy-paste ready format:');
        console.log('monitoredSites: [');
        urls.forEach(url => console.log(`    '${url}',`));
        console.log(']');
        
        return urls;
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Εναλλακτικά, πήγαινε στο SharePoint και αντίγραψε το URL από τον browser!');
    }
})();
```

## 📋 Μέθοδος 2: Από SharePoint Manually

### Option A: SharePoint Home
1. Πήγαινε στο: `https://wiz365.sharepoint.com`
2. Κλικάρε **Sites** στο αριστερό μενού
3. Θα δεις λίστα με όλα τα sites
4. Κλικάρε σε κάθε site και αντίγραψε το URL

### Option B: Από οποιοδήποτε Site
1. Άνοιξε ένα SharePoint site
2. Το URL θα είναι κάτι σαν: `https://wiz365.sharepoint.com/sites/ProjectName`
3. Αντίγραψέ το

### Option C: SharePoint Admin Center
1. Πήγαινε στο: `https://wiz365-admin.sharepoint.com/_layouts/15/online/SiteCollections.aspx`
2. Θα δεις όλα τα sites σου με URLs

## ✏️ Παράδειγμα Ενημέρωσης

Άνοιξε το **config.js** και άλλαξε:

### ❌ ΠΡΙΝ (με placeholders):
```javascript
monitoredSites: [
    'https://YOUR_TENANT.sharepoint.com/sites/Site1',
    'https://YOUR_TENANT.sharepoint.com/sites/Site2',
    'https://YOUR_TENANT.sharepoint.com/sites/Site3'
]
```

### ✅ ΜΕΤΑ (με πραγματικά URLs):
```javascript
monitoredSites: [
    'https://wiz365.sharepoint.com/sites/HR',
    'https://wiz365.sharepoint.com/sites/IT',
    'https://wiz365.sharepoint.com/sites/Finance',
    'https://wiz365.sharepoint.com/sites/Projects',
    'https://wiz365.sharepoint.com'  // Root site (optional)
]
```

## 🚀 Μετά την Ενημέρωση

1. **Save** το config.js
2. **Upload** το ενημερωμένο config.js στο SharePoint
3. **Refresh** την εφαρμογή στον browser
4. Τα sites θα εμφανιστούν αμέσως στο dropdown!

## 🔧 Αν Δεν Ξέρεις τα Site URLs

Απλά βάλε **έστω ένα** που ξέρεις σίγουρα:

```javascript
monitoredSites: [
    'https://wiz365.sharepoint.com'  // Το root site πάντα υπάρχει
]
```

Μετά μπορείς να προσθέσεις περισσότερα από το **Settings** tab της εφαρμογής!

---

**Next Steps:**
1. Ενημέρωσε το config.js
2. Upload στο SharePoint  
3. Refresh την εφαρμογή
4. Profit! 🎉

