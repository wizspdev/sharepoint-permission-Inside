# SharePoint Permissions Manager

Μια σύγχρονη web εφαρμογή για τη διαχείριση και παρακολούθηση δικαιωμάτων στο SharePoint Online.

## 🎯 Χαρακτηριστικά

### Προβολή Δικαιωμάτων
- **Site Level Permissions**: Εμφάνιση όλων των χρηστών και ομάδων με πρόσβαση σε συγκεκριμένα sites
- **Folder Level Permissions**: Εμφάνιση φακέλων με μοναδικά δικαιώματα
- **Shared Folders**: Προβολή κοινόχρηστων φακέλων και των sharing links τους
- **User Lookup**: Αναζήτηση ανά χρήστη - δείτε σε ποια sites και folders έχει πρόσβαση ένας συγκεκριμένος χρήστης

### Διαχείριση Δικαιωμάτων
- Προσθήκη/Αφαίρεση χρηστών και ομάδων
- Αλλαγή επιπέδων δικαιωμάτων (Full Control, Edit, Contribute, Read, κτλ.)
- Break/Restore permission inheritance σε φακέλους
- Real-time ενημέρωση

### Επιπλέον Λειτουργίες
- Εξαγωγή αναφορών σε CSV
- Filtering και αναζήτηση
- Responsive design για mobile και tablet
- Caching για βελτιωμένη απόδοση

## 📋 Προαπαιτούμενα

- **SharePoint Online** tenant (Microsoft 365)
- **Azure AD** με δικαιώματα δημιουργίας App Registration
- **Δικαιώματα χρήστη**: Site Collection Administrator ή Global Administrator
- **Azure Storage Account** (προαιρετικό): Για αποθήκευση προεπιλεγμένων sites

## 🚀 Γρήγορη Εγκατάσταση

### Βήμα 1: Azure AD App Registration

