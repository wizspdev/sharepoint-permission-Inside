/**
 * Constants - Σταθερές τιμές για την εφαρμογή
 */

// Permission Levels με τις Base Permissions values
const PERMISSION_LEVELS = {
    FULL_CONTROL: {
        name: 'Full Control',
        value: 1073741829,
        basePermissions: {
            High: '432',
            Low: '65535'
        },
        icon: 'bi-shield-fill-check',
        color: 'danger',
        description: 'Πλήρης έλεγχος - Έχει πλήρη δικαιώματα',
        weight: 100
    },
    DESIGN: {
        name: 'Design',
        value: 1073741828,
        basePermissions: {
            High: '8',
            Low: '196671'
        },
        icon: 'bi-pencil-square',
        color: 'warning',
        description: 'Σχεδιασμός - Μπορεί να δημιουργεί, επεξεργάζεται και διαγράφει',
        weight: 90
    },
    EDIT: {
        name: 'Edit',
        value: 1073741830,
        basePermissions: {
            High: '0',
            Low: '1011030767'
        },
        icon: 'bi-pencil',
        color: 'info',
        description: 'Επεξεργασία - Μπορεί να προσθέτει, επεξεργάζεται και διαγράφει items',
        weight: 80
    },
    CONTRIBUTE: {
        name: 'Contribute',
        value: 1073741827,
        basePermissions: {
            High: '0',
            Low: '1011028719'
        },
        icon: 'bi-plus-circle',
        color: 'success',
        description: 'Συνεισφορά - Μπορεί να προβάλει, προσθέτει, ενημερώνει και διαγράφει',
        weight: 70
    },
    READ: {
        name: 'Read',
        value: 1073741826,
        basePermissions: {
            High: '0',
            Low: '131241'
        },
        icon: 'bi-eye',
        color: 'secondary',
        description: 'Ανάγνωση - Μπορεί μόνο να προβάλει',
        weight: 60
    },
    LIMITED_ACCESS: {
        name: 'Limited Access',
        value: 1073741825,
        basePermissions: {
            High: '0',
            Low: '1'
        },
        icon: 'bi-lock',
        color: 'muted',
        description: 'Περιορισμένη πρόσβαση - Ελάχιστα δικαιώματα',
        weight: 50
    },
    VIEW_ONLY: {
        name: 'View Only',
        value: 1073741924,
        basePermissions: {
            High: '0',
            Low: '131073'
        },
        icon: 'bi-eye-slash',
        color: 'secondary',
        description: 'Μόνο προβολή - Χωρίς download ή εκτύπωση',
        weight: 55
    }
};

// Principal Types (User, Group, κτλ)
const PRINCIPAL_TYPES = {
    NONE: 0,
    USER: 1,
    DISTRIBUTION_LIST: 2,
    SECURITY_GROUP: 4,
    SHAREPOINT_GROUP: 8,
    ALL: 15
};

// Principal Type Names
const PRINCIPAL_TYPE_NAMES = {
    0: 'None',
    1: 'User',
    2: 'Distribution List',
    4: 'Security Group',
    8: 'SharePoint Group',
    15: 'All'
};

