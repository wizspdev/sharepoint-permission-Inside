# Azure AD App Registration - Οδηγός Εγκατάστασης

Αυτός ο οδηγός θα σας βοηθήσει να δημιουργήσετε μια Azure AD App Registration για την εφαρμογή SharePoint Permissions Manager.

## Προαπαιτούμενα

- Πρόσβαση στο Azure Portal με δικαιώματα Application Administrator ή Global Administrator
- SharePoint Online tenant
- Δικαιώματα δημιουργίας App Registration στο Azure AD

## Βήμα 1: Δημιουργία App Registration

1. Συνδεθείτε στο [Azure Portal](https://portal.azure.com)
2. Μεταβείτε στο **Azure Active Directory** > **App registrations**
3. Κλικάρετε **New registration**
4. Συμπληρώστε τα παρακάτω:
   - **Name**: `SharePoint Permissions Manager`
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URI: `https://[your-tenant].sharepoint.com/sites/[your-site]/SiteAssets/SPAccess/index.html`

5. Κλικάρετε **Register**

## Βήμα 2: Σημειώστε τα Application Settings

Μετά τη δημιουργία, σημειώστε τα παρακάτω από την σελίδα Overview:

- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Βήμα 3: Ρύθμιση Authentication

1. Από το μενού, επιλέξτε **Authentication**
2. Στο τμήμα **Implicit grant and hybrid flows**, ενεργοποιήστε:
   - ✅ **ID tokens** (used for implicit and hybrid flows)
3. Στο τμήμα **Advanced settings**:
   - **Allow public client flows**: `No`
4. Κλικάρετε **Save**

## Βήμα 4: Προσθήκη API Permissions

### Microsoft Graph Permissions

1. Μεταβείτε στο **API permissions**
2. Κλικάρετε **Add a permission**
3. Επιλέξτε **Microsoft Graph**
4. Επιλέξτε **Delegated permissions**
5. Προσθέστε τα παρακάτω permissions:
   - `Sites.Read.All` - Για ανάγνωση site information
   - `Sites.ReadWrite.All` - Για τροποποίηση permissions
   - `User.Read.All` - Για ανάγνωση user information
   - `Group.Read.All` - Για ανάγνωση group information
   - `User.Read` - Για το profile του συνδεδεμένου χρήστη

### SharePoint Permissions

1. Κλικάρετε ξανά **Add a permission**
2. Επιλέξτε **SharePoint**
3. Επιλέξτε **Delegated permissions**
4. Προσθέστε τα παρακάατω:
   - `AllSites.Read` - Για ανάγνωση όλων των sites
   - `AllSites.FullControl` - Για πλήρη έλεγχο (τροποποίηση permissions)
   - `User.Read.All` - Για ανάγνωση χρηστών

5. Κλικάρετε **Add permissions**

## Βήμα 5: Grant Admin Consent

⚠️ **Σημαντικό**: Τα παραπάνω permissions απαιτούν admin consent.

1. Στη σελίδα **API permissions**, κλικάρετε **Grant admin consent for [Your Organization]**
2. Επιβεβαιώστε κλικάροντας **Yes**
3. Βεβαιωθείτε ότι όλα τα permissions έχουν πράσινο checkmark στη στήλη **Status**

## Βήμα 6: Ρύθμιση Configuration File

Αντιγράψτε τα στοιχεία σας στο αρχείο `config.js`:

```javascript
const CONFIG = {
    auth: {
        clientId: 'YOUR_CLIENT_ID_HERE',
        authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID_HERE',
        redirectUri: 'https://YOUR_TENANT.sharepoint.com/sites/YOUR_SITE/SiteAssets/SPAccess/index.html'
    },
    sharepoint: {
        // Προσθέστε τα sites που θέλετε να παρακολουθείτε
        monitoredSites: [
            'https://YOUR_TENANT.sharepoint.com/sites/Site1',
            'https://YOUR_TENANT.sharepoint.com/sites/Site2',
            'https://YOUR_TENANT.sharepoint.com/sites/Site3'
        ]
    }
};
```

## Βήμα 7: Upload στο SharePoint

1. Μεταβείτε στο SharePoint site σας
2. Δημιουργήστε ένα **Document Library** με όνομα `SPAccess` (ή χρησιμοποιήστε το `SiteAssets`)
3. Upload όλα τα αρχεία της εφαρμογής
4. Ενημερώστε το `config.js` με τα στοιχεία σας

## Βήμα 8: Δοκιμή

1. Ανοίξτε το `index.html` στον browser:
   `https://YOUR_TENANT.sharepoint.com/sites/YOUR_SITE/SiteAssets/SPAccess/index.html`
2. Θα σας ζητηθεί να κάνετε login
3. Αποδεχτείτε τα permissions που ζητάει η εφαρμογή
4. Αν όλα είναι σωστά, θα δείτε το dashboard της εφαρμογής

## Troubleshooting

### Error: AADSTS650053 - App needs permission

**Λύση**: Βεβαιωθείτε ότι έχετε κάνει **Grant admin consent** στο Azure Portal.

### Error: AADSTS500113 - No reply address registered

**Λύση**: Ελέγξτε ότι το **Redirect URI** στο Azure AD ταιριάζει ακριβώς με το URL του `index.html`.

### Δεν φορτώνουν τα sites

**Λύση**: 
- Ελέγξτε ότι έχετε προσθέσει τα σωστά permissions (Sites.Read.All, AllSites.Read)
- Βεβαιωθείτε ότι έχει γίνει admin consent
- Ελέγξτε το Console για errors

### CORS Errors

**Λύση**: Βεβαιωθείτε ότι η εφαρμογή τρέχει από το SharePoint domain και όχι τοπικά (file://).

## Security Best Practices

1. **Μην αποθηκεύσετε ποτέ secrets στον κώδικα**: Η εφαρμογή χρησιμοποιεί MSAL.js με implicit flow που δεν απαιτεί client secret
2. **Περιορίστε τα δικαιώματα**: Δώστε δικαιώματα μόνο σε authorized users
3. **Monitor audit logs**: Παρακολουθείτε τα Azure AD audit logs για suspicious activity
4. **Regular reviews**: Κάντε review των permissions τακτικά

## Πρόσθετοι Πόροι

- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [SharePoint REST API Reference](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- [Microsoft Graph API Reference](https://docs.microsoft.com/en-us/graph/api/overview)

