# 🔧 User Lookup Fixes - Site Filtering & Groups Display

## 🐛 Προβλήματα που Βρέθηκαν (από Screenshot)

1. ❌ **Wrong Site:** Επέλεξες "kb" αλλά έφερνε "WIZ365" (root site)
2. ❌ **Groups Tab:** Έδειχνε "39 Ομάδες" αλλά δεν render-άρονταν

## ✅ Fixes που Έγιναν

### Fix #1: Site Filtering
**Αρχείο:** `utils/permission-aggregator.js`

**Πριν:**
```javascript
async getUserPermissions(userEmail) {
    // Χρησιμοποιούσε πάντα monitoredSites από config
    for (const siteUrl of this.config.sharepoint.monitoredSites) {
```

**Μετά:**
```javascript
async getUserPermissions(userEmail, customSites = null) {
    // Χρησιμοποιεί custom sites αν υπάρχουν (filtering)
    const sitesToCheck = customSites && customSites.length > 0 
        ? customSites 
        : this.config.sharepoint.monitoredSites;
    
    console.log(`Checking ${sitesToCheck.length} sites:`, sitesToCheck);
```

### Fix #2: Pass Selected Sites
**Αρχείο:** `components/user-permissions-lookup.js`

**Προστέθηκε:**
```javascript
this.userPermissions = await this.permissionAggregator.getUserPermissions(
    email,
    this.selectedSites && this.selectedSites.length > 0 ? this.selectedSites : null
);
```

Τώρα αν επιλέξεις "kb" στο filter, θα ψάξει ΜΟΝΟ στο kb!

### Fix #3: Groups Rendering
**Αρχείο:** `components/user-permissions-lookup.js`

**Πριν:**
```javascript
// Προσπαθούσε να render groups με displayName (Azure AD format)
${escapeHtml(group.displayName)}
```

**Μετά:**
```javascript
// Table με SharePoint groups
<table>
  <thead>
    <tr>
      <th>Ομάδα</th>
      <th>Site</th>
      <th>Δικαιώματα</th>
    </tr>
  </thead>
  <tbody>
    ${groups.map(g => `
      <tr>
        <td>${g.groupName}</td>
        <td>${g.siteName}</td>
        <td>${permission badges}</td>
      </tr>
    `)}
  </tbody>
</table>
```

### Fix #4: Proper Group Membership Check
**Αρχείο:** `utils/permission-aggregator.js`

**Πριν:**
```javascript
// Υπέθετε ότι είναι member αν ήταν group (ΛΑΘΟΣ!)
if (member.PrincipalType === SHAREPOINT_GROUP) {
    matchedThrough = member.Title; // Χωρίς έλεγχο!
}
```

**Μετά:**
```javascript
// Ελέγχει ΠΡΑΓΜΑΤΙΚΑ τα group members
if (member.PrincipalType === SHAREPOINT_GROUP) {
    const groupMembers = await this.spAPI.getGroupMembers(siteUrl, member.Id);
    const isMember = groupMembers.some(m => 
        m.Email === userEmail || m.LoginName.includes(userEmail)
    );
    
    if (isMember) {  // ΜΟΝΟ αν είναι member!
        matchedThrough = member.Title;
    }
}
```

### Fix #5: Collect SharePoint Groups
**Αρχείο:** `utils/permission-aggregator.js`

**Προστέθηκε:**
```javascript
const allGroups = [];

// Για κάθε site permission που matched
if (sitePerms) {
    sitePerms.permissions.forEach(perm => {
        if (!perm.isDirect && perm.matchedThrough) {
            allGroups.push({
                groupName: perm.matchedThrough,
                site: siteUrl,
                siteName: sitePerms.siteTitle,
                permissions: perm.roles
            });
        }
    });
}

return {
    groups: allGroups  // SharePoint groups με permissions
};
```

### Fix #6: Timeout Protection
**Αρχείο:** `components/user-permissions-lookup.js`

**Προστέθηκε:**
```javascript
const timeoutId = setTimeout(() => {
    hideLoading();
    showNotification('Η αναζήτηση πήρε πολύ ώρα', 'error');
}, 60000);

// ... code ...

clearTimeout(timeoutId);
```

## 🎯 Πώς θα Δουλεύει Τώρα

### Scenario 1: Με Site Filtering (kb)
1. Επιλέγεις "kb" στο filter
2. Γράφεις "m.apostolidis@wizsp.com"
3. Κλικ "Αναζήτηση"
4. **Αποτέλεσμα:** Μόνο permissions από kb site!

**Console Output:**
```
Checking 1 sites: ['https://wiz365.sharepoint.com/sites/kb']
Analyzing site: https://wiz365.sharepoint.com/sites/kb
Found X sites, Y folders, Z groups
✅ User lookup completed
```

### Scenario 2: Χωρίς Filtering
1. Αφήνεις κενό το filter
2. Γράφεις email
3. **Αποτέλεσμα:** Όλα τα sites από config!

**Console Output:**
```
Checking 2 sites: [root site + CRM + kb]
✅ Βρέθηκαν 3 sites
```

### Scenario 3: Groups Tab
**Πριν:**
- 39 groups αλλά δεν φαίνονταν

**Τώρα:**
- Table με columns: Ομάδα | Site | Δικαιώματα
- Κάθε group με badge για permissions
- Sorted by group name

## 📦 Updated Files

Upload αυτά για τα fixes:
```
✅ utils/permission-aggregator.js (site filtering + group checking)
✅ components/user-permissions-lookup.js (pass selected sites + render groups)
```

## 🧪 Testing Steps

1. **Upload** τα 2 updated files
2. **Refresh** την εφαρμογή
3. **Πήγαινε στο "Αναζήτηση Χρήστη"** tab
4. **Επίλεξε "kb"** στο site filter
5. **Γράψε:** m.apostolidis@wizsp.com
6. **Κλικ "Αναζήτηση"**

### Αναμενόμενα Αποτελέσματα:

**Summary Cards:**
- Sites: 1 (μόνο kb, όχι root!)
- Φάκελοι: 0 ή περισσότερα
- Ομάδες: Αριθμός SharePoint groups στο kb που ανήκει

**Sites Tab:**
- Μόνο kb site entries
- Permissions με badges
- "Via Group" indicators

**Groups Tab:**
- ✅ Table με όλα τα groups
- Columns: Ομάδα, Site, Δικαιώματα
- Π.χ. "Membri knowledgebase", "Proprietari knowledgebase", κλπ.

## 🔍 Console Debugging

Κοίτα το console για:
```
Loading permissions for user: m.apostolidis@wizsp.com
Selected sites for filtering: ['https://wiz365.sharepoint.com/sites/kb']
Checking 1 sites: [....]
Analyzing site: https://wiz365.sharepoint.com/sites/kb
Checking group: Membri knowledgebase
  ✅ User is member!
User permissions aggregation complete: { sites: 1, folders: 0, groups: X }
✅ User lookup completed successfully
```

---

**Τώρα το filtering θα δουλεύει σωστά και τα groups θα εμφανίζονται!** 🎉

Upload τα αρχεία και δοκίμασε ξανά!

