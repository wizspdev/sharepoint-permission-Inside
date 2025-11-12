/**
 * Configuration file για SharePoint Permissions Manager
 * 
 * ΟΔΗΓΙΕΣ ΡΥΘΜΙΣΗΣ:
 * 1. Αντικαταστήστε τα placeholders με τα πραγματικά στοιχεία από το Azure AD App Registration
 * 2. Προσθέστε τα SharePoint sites που θέλετε να παρακολουθείτε
 * 3. Ρυθμίστε τις προτιμήσεις της εφαρμογής
 */

const CONFIG = {
    // Azure AD Authentication Settings
    auth: {
        // Application (client) ID από το Azure Portal
        clientId: 'e9d5b270-9ac6-484e-82ee-8d20e3455e85', // π.χ. '12345678-1234-1234-1234-123456789abc'
        
        // Authority URL με το Tenant ID σας
        authority: 'https://login.microsoftonline.com/ac25a967-0ade-4f23-a026-36aa83293622', // π.χ. 'https://login.microsoftonline.com/87654321-4321-4321-4321-abcdef123456'
        
        // Redirect URI - πρέπει να ταιριάζει με το Azure AD App Registration
        // redirectUri: window.location.origin + window.location.pathname,
        redirectUri: 'https://nice-beach-0f0830510.3.azurestaticapps.net/index.html', 
        // Post logout redirect URI
        //postLogoutRedirectUri: window.location.origin + window.location.pathname
        postLogoutRedirectUri: 'https://nice-beach-0f0830510.3.azurestaticapps.net/index.html' 
    },

    // MSAL Cache Configuration
    cache: {
        cacheLocation: 'sessionStorage', // 'localStorage' ή 'sessionStorage'
        storeAuthStateInCookie: false
    },

    // API Scopes - Τα permissions που χρειάζεται η εφαρμογή
    scopes: {
        // Microsoft Graph API scopes
        graph: [
            'User.Read',
            'User.Read.All',
            'Group.Read.All',
            'Sites.Read.All',
            'Sites.ReadWrite.All'
        ],
        
        // SharePoint API scopes
        sharepoint: [
            'AllSites.Read',
            'AllSites.FullControl',
            'User.Read.All'
        ]
    },

    // SharePoint Configuration
    sharepoint: {
        // Το tenant σας (π.χ. 'contoso' αν το URL είναι contoso.sharepoint.com)
        tenantName: 'wiz365', // π.χ. 'contoso'
        
        // Τα sites που θέλετε να παρακολουθείτε
        // Προσθέστε/αφαιρέστε sites όπως χρειάζεται
        monitoredSites: [
            'https://YOUR_TENANT.sharepoint.com/sites/Site1',
            'https://YOUR_TENANT.sharepoint.com/sites/Site2',
            'https://YOUR_TENANT.sharepoint.com/sites/Site3'
            // Προσθέστε περισσότερα sites εδώ
        ],

        // API Version
        apiVersion: 'v1.0'
    },

    // Microsoft Graph API Configuration
    graph: {
        endpoint: 'https://graph.microsoft.com/v1.0',
        betaEndpoint: 'https://graph.microsoft.com/beta'
    },

    // Azure Storage Configuration (για αποθήκευση default sites)
    azureStorage: {
        // Storage account name (π.χ. 'mystorage')
        accountName: 'sppermisionstorage', // π.χ. 'sppermstorage'
        
        // Table name
        tableName: 'DefaultSites',
        
        // SAS Token (Shared Access Signature)
        // Δημιουργήστε έναν SAS token με Table permissions: Read, Add, Update, Delete
        sasToken: 'sv=2024-11-04&ss=t&srt=sco&sp=rwdlacu&se=2026-11-12T23:01:41Z&st=2025-11-12T14:46:41Z&spr=https&sig=f93%2BdAYDgkU8IusRc0jSJSvUII7ys%2Bb0Je7UTNwlV0c%3D', // π.χ. 'sv=2021-06-08&ss=t&srt=sco&sp=rwdlacu&se=2025-12-31...'
        
        // Ενεργοποίηση Azure Storage
        // Αν είναι false, η εφαρμογή θα χρησιμοποιεί μόνο τα monitoredSites από το config
        enabled: true
    },

    // Application Settings
    app: {
        // Όνομα εφαρμογής
        name: 'SharePoint Permissions Manager',
        
        // Έκδοση
        version: '1.0.0',
        
        // Logging level: 'none', 'error', 'warning', 'info', 'debug'
        logLevel: 'info',
        
        // Πόσες εγγραφές να εμφανίζονται ανά σελίδα
        pageSize: 50,
        
        // Cache timeout σε milliseconds (5 λεπτά)
        cacheTimeout: 5 * 60 * 1000,
        
        // Maximum concurrent API calls
        maxConcurrentRequests: 5,
        
        // Request timeout σε milliseconds
        requestTimeout: 30000,
        
        // Enable debug mode (εμφανίζει περισσότερα logs)
        debugMode: true
    },

    // UI Settings
    ui: {
        // Theme: 'light' ή 'dark'
        theme: 'light',
        
        // Default tab: 'sites', 'folders', 'users', 'user-lookup'
        defaultTab: 'sites',
        
        // Show/Hide features
        features: {
            showExportButton: true,
            showRefreshButton: true,
            showSearchBox: true,
            showFilters: true,
            allowPermissionEditing: true,
            showSharedFolders: true
        },
        
        // Date format
        dateFormat: 'DD/MM/YYYY HH:mm',
        
        // Language: 'el' (Greek) ή 'en' (English)
        language: 'el'
    },

    // Permission Levels (SharePoint Role Definitions)
    permissionLevels: {
        'Full Control': {
            value: 1073741829,
            icon: 'shield-fill-check',
            color: 'danger',
            description: 'Πλήρης έλεγχος'
        },
        'Design': {
            value: 1073741828,
            icon: 'pencil-square',
            color: 'warning',
            description: 'Σχεδιασμός'
        },
        'Edit': {
            value: 1073741830,
            icon: 'pencil',
            color: 'info',
            description: 'Επεξεργασία'
        },
        'Contribute': {
            value: 1073741827,
            icon: 'plus-circle',
            color: 'success',
            description: 'Συνεισφορά'
        },
        'Read': {
            value: 1073741826,
            icon: 'eye',
            color: 'secondary',
            description: 'Ανάγνωση'
        },
        'Limited Access': {
            value: 1073741825,
            icon: 'lock',
            color: 'muted',
            description: 'Περιορισμένη πρόσβαση'
        }
    },

    // Export Settings
    export: {
        // Default format: 'csv' ή 'excel'
        defaultFormat: 'csv',
        
        // Include metadata στο export
        includeMetadata: true,
        
        // Filename prefix
        filenamePrefix: 'SPPermissions'
    },

    // Error Messages (μπορούν να μεταφραστούν)
    messages: {
        el: {
            loading: 'Φόρτωση...',
            error: 'Παρουσιάστηκε σφάλμα',
            noData: 'Δεν βρέθηκαν δεδομένα',
            unauthorized: 'Δεν έχετε δικαίωμα πρόσβασης',
            loginRequired: 'Παρακαλώ συνδεθείτε',
            success: 'Επιτυχία',
            confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε;'
        },
        en: {
            loading: 'Loading...',
            error: 'An error occurred',
            noData: 'No data found',
            unauthorized: 'You are not authorized',
            loginRequired: 'Please login',
            success: 'Success',
            confirmDelete: 'Are you sure you want to delete?'
        }
    }
};

