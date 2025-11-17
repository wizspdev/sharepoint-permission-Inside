# Οδηγός Deployment για SharePoint Permissions Manager

## ⚠️ Πρόβλημα: SharePoint Document Library

Το SharePoint **δεν εκτελεί HTML αρχεία** από Document Libraries για λόγους ασφαλείας. Αντί να ανοίξει το `index.html`, το κατεβάζει.

## ✅ Λύσεις Deployment

### Λύση 1: Azure Static Web Apps (Προτεινόμενη) 🌟

Κάντε host την εφαρμογή στο Azure Static Web Apps (δωρεάν tier).

#### Βήματα:

1. **Δημιουργία Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Δημιουργία Static Web App**
   - Πηγαίνετε στο [Azure Portal](https://portal.azure.com)
   - **Create Resource** → **Static Web App**
   - Συνδέστε το GitHub repository σας
   - Build Presets: **Custom**
   - App location: `/`
   - Output location: ` ` (κενό)

3. **Ενημέρωση Azure AD Redirect URI**
   - Μετά το deployment, θα πάρετε URL: `https://YOUR-APP.azurestaticapps.net`
   - Πηγαίνετε στο Azure AD App Registration
   - Προσθέστε το νέο Redirect URI

4. **Ενημέρωση config.js**
   ```javascript
   redirectUri: 'https://YOUR-APP.azurestaticapps.net/index.html'
   ```

**Πλεονεκτήματα**:
- ✅ Δωρεάν tier
- ✅ HTTPS by default
- ✅ Custom domain support
- ✅ CI/CD με GitHub Actions
- ✅ Εύκολη ανανέωση

---

### Λύση 2: GitHub Pages (Εύκολη & Δωρεάν)

#### Βήματα:

1. **Push στο GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Ενεργοποίηση GitHub Pages**
   - Πηγαίνετε στο repository → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** → **/ (root)**
   - Save

3. **Η εφαρμογή θα είναι διαθέσιμη στο**:
   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
   ```

4. **Ενημέρωση Azure AD**
   - Προσθέστε το GitHub Pages URL ως Redirect URI

**Πλεονεκτήματα**:
- ✅ Πολύ εύκολο
- ✅ Δωρεάν
- ✅ Αυτόματο deployment

**Μειονεκτήματα**:
- ⚠️ Public repository (εκτός αν έχετε Pro/Enterprise)
- ⚠️ Το `config.js` θα είναι visible

---

### Λύση 3: SharePoint Modern Page με Embedded App

Αντί να ανοίγετε το HTML απευθείας, δημιουργήστε SharePoint Modern Page.

#### Βήματα:

1. **Upload Files στο SiteAssets**
   - Κάντε upload όλα τα αρχεία στο `SiteAssets/SPAccess/`

2. **Δημιουργία Modern Page**
   - Πηγαίνετε στο SharePoint site
   - **New** → **Page**
   - Δώστε όνομα: "Permissions Manager"

3. **Προσθήκη Content**
   
   Προσθέστε **Embed Web Part** και βάλτε:

```html
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SharePoint Permissions Manager</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/SiteAssets/SPAccess/styles.css">
</head>
<body>
    <div id="spPermissionsApp"></div>

    <!-- MSAL.js -->
    <script src="https://alcdn.msauth.net/browser/2.38.1/js/msal-browser.min.js"></script>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- App Scripts -->
    <script src="/SiteAssets/SPAccess/config.js"></script>
    <script src="/SiteAssets/SPAccess/utils/constants.js"></script>
    <script src="/SiteAssets/SPAccess/utils/helpers.js"></script>
    <script src="/SiteAssets/SPAccess/utils/permission-aggregator.js"></script>
    <script src="/SiteAssets/SPAccess/auth.js"></script>
    <script src="/SiteAssets/SPAccess/sp-api.js"></script>
    <script src="/SiteAssets/SPAccess/graph-api.js"></script>
    <script src="/SiteAssets/SPAccess/components/user-selector.js"></script>
    <script src="/SiteAssets/SPAccess/components/permission-modal.js"></script>
    <script src="/SiteAssets/SPAccess/components/site-permissions.js"></script>
    <script src="/SiteAssets/SPAccess/components/folder-permissions.js"></script>
    <script src="/SiteAssets/SPAccess/components/shared-folders.js"></script>
    <script src="/SiteAssets/SPAccess/components/user-permissions-lookup.js"></script>
    
    <script>
        // Initialize app without full HTML wrapper
        document.addEventListener('DOMContentLoaded', async () => {
            const container = document.getElementById('spPermissionsApp');
            
            // Add minimal structure
            container.innerHTML = `
                <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
                    <div class="container-fluid">
                        <span class="navbar-brand">
                            <i class="bi bi-shield-lock"></i>
                            SharePoint Permissions Manager
                        </span>
                        <div class="navbar-nav ms-auto">
                            <span class="nav-link" id="userName">Loading...</span>
                            <a class="nav-link" href="#" id="logoutLink">
                                <i class="bi bi-box-arrow-right"></i> Αποσύνδεση
                            </a>
                        </div>
                    </div>
                </nav>
                
                <div id="loginScreen" style="display: none;">
                    <div class="text-center py-5">
                        <button class="btn btn-primary btn-lg" id="loginBtn">
                            <i class="bi bi-box-arrow-in-right"></i> Σύνδεση
                        </button>
                    </div>
                </div>
                
                <div id="mainApp" style="display: none;">
                    <ul class="nav nav-tabs mb-4" role="tablist">
                        <li class="nav-item">
                            <button class="nav-link active" data-bs-toggle="tab" 
                                    data-bs-target="#sites-panel">
                                <i class="bi bi-building"></i> Sites
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-bs-toggle="tab" 
                                    data-bs-target="#folders-panel">
                                <i class="bi bi-folder"></i> Φάκελοι
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-bs-toggle="tab" 
                                    data-bs-target="#shared-panel">
                                <i class="bi bi-folder-share"></i> Κοινόχρηστοι
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-bs-toggle="tab" 
                                    data-bs-target="#user-lookup-panel">
                                <i class="bi bi-person-search"></i> Αναζήτηση
                            </button>
                        </li>
                    </ul>
                    
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="sites-panel"></div>
                        <div class="tab-pane fade" id="folders-panel"></div>
                        <div class="tab-pane fade" id="shared-panel"></div>
                        <div class="tab-pane fade" id="user-lookup-panel"></div>
                    </div>
                </div>
            `;
            
            // Initialize app
            window.app = new SharePointPermissionsApp();
            await window.app.init();
        });
    </script>
</body>
</html>
```

4. **Publish την Page**

**Πλεονεκτήματα**:
- ✅ Μέσα στο SharePoint
- ✅ SharePoint navigation
- ✅ Permissions inheritance

**Μειονεκτήματα**:
- ⚠️ Πιο περίπλοκο setup
- ⚠️ Περιορισμοί στο embed content

---

### Λύση 4: SharePoint Framework (SPFx) - Advanced

Για production-ready λύση, μετατρέψτε την εφαρμογή σε SPFx Web Part.

**Προτεινόμενο μόνο αν**:
- Χρειάζεστε enterprise-level deployment
- Θέλετε full integration με SharePoint
- Έχετε SPFx development expertise

---

## 🎯 Σύγκριση Λύσεων

| Λύση | Δυσκολία | Κόστος | Security | Best For |
|------|----------|--------|----------|----------|
| **Azure Static Web Apps** | 🟢 Εύκολο | Δωρεάν | ⭐⭐⭐⭐⭐ | Production |
| **GitHub Pages** | 🟢 Πολύ Εύκολο | Δωρεάν | ⭐⭐⭐ | Testing |
| **SharePoint Page** | 🟡 Μέτριο | Δωρεάν | ⭐⭐⭐⭐ | Internal Use |
| **SPFx** | 🔴 Δύσκολο | Δωρεάν | ⭐⭐⭐⭐⭐ | Enterprise |

## 📌 Προτεινόμενη Λύση

Για το project σας, προτείνω:

### **Development/Testing**: GitHub Pages
- Γρήγορο setup
- Εύκολη ανανέωση
- Δωρεάν

### **Production**: Azure Static Web Apps
- Professional hosting
- Custom domain
- Better security
- CI/CD

## 🔐 Security Σημείωση

**ΣΗΜΑΝΤΙΚΟ**: Αν χρησιμοποιήσετε public hosting (GitHub Pages), το `config.js` θα είναι visible!

**Λύση**:
1. Μην βάλετε sensitive data στο `config.js`
2. Χρησιμοποιήστε μόνο το **Client ID** (δεν είναι secret)
3. Τα tokens διαχειρίζονται από το MSAL.js securely

## 📞 Επόμενα Βήματα

1. Διαλέξτε λύση deployment
2. Ακολουθήστε τα βήματα παραπάνω
3. Ενημερώστε το Azure AD Redirect URI
4. Δοκιμάστε την εφαρμογή

**Θέλετε βοήθεια με κάποια συγκεκριμένη λύση;** Πείτε μου και θα σας καθοδηγήσω βήμα-βήμα!