// Status Messages
const STATUS = {
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Greek Translations
const TRANSLATIONS = {
    el: {
        // General
        loading: 'Φόρτωση...',
        save: 'Αποθήκευση',
        cancel: 'Ακύρωση',
        delete: 'Διαγραφή',
        edit: 'Επεξεργασία',
        add: 'Προσθήκη',
        remove: 'Αφαίρεση',
        search: 'Αναζήτηση',
        filter: 'Φίλτρο',
        export: 'Εξαγωγή',
        refresh: 'Ανανέωση',
        close: 'Κλείσιμο',
        apply: 'Εφαρμογή',
        reset: 'Επαναφορά',
        
        // Tabs
        sites: 'Sites',
        folders: 'Φάκελοι',
        users: 'Χρήστες',
        userLookup: 'Αναζήτηση Χρήστη',
        
        // Permissions
        permissions: 'Δικαιώματα',
        permissionLevel: 'Επίπεδο Δικαιώματος',
        addPermission: 'Προσθήκη Δικαιώματος',
        removePermission: 'Αφαίρεση Δικαιώματος',
        changePermission: 'Αλλαγή Δικαιώματος',
        breakInheritance: 'Διακοπή Κληρονομικότητας',
        restoreInheritance: 'Επαναφορά Κληρονομικότητας',
        hasUniquePermissions: 'Έχει μοναδικά δικαιώματα',
        inheritsPermissions: 'Κληρονομεί δικαιώματα',
        
        // Users & Groups
        user: 'Χρήστης',
        group: 'Ομάδα',
        selectUser: 'Επιλέξτε Χρήστη',
        selectGroup: 'Επιλέξτε Ομάδα',
        searchUsers: 'Αναζήτηση Χρηστών',
        
        // Folders
        folder: 'Φάκελος',
        sharedFolders: 'Κοινόχρηστοι Φάκελοι',
        folderProperties: 'Ιδιότητες Φακέλου',
        
        // Properties
        name: 'Όνομα',
        email: 'Email',
        created: 'Δημιουργήθηκε',
        modified: 'Τροποποιήθηκε',
        size: 'Μέγεθος',
        itemCount: 'Αριθμός Αντικειμένων',
        
        // Messages
        noData: 'Δεν βρέθηκαν δεδομένα',
        error: 'Παρουσιάστηκε σφάλμα',
        success: 'Επιτυχία',
        confirmDelete: 'Είστε σίγουροι ότι θέλετε να διαγράψετε;',
        confirmBreakInheritance: 'Είστε σίγουροι ότι θέλετε να διακόψετε την κληρονομικότητα;',
        confirmRestoreInheritance: 'Είστε σίγουροι ότι θέλετε να επαναφέρετε την κληρονομικότητα;',
        permissionAdded: 'Το δικαίωμα προστέθηκε επιτυχώς',
        permissionRemoved: 'Το δικαίωμα αφαιρέθηκε επιτυχώς',
        permissionChanged: 'Το δικαίωμα άλλαξε επιτυχώς',
        
        // Errors
        loginRequired: 'Παρακαλώ συνδεθείτε',
        unauthorized: 'Δεν έχετε δικαίωμα πρόσβασης',
        notFound: 'Δεν βρέθηκε',
        serverError: 'Σφάλμα διακομιστή',
        networkError: 'Σφάλμα δικτύου',
        
        // Export
        exportToCSV: 'Εξαγωγή σε CSV',
        exportToExcel: 'Εξαγωγή σε Excel',
        
        // User Lookup
        userNotFound: 'Ο χρήστης δεν βρέθηκε',
        searchForUser: 'Αναζητήστε έναν χρήστη',
        userAccessSummary: 'Σύνοψη Πρόσβασης Χρήστη',
        sitesWithAccess: 'Sites με Πρόσβαση',
        foldersWithAccess: 'Φάκελοι με Πρόσβαση',
        totalSites: 'Σύνολο Sites',
        totalFolders: 'Σύνολο Φακέλων'
    },
    en: {
        // General
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        remove: 'Remove',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        refresh: 'Refresh',
        close: 'Close',
        apply: 'Apply',
        reset: 'Reset',
        
        // Tabs
        sites: 'Sites',
        folders: 'Folders',
        users: 'Users',
        userLookup: 'User Lookup',
        
        // Permissions
        permissions: 'Permissions',
        permissionLevel: 'Permission Level',
        addPermission: 'Add Permission',
        removePermission: 'Remove Permission',
        changePermission: 'Change Permission',
        breakInheritance: 'Break Inheritance',
        restoreInheritance: 'Restore Inheritance',
        hasUniquePermissions: 'Has unique permissions',
        inheritsPermissions: 'Inherits permissions',
        
        // Users & Groups
        user: 'User',
        group: 'Group',
        selectUser: 'Select User',
        selectGroup: 'Select Group',
        searchUsers: 'Search Users',
        
        // Folders
        folder: 'Folder',
        sharedFolders: 'Shared Folders',
        folderProperties: 'Folder Properties',
        
        // Properties
        name: 'Name',
        email: 'Email',
        created: 'Created',
        modified: 'Modified',
        size: 'Size',
        itemCount: 'Item Count',
        
        // Messages
        noData: 'No data found',
        error: 'An error occurred',
        success: 'Success',
        confirmDelete: 'Are you sure you want to delete?',
        confirmBreakInheritance: 'Are you sure you want to break inheritance?',
        confirmRestoreInheritance: 'Are you sure you want to restore inheritance?',
        permissionAdded: 'Permission added successfully',
        permissionRemoved: 'Permission removed successfully',
        permissionChanged: 'Permission changed successfully',
        
        // Errors
        loginRequired: 'Please login',
        unauthorized: 'You are not authorized',
        notFound: 'Not found',
        serverError: 'Server error',
        networkError: 'Network error',
        
        // Export
        exportToCSV: 'Export to CSV',
        exportToExcel: 'Export to Excel',
        
        // User Lookup
        userNotFound: 'User not found',
        searchForUser: 'Search for a user',
        userAccessSummary: 'User Access Summary',
        sitesWithAccess: 'Sites with Access',
        foldersWithAccess: 'Folders with Access',
        totalSites: 'Total Sites',
        totalFolders: 'Total Folders'
    }
};

// Bootstrap Icon Classes
const ICONS = {
    user: 'bi-person',
    group: 'bi-people',
    site: 'bi-building',
    folder: 'bi-folder',
    folderOpen: 'bi-folder-open',
    sharedFolder: 'bi-folder-share',
    edit: 'bi-pencil',
    delete: 'bi-trash',
    add: 'bi-plus-circle',
    remove: 'bi-dash-circle',
    search: 'bi-search',
    filter: 'bi-funnel',
    export: 'bi-download',
    refresh: 'bi-arrow-clockwise',
    settings: 'bi-gear',
    info: 'bi-info-circle',
    warning: 'bi-exclamation-triangle',
    error: 'bi-x-circle',
    success: 'bi-check-circle',
    loading: 'bi-hourglass-split',
    eye: 'bi-eye',
    eyeSlash: 'bi-eye-slash',
    lock: 'bi-lock',
    unlock: 'bi-unlock',
    shield: 'bi-shield',
    chevronDown: 'bi-chevron-down',
    chevronUp: 'bi-chevron-up',
    chevronRight: 'bi-chevron-right',
    chevronLeft: 'bi-chevron-left'
};

// Table Column Definitions
const TABLE_COLUMNS = {
    sitePermissions: [
        { key: 'principalName', label: 'Όνομα', sortable: true },
        { key: 'principalType', label: 'Τύπος', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'roles', label: 'Δικαιώματα', sortable: false },
        { key: 'actions', label: 'Ενέργειες', sortable: false }
    ],
    folderPermissions: [
        { key: 'folderName', label: 'Φάκελος', sortable: true },
        { key: 'library', label: 'Βιβλιοθήκη', sortable: true },
        { key: 'hasUniquePerms', label: 'Μοναδικά Δικαιώματα', sortable: true },
        { key: 'permissionCount', label: 'Αριθμός Δικαιωμάτων', sortable: true },
        { key: 'actions', label: 'Ενέργειες', sortable: false }
    ],
    userLookup: [
        { key: 'location', label: 'Τοποθεσία', sortable: true },
        { key: 'type', label: 'Τύπος', sortable: true },
        { key: 'permissions', label: 'Δικαιώματα', sortable: false },
        { key: 'inherited', label: 'Κληρονομικό', sortable: true }
    ]
};

// API Retry Configuration
const API_RETRY = {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    retryOn: [429, 500, 502, 503, 504] // HTTP status codes to retry
};

// Pagination
const PAGINATION = {
    defaultPageSize: 50,
    pageSizeOptions: [25, 50, 100, 200]
};

// Date Formats
const DATE_FORMATS = {
    short: 'DD/MM/YYYY',
    long: 'DD/MM/YYYY HH:mm:ss',
    time: 'HH:mm',
    iso: 'YYYY-MM-DDTHH:mm:ss'
};

// Export formats
const EXPORT_FORMATS = {
    CSV: 'csv',
    EXCEL: 'xlsx',
    JSON: 'json'
};

// Export για χρήση σε άλλα modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PERMISSION_LEVELS,
        PRINCIPAL_TYPES,
        PRINCIPAL_TYPE_NAMES,
        STATUS,
        TRANSLATIONS,
        ICONS,
        TABLE_COLUMNS,
        API_RETRY,
        PAGINATION,
        DATE_FORMATS,
        EXPORT_FORMATS
    };
}

