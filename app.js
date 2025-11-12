/**
 * Main Application Controller
 * Χειρίζεται την initialization και την orchestration των components
 */

class SharePointPermissionsApp {
    constructor() {
        this.authManager = null;
        this.spAPI = null;
        this.graphAPI = null;
        this.azureStorage = null;
        this.permissionAggregator = null;
        this.userSelector = null;
        this.permissionModal = null;
        this.components = {};
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing SharePoint Permissions Manager...');

            // Initialize authentication
            this.authManager = new AuthManager(CONFIG);
            const isAuthenticated = await this.authManager.initialize();

            if (!isAuthenticated) {
                this._showLoginScreen();
                return;
            }

            // Initialize APIs
            this.spAPI = new SharePointAPI(this.authManager, CONFIG);
            this.graphAPI = new GraphAPI(this.authManager, CONFIG);
            this.azureStorage = new AzureStorageClient(CONFIG);
            this.permissionAggregator = new PermissionAggregator(this.spAPI, this.graphAPI, CONFIG);

            // Initialize utility components
            this.userSelector = new UserSelectorComponent(this.graphAPI, this.spAPI, CONFIG);
            this.permissionModal = new PermissionModalComponent(
                this.spAPI, 
                this.graphAPI, 
                this.userSelector, 
                CONFIG
            );

            // Show main app
            await this._showMainApp();

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application', error);
            showNotification('Αποτυχία φόρτωσης εφαρμογής', 'error');
        }
    }

    /**
     * Show login screen
     */
    _showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';

        // Attach login button handler
        document.getElementById('loginBtn').addEventListener('click', async () => {
            await this.authManager.login();
        });
    }

    /**
     * Show main application
     */
    async _showMainApp() {
        // Hide login screen
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';

        // Update user info in navbar
        const userInfo = this.authManager.getUserInfo();
        document.getElementById('userName').textContent = userInfo.name || userInfo.email;

        // Attach logout handler
        document.getElementById('logoutLink').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.authManager.logout();
        });

        // Initialize components
        await this._initializeComponents();

        // Show default tab
        const defaultTab = CONFIG.ui.defaultTab || 'sites';
        this._showTab(defaultTab);
    }

    /**
     * Initialize all UI components
     */
    async _initializeComponents() {
        try {
            // Site Permissions Component
            this.components.sitePermissions = new SitePermissionsComponent(
                document.getElementById('sites-panel'),
                this.spAPI,
                this.graphAPI,
                CONFIG,
                this.azureStorage
            );
            await this.components.sitePermissions.render();

            // Folder Permissions Component
            this.components.folderPermissions = new FolderPermissionsComponent(
                document.getElementById('folders-panel'),
                this.spAPI,
                this.graphAPI,
                CONFIG,
                this.azureStorage
            );
            await this.components.folderPermissions.render();

            // Shared Folders Component
            this.components.sharedFolders = new SharedFoldersComponent(
                document.getElementById('shared-panel'),
                this.spAPI,
                this.graphAPI,
                CONFIG,
                this.azureStorage
            );
            await this.components.sharedFolders.render();

            // User Permissions Lookup Component
            this.components.userLookup = new UserPermissionsLookupComponent(
                document.getElementById('user-lookup-panel'),
                this.spAPI,
                this.graphAPI,
                this.permissionAggregator,
                CONFIG,
                this.azureStorage
            );
            await this.components.userLookup.render();

            // Settings Component
            this.components.settings = new SettingsComponent(
                document.getElementById('settings-panel'),
                this.azureStorage,
                this.graphAPI,
                CONFIG
            );
            await this.components.settings.render();

            console.log('All components initialized');
        } catch (error) {
            console.error('Failed to initialize components', error);
            showNotification('Αποτυχία φόρτωσης components', 'error');
        }
    }

    /**
     * Show specific tab
     */
    _showTab(tabName) {
        const tabButton = document.getElementById(`${tabName}-tab`);
        if (tabButton) {
            tabButton.click();
        }
    }

    /**
     * Public method to show permission modal
     * Called by components when they need to add/edit permissions
     */
    showPermissionModal(options) {
        return this.permissionModal.show(options);
    }

    /**
     * Public method to show user selector
     * Called by components when they need to select a user
     */
    showUserSelector(options) {
        return this.userSelector.show(options);
    }

    /**
     * Refresh all data
     */
    async refreshAll() {
        try {
            showLoading('Ανανέωση δεδομένων...');
            
            // Clear caches
            this.spAPI.clearCache();
            this.graphAPI.clearCache();

            // Reload active component
            const activeTab = document.querySelector('.tab-pane.active');
            const activeTabId = activeTab?.id;

            switch (activeTabId) {
                case 'sites-panel':
                    // Reload sites if a site is selected
                    if (this.components.sitePermissions.currentSite) {
                        await this.components.sitePermissions.loadSitePermissions(
                            this.components.sitePermissions.currentSite
                        );
                    }
                    break;
                case 'folders-panel':
                    if (this.components.folderPermissions.currentSite) {
                        await this.components.folderPermissions.loadFolderPermissions(
                            this.components.folderPermissions.currentSite
                        );
                    }
                    break;
                case 'shared-panel':
                    if (this.components.sharedFolders.currentSite) {
                        await this.components.sharedFolders.loadSharedFolders(
                            this.components.sharedFolders.currentSite
                        );
                    }
                    break;
                case 'user-lookup-panel':
                    if (this.components.userLookup.currentUser) {
                        await this.components.userLookup.loadUserPermissions(
                            this.components.userLookup.currentUser
                        );
                    }
                    break;
            }

            hideLoading();
            showNotification('Τα δεδομένα ανανεώθηκαν', 'success');
        } catch (error) {
            hideLoading();
            console.error('Failed to refresh', error);
            showNotification('Αποτυχία ανανέωσης', 'error');
        }
    }
}

// Global app instance
let app;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    
    app = new SharePointPermissionsApp();
    window.app = app; // Make available globally for components
    
    await app.init();
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('Παρουσιάστηκε σφάλμα', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('Παρουσιάστηκε σφάλμα', 'error');
});

