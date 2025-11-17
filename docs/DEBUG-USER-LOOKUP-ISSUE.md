# 🐛 Debug Guide - User Lookup Site Filtering Issue

## 🔴 Το Πρόβλημα

Όταν επιλέγεις "kb" στο filter και κάνεις search για `m.apostolidis@wizsp.com`:
1. ❌ Φέρνει μόνο **WIZ365 (root site)** αντί για kb
2. ❌ Δεν εμφανίζει τα **39 groups**

## 🔍 Τι Προστέθηκε - Debug Logging

### Files με Logging (3):

**1. components/user-permissions-lookup.js**
```
🔵 [UserLookup] onSelectionChange called with: { sites: [...], isDefault: false }
🔍 [UserLookup] Loading permissions for user: ...
🔍 [UserLookup] this.selectedSites: [...]
🔍 [UserLookup] Passing to aggregator: [...]
```

**2. components/site-selector.js**
```
🟢 [SiteSelector] Site added: https://...
🟢 [SiteSelector] Current selectedSites: [...]
🟢 [SiteSelector] Calling onSelectionChange with: [...]
```

**3. utils/permission-aggregator.js**
```
Checking X sites: [...]
Analyzing site: https://...
✅ Found site permissions: {...}
  🔹 Permission: {...}
    ✅ Adding group: {...}
User permissions aggregation complete: { sites: X, folders: Y, groups: Z }
```

## 🧪 Test Steps

### Step 1: Upload Files (4 αρχεία με logging)

```
✅ components/user-permissions-lookup.js
✅ components/site-selector.js
✅ utils/permission-aggregator.js
✅ TEST-USER-LOOKUP-FLOW.js (optional test script)
```

### Step 2: Refresh & Open Console

```bash
Ctrl + F5  # Clear cache refresh
F12        # Open DevTools
```

### Step 3: Load Test Script (Optional)

Στο console:
```javascript
// Paste το περιεχόμενο του TEST-USER-LOOKUP-FLOW.js
// Ή κάνε copy-paste το script
```

### Step 4: Perform the Test

**Με UI:**
1. Πήγαινε στο "Αναζήτηση Χρήστη" tab
2. Γράψε "kb" στο site search
3. Κλικ στο kb site που εμφανίζεται
4. Γράψε: `m.apostolidis@wizsp.com`
5. Κλικ "Αναζήτηση"

**Παρακολούθησε το Console:**

### Step 5: Analyze Console Output

## 📊 Expected Console Flow

### ✅ SUCCESS Case:

```
🟢 [SiteSelector] Site added: https://wiz365.sharepoint.com/sites/kb
🟢 [SiteSelector] Current selectedSites: ['https://wiz365.sharepoint.com/sites/kb']
🟢 [SiteSelector] Calling onSelectionChange with: ['https://wiz365.sharepoint.com/sites/kb']

🔵 [UserLookup] onSelectionChange called with: { sites: ['https://wiz365.sharepoint.com/sites/kb'], isDefault: false }
🔵 [UserLookup] this.selectedSites updated to: ['https://wiz365.sharepoint.com/sites/kb']

// User clicks search...

🔍 [UserLookup] =====================================
🔍 [UserLookup] Loading permissions for user: m.apostolidis@wizsp.com
🔍 [UserLookup] this.selectedSites: ['https://wiz365.sharepoint.com/sites/kb']
🔍 [UserLookup] selectedSites type: object
🔍 [UserLookup] selectedSites length: 1
🔍 [UserLookup] selectedSites is array? true
🔍 [UserLookup] Passing to aggregator: ['https://wiz365.sharepoint.com/sites/kb']
🔍 [UserLookup] =====================================

Checking 1 sites: ['https://wiz365.sharepoint.com/sites/kb']
Analyzing site: https://wiz365.sharepoint.com/sites/kb
✅ Found site permissions: { siteUrl: '...kb', siteTitle: 'knowledgebase', permissions: [...] }
  🔹 Permission: { principalName: 'Membri knowledgebase', isDirect: false, matchedThrough: 'Membri knowledgebase', roles: ['Contribute'] }
    ✅ Adding group: { groupName: 'Membri knowledgebase', site: '...kb', siteName: 'knowledgebase', permissions: ['Contribute'] }
User permissions aggregation complete: { sites: 1, folders: 0, groups: 1 }
Rendering groups tab: [{ groupName: 'Membri knowledgebase', ... }]
✅ User lookup completed successfully
```