// Validation function - ελέγχει αν το config έχει ρυθμιστεί σωστά
function validateConfig() {
    const errors = [];

    // Check Azure AD settings
    if (CONFIG.auth.clientId === 'YOUR_CLIENT_ID_HERE') {
        errors.push('Παρακαλώ ρυθμίστε το clientId στο config.js');
    }

    if (CONFIG.auth.authority.includes('YOUR_TENANT_ID_HERE')) {
        errors.push('Παρακαλώ ρυθμίστε το authority (Tenant ID) στο config.js');
    }

    // Check SharePoint settings
    if (CONFIG.sharepoint.tenantName === 'YOUR_TENANT_NAME') {
        errors.push('Παρακαλώ ρυθμίστε το tenantName στο config.js');
    }

    if (CONFIG.sharepoint.monitoredSites[0].includes('YOUR_TENANT')) {
        errors.push('Παρακαλώ ρυθμίστε τα monitoredSites στο config.js');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Auto-validate on load (σε development mode)
if (CONFIG.app.debugMode) {
    const validation = validateConfig();
    if (!validation.valid) {
        console.warn('⚠️ Configuration Issues Detected:');
        validation.errors.forEach(error => console.warn(`  - ${error}`));
    } else {
        console.log('✅ Configuration validated successfully');
    }
}

// Export configuration (για χρήση σε modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