1. Ανοίξτε το [Azure Portal](https://portal.azure.com)
2. Μεταβείτε στο **Azure Active Directory** > **App registrations**
3. Κλικάρετε **New registration**
4. Συμπληρώστε:
   - **Name**: `SharePoint Permissions Manager`
   - **Supported account types**: Single tenant
   - **Redirect URI**: `https://your-tenant.sharepoint.com/sites/your-site/SiteAssets/SPAccess/index.html`

Για αναλυτικές οδηγίες, δείτε το [azure-setup-guide.md](azure-setup-guide.md)

### Βήμα 2: Ρύθμιση Permissions

Προσθέστε τα παρακάτω API permissions:

**Microsoft Graph:**
- `User.Read`
- `User.Read.All`
- `Group.Read.All`
- `Sites.Read.All`
- `Sites.ReadWrite.All`

**SharePoint:**
- `AllSites.Read`
- `AllSites.FullControl`
- `User.Read.All`

Κάντε **Grant admin consent** για όλα τα permissions.

### Βήμα 3: Azure Storage Setup (Προαιρετικό)

Για αποθήκευση προεπιλεγμένων sites στο cloud:

1. **Δημιουργία Storage Account**:
   - Πηγαίνετε στο [Azure Portal](https://portal.azure.com)
   - Δημιουργήστε ένα Storage Account
   - Performance: Standard
   - Redundancy: LRS (ή όπως προτιμάτε)

2. **Δημιουργία Table**:
   - Στο Storage Account, πηγαίνετε στο **Tables**
   - Δημιουργήστε table με όνομα `DefaultSites`

3. **Δημιουργία SAS Token**:
   - Πηγαίνετε στο **Shared access signature**
   - Επιλέξτε: **Table service**
   - Permissions: Read, Write, Add, Update, Delete
   - Expiry date: Επιλέξτε ημερομηνία λήξης
   - Κλικάρετε **Generate SAS and connection string**
   - Αντιγράψτε το **SAS token** (το τμήμα μετά το `?`)

### Βήμα 4: Configuration

Επεξεργαστείτε το αρχείο `config.js` και ενημερώστε:

```javascript
const CONFIG = {
    auth: {
        clientId: 'YOUR_CLIENT_ID_HERE',
        authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID_HERE',
        redirectUri: 'https://YOUR_TENANT.sharepoint.com/sites/YOUR_SITE/SiteAssets/SPAccess/index.html'
    },
    sharepoint: {
        tenantName: 'YOUR_TENANT_NAME',
        monitoredSites: [
            'https://YOUR_TENANT.sharepoint.com/sites/Site1',
            'https://YOUR_TENANT.sharepoint.com/sites/Site2',
            // Προσθέστε περισσότερα sites
        ]
    },
    // Azure Storage (προαιρετικό)
    azureStorage: {
        accountName: 'YOUR_STORAGE_ACCOUNT_NAME',
        tableName: 'DefaultSites',
        sasToken: 'YOUR_SAS_TOKEN_HERE',
        enabled: true  // Set σε false αν δεν θέλετε Azure Storage
    }
};
```

### Βήμα 5: Upload στο SharePoint

1. Μεταβείτε στο SharePoint site σας
2. Ανοίξτε το **Site Contents**
3. Επιλέξτε **Site Assets** library (ή δημιουργήστε ένα νέο Document Library με όνομα `SPAccess`)
4. Upload όλα τα αρχεία της εφαρμογής:
   ```
   SPAccess/
   ├── index.html
   ├── app.js
   ├── auth.js
   ├── sp-api.js
   ├── graph-api.js
   ├── config.js
   ├── styles.css
   ├── utils/
   │   ├── constants.js
   │   ├── helpers.js
   │   └── permission-aggregator.js
   └── components/
       ├── site-permissions.js
       ├── folder-permissions.js
       ├── shared-folders.js
       ├── user-permissions-lookup.js
       ├── user-selector.js
       └── permission-modal.js
   ```

### Βήμα 6: Πρόσβαση στην Εφαρμογή

Ανοίξτε το browser και μεταβείτε στο:
```
https://YOUR_TENANT.sharepoint.com/sites/YOUR_SITE/SiteAssets/SPAccess/index.html
```

## 📖 Οδηγός Χρήσης

### Διαχείριση Προεπιλεγμένων Sites

Η νέα λειτουργικότητα επιτρέπει:
- **Αποθήκευση Default Sites**: Ορίστε τα sites που χρησιμοποιείτε συχνότερα
- **Site Selector με Autocomplete**: Αναζητήστε και επιλέξτε sites εύκολα
- **Φιλτράρισμα**: Χρησιμοποιήστε την επιλογή "Προεπιλεγμένα" για γρήγορη πρόσβαση

#### Ρύθμιση Default Sites:
1. Μεταβείτε στο tab **Ρυθμίσεις**
2. Κλικάρετε **Προσθήκη Site**
3. Αναζητήστε ή εισάγετε το URL του site
4. Κλικάρετε **Αποθήκευση**

Τα default sites αποθηκεύονται στο Azure Storage (αν έχει ρυθμιστεί) ή τοπικά στον browser.

### Προβολή Site Permissions

1. Κλικάρετε στο tab **Sites**
2. Επιλέξτε ένα site από το dropdown
3. Θα εμφανιστούν όλοι οι χρήστες/ομάδες με τα δικαιώματά τους
4. Χρησιμοποιήστε το search box για αναζήτηση

**Ενέργειες:**
- 🔵 **Edit**: Αλλαγή επιπέδου δικαιώματος
- 🔴 **Remove**: Αφαίρεση δικαιώματος
- 🟢 **Add Permission**: Προσθήκη νέου χρήστη/ομάδας

### Διαχείριση Folder Permissions

1. Κλικάρετε στο tab **Φάκελοι**
2. Επιλέξτε ένα site
3. Θα εμφανιστούν οι φάκελοι με μοναδικά δικαιώματα
4. Κλικάρετε σε έναν φάκελο για να δείτε λεπτομέρειες

**Ενέργειες:**
- 🔒 **Break Inheritance**: Διακοπή κληρονομικότητας
- 🔓 **Restore Inheritance**: Επαναφορά κληρονομικότητας
- ➕ **Add Permission**: Προσθήκη δικαιώματος

### Κοινόχρηστοι Φάκελοι

1. Κλικάρετε στο tab **Κοινόχρηστοι Φάκελοι**
2. Επιλέξτε ένα site
3. Εμφανίζονται οι φάκελοι με sharing links
4. Κλικάρετε **Λεπτομέρειες** για περισσότερες πληροφορίες

### Αναζήτηση Χρήστη (User Lookup)

Αυτή η λειτουργία σας επιτρέπει να δείτε **ανά χρήστη** σε ποια sites και folders έχει πρόσβαση.

1. Κλικάρετε στο tab **Αναζήτηση Χρήστη**
2. **(Προαιρετικό)** Επιλέξτε sites για φιλτράρισμα
3. Εισάγετε το email του χρήστη
4. Κλικάρετε **Αναζήτηση**
5. Θα εμφανιστούν:
   - Όλα τα sites με πρόσβαση
   - Όλοι οι φάκελοι με μοναδικά δικαιώματα
   - Οι ομάδες στις οποίες ανήκει
   - Αν η πρόσβαση είναι άμεση ή μέσω ομάδας

## 🏗️ Αρχιτεκτονική

### Frontend
- Pure HTML/CSS/JavaScript (No framework dependencies)
- Bootstrap 5 για UI
- Bootstrap Icons

### Authentication
- MSAL.js 2.x για Azure AD authentication
- Token management με caching

### APIs
- **SharePoint REST API**: Για site/folder permissions
- **Microsoft Graph API**: Για user/group information και site discovery
- **Azure Table Storage REST API**: Για αποθήκευση default sites (προαιρετικό)

### Components
```
├── AuthManager: Authentication & token management
├── SharePointAPI: SharePoint REST API client
├── GraphAPI: Microsoft Graph API client (με enhanced site discovery)
├── AzureStorageClient: Azure Table Storage client
├── PermissionAggregator: Aggregation logic για user permissions
└── UI Components:
    ├── SitePermissionsComponent (με multi-site support)
    ├── FolderPermissionsComponent
    ├── SharedFoldersComponent
    ├── UserPermissionsLookupComponent (με site filtering)
    ├── SiteSelectorComponent (νέο - reusable με autocomplete)
    ├── SettingsComponent (νέο - διαχείριση default sites)
    ├── UserSelectorComponent
    └── PermissionModalComponent
```

## 🔧 Configuration

Το αρχείο `config.js` περιέχει όλες τις ρυθμίσεις:

```javascript
{
    // Azure AD settings
    auth: { ... },
    
    // SharePoint settings
    sharepoint: {
        monitoredSites: [...], // Sites προς παρακολούθηση
        ...
    },
    
    // App settings
    app: {
        pageSize: 50,           // Εγγραφές ανά σελίδα
        cacheTimeout: 300000,   // Cache timeout (5 min)
        logLevel: 'info',       // Logging level
        debugMode: true         // Debug mode
    },
    
    // UI settings
    ui: {
        theme: 'light',
        defaultTab: 'sites',
        language: 'el'          // 'el' ή 'en'
    }
}
```

## 📊 Export Δεδομένων

Μπορείτε να εξάγετε αναφορές σε CSV format από:
- Site permissions
- Folder permissions
- User lookup results

Το exported αρχείο περιέχει:
- Χρήστες/Ομάδες
- Δικαιώματα
- Τύπο πρόσβασης (άμεση/μέσω ομάδας)
- Timestamps

## 🔐 Security Best Practices

1. **Μην αποθηκεύετε secrets στον κώδικα**: Η εφαρμογή χρησιμοποιεί implicit flow χωρίς client secret
2. **Περιορίστε τα δικαιώματα**: Δώστε πρόσβαση μόνο σε authorized users
3. **Monitor audit logs**: Παρακολουθείτε τα Azure AD logs
4. **Regular reviews**: Κάντε review των permissions τακτικά
5. **Use HTTPS**: Πάντα να τρέχει η εφαρμογή μέσω HTTPS

## 🐛 Troubleshooting

### Error: AADSTS650053 - App needs permission
**Λύση**: Κάντε "Grant admin consent" στο Azure Portal

### Error: AADSTS500113 - No reply address registered
**Λύση**: Ελέγξτε ότι το Redirect URI στο Azure AD ταιριάζει ακριβώς με το URL

### Δεν φορτώνουν τα sites
**Λύση**:
- Ελέγξτε τα API permissions
- Βεβαιωθείτε ότι έχει γίνει admin consent
- Δείτε το Console για errors

### CORS Errors
**Λύση**: Βεβαιωθείτε ότι τρέχει από SharePoint domain και όχι τοπικά

## 📝 Changelog

### Version 1.1.0 (2025-11-13)
- ✨ **Azure Storage Integration**: Αποθήκευση default sites στο cloud
- 🔍 **Enhanced Site Discovery**: Αυτόματη φόρτωση όλων των SharePoint sites
- 🎯 **SiteSelectorComponent**: Reusable component με autocomplete
- ⚙️ **Settings Panel**: UI για διαχείριση default sites
- 🎨 **Multi-site Support**: Προβολή permissions από πολλά sites ταυτόχρονα
- 🔧 **Site Filtering**: Φιλτράρισμα user lookup ανά site

### Version 1.0.0 (2025-11-12)
- ✨ Initial release
- 🎯 Site permissions viewer και editor
- 📁 Folder permissions management
- 🔗 Shared folders explorer
- 👤 User permissions lookup (reverse lookup)
- 📤 Export functionality
- 🎨 Modern UI με Bootstrap 5

## 🤝 Support

Για ερωτήσεις, issues ή suggestions:
- Δημιουργήστε ένα issue στο repository
- Συμβουλευτείτε το [azure-setup-guide.md](azure-setup-guide.md) για λεπτομέρειες setup

## 📄 License

Αυτό το project είναι ελεύθερο για χρήση και τροποποίηση.

## 🙏 Acknowledgments

- Microsoft MSAL.js
- Bootstrap Framework
- Bootstrap Icons
- SharePoint REST API
- Microsoft Graph API

---

**Δημιουργήθηκε με ❤️ για τη διαχείριση SharePoint permissions**