### ❌ FAILURE Case (Current):

```
// Αν δεν βλέπεις κανένα 🟢 log:
  → Site selector δεν καλείται / δεν λειτουργεί

// Αν βλέπεις 🟢 αλλά όχι 🔵:
  → onSelectionChange callback δεν καλείται

// Αν βλέπεις 🔵 αλλά selectedSites είναι []:
  → Sites δεν περνάνε σωστά από site-selector

// Αν βλέπεις:
Checking 1 sites: ['https://wiz365.sharepoint.com']
  → Χρησιμοποιεί το CONFIG.monitoredSites (fallback)
  → selectedSites ήταν null/empty

// Αν δεν βλέπεις "✅ Adding group":
  → Groups δεν match (isDirect=true ή matchedThrough='Direct')
  → Δεν είναι member του group
```

## 🔧 Troubleshooting Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| Δεν βλέπω 🟢 logs | Site selector δεν render | Check `await siteSelector.render()` |
| 🟢 logs αλλά όχι 🔵 | Callback δεν καλείται | Check `onSelectionChange` binding |
| 🔵 logs με `[]` | Sites δεν περνάνε | Check `this.selectedSites.push()` |
| Root site instead of kb | Falls back to config | Check `customSites` parameter |
| No groups | isDirect=true | Check group membership API |
| No groups | matchedThrough='Direct' | Check permission structure |

## 🎯 Diagnostic Commands

### Check Current State:
```javascript
// 1. User Lookup Component
console.log('UserLookup:', app.components.userLookup);
console.log('  selectedSites:', app.components.userLookup?.selectedSites);
console.log('  siteSelector:', app.components.userLookup?.siteSelector);

// 2. Site Selector State
console.log('SiteSelector:', app.components.userLookup?.siteSelector);
console.log('  selectedSites:', app.components.userLookup?.siteSelector?.selectedSites);
console.log('  mode:', app.components.userLookup?.siteSelector?.mode);

// 3. Config
console.log('Config monitoredSites:', CONFIG.sharepoint.monitoredSites);

// 4. Last Results
console.log('Last permissions:', app.components.userLookup?.userPermissions);
```

### Manual Test:
```javascript
// Set sites manually and test
app.components.userLookup.selectedSites = ['https://wiz365.sharepoint.com/sites/kb'];
await app.components.userLookup.loadUserPermissions('m.apostolidis@wizsp.com');
```

## 📦 What to Send Back

Μετά το test, στείλε μου:

1. **Console Output** (copy-paste όλα τα logs με 🟢🔵🔍✅)
2. **Το πρώτο error** που βλέπεις (αν υπάρχει)
3. **Τα results:**
   - Sites count
   - Groups count
   - Ποιο site URL φέρνει

## 🎊 If All Works

Αν δεις:
```
✅ Found site permissions: { siteUrl: '...kb', ... }
✅ Adding group: { groupName: 'Membri...', ... }
User permissions aggregation complete: { sites: 1, groups: 2+ }
Rendering groups tab: [2+ groups]
```

**Τότε success!** 🎉

## 📝 Next Steps Based on Results

### Scenario A: Όλα τα logs εμφανίζονται σωστά
→ Το filtering δουλεύει! Groups issue ξεχωριστό.

### Scenario B: Δεν βλέπω 🟢 logs
→ Site selector component issue. Check render().

### Scenario C: 🟢 logs αλλά όχι 🔵
→ Callback binding issue. Check onSelectionChange.

### Scenario D: Όλα ok αλλά no groups
→ Group membership issue. Check API response.

---

**Upload τα 3-4 files και τρέξε το test!**

Στείλε μου το console output για να δω τι ακριβώς συμβαίνει! 🔍

