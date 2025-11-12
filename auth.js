/**
 * Authentication Module - MSAL.js Wrapper
 * Χειρίζεται την authentication με Azure AD χρησιμοποιώντας MSAL.js 2.x
 */

class AuthManager {
    constructor(config) {
        this.config = config;
        this.msalInstance = null;
        this.account = null;
        this.initializeMSAL();
    }

    /**
     * Initialize MSAL Instance
     */
    initializeMSAL() {
        const msalConfig = {
            auth: {
                clientId: this.config.auth.clientId,
                authority: this.config.auth.authority,
                redirectUri: this.config.auth.redirectUri,
                postLogoutRedirectUri: this.config.auth.postLogoutRedirectUri,
                navigateToLoginRequestUrl: true
            },
            cache: {
                cacheLocation: this.config.cache.cacheLocation,
                storeAuthStateInCookie: this.config.cache.storeAuthStateInCookie
            },
            system: {
                loggerOptions: {
                    loggerCallback: (level, message, containsPii) => {
                        if (containsPii) return;
                        
                        switch (level) {
                            case msal.LogLevel.Error:
                                console.error(message);
                                break;
                            case msal.LogLevel.Warning:
                                console.warn(message);
                                break;
                            case msal.LogLevel.Info:
                                if (this.config.app.debugMode) {
                                    console.info(message);
                                }
                                break;
                            case msal.LogLevel.Verbose:
                                if (this.config.app.debugMode) {
                                    console.debug(message);
                                }
                                break;
                        }
                    },
                    logLevel: this.config.app.debugMode ? msal.LogLevel.Verbose : msal.LogLevel.Warning
                }
            }
        };

        this.msalInstance = new msal.PublicClientApplication(msalConfig);
    }

    /**
     * Initialize authentication - ελέγχει αν ο χρήστης είναι ήδη logged in
     */
    async initialize() {
        try {
            // Handle redirect promise
            const response = await this.msalInstance.handleRedirectPromise();
            
            if (response) {
                this.account = response.account;
                this.logInfo('User logged in via redirect', this.account);
            } else {
                // Check if user is already logged in
                const accounts = this.msalInstance.getAllAccounts();
                
                if (accounts.length > 0) {
                    this.account = accounts[0];
                    this.msalInstance.setActiveAccount(this.account);
                    this.logInfo('User already logged in', this.account);
                }
            }

            return this.isAuthenticated();
        } catch (error) {
            this.logError('Authentication initialization failed', error);
            throw error;
        }
    }

    /**
     * Login χρήστη με redirect
     */
    async login() {
        try {
            const loginRequest = {
                scopes: ['User.Read'],
                prompt: 'select_account'
            };

            await this.msalInstance.loginRedirect(loginRequest);
        } catch (error) {
            this.logError('Login failed', error);
            throw error;
        }
    }

    /**
     * Login χρήστη με popup (alternative)
     */
    async loginPopup() {
        try {
            const loginRequest = {
                scopes: ['User.Read'],
                prompt: 'select_account'
            };

            const response = await this.msalInstance.loginPopup(loginRequest);
            this.account = response.account;
            this.msalInstance.setActiveAccount(this.account);
            
            this.logInfo('User logged in via popup', this.account);
            return response;
        } catch (error) {
            this.logError('Popup login failed', error);
            throw error;
        }
    }

    /**
     * Logout χρήστη
     */
    async logout() {
        try {
            const logoutRequest = {
                account: this.account,
                postLogoutRedirectUri: this.config.auth.postLogoutRedirectUri
            };

            await this.msalInstance.logoutRedirect(logoutRequest);
        } catch (error) {
            this.logError('Logout failed', error);
            throw error;
        }
    }

    /**
     * Παίρνει access token για Microsoft Graph API
     */
    async getGraphToken() {
        return await this.getToken(this.config.scopes.graph);
    }

    /**
     * Παίρνει access token για SharePoint API
     */
    async getSharePointToken(siteUrl = null) {
        // Αν δίνεται specific site URL, χρησιμοποιούμε το domain του
        let scopes;
        
        if (siteUrl) {
            const url = new URL(siteUrl);
            scopes = [`${url.origin}/.default`];
        } else {
            // Default SharePoint scopes
            scopes = this.config.scopes.sharepoint;
        }

        return await this.getToken(scopes);
    }

    /**
     * Generic method για token acquisition
     */
    async getToken(scopes) {
        if (!this.isAuthenticated()) {
            throw new Error('User not authenticated');
        }

        const tokenRequest = {
            scopes: scopes,
            account: this.account,
            forceRefresh: false
        };

        try {
            // Προσπαθεί silent token acquisition
            const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
            this.logInfo('Token acquired silently', { scopes });
            return response.accessToken;
        } catch (error) {
            this.logWarn('Silent token acquisition failed, trying interactive', error);

            // Αν αποτύχει το silent, κάνει interactive
            if (error instanceof msal.InteractionRequiredAuthError) {
                try {
                    const response = await this.msalInstance.acquireTokenRedirect(tokenRequest);
                    return response.accessToken;
                } catch (interactiveError) {
                    this.logError('Interactive token acquisition failed', interactiveError);
                    throw interactiveError;
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Ελέγχει αν ο χρήστης είναι authenticated
     */
    isAuthenticated() {
        return this.account !== null;
    }

    /**
     * Παίρνει το current account
     */
    getAccount() {
        return this.account;
    }

    /**
     * Παίρνει user information
     */
    getUserInfo() {
        if (!this.account) {
            return null;
        }

        return {
            username: this.account.username,
            name: this.account.name,
            email: this.account.username,
            id: this.account.localAccountId,
            tenantId: this.account.tenantId
        };
    }

    /**
     * Ελέγχει αν το token είναι έγκυρο
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= expiry;
        } catch (error) {
            return true;
        }
    }

    /**
     * Clear cache (για troubleshooting)
     */
    clearCache() {
        if (this.msalInstance) {
            const accounts = this.msalInstance.getAllAccounts();
            accounts.forEach(account => {
                this.msalInstance.getTokenCache().removeAccount(account);
            });
            this.account = null;
            this.logInfo('Cache cleared');
        }
    }

    /**
     * Logging helpers
     */
    logInfo(message, data = null) {
        if (this.config.app.logLevel === 'info' || this.config.app.logLevel === 'debug') {
            console.log(`[AuthManager] ${message}`, data || '');
        }
    }

    logWarn(message, data = null) {
        if (this.config.app.logLevel !== 'none' && this.config.app.logLevel !== 'error') {
            console.warn(`[AuthManager] ${message}`, data || '');
        }
    }

    logError(message, error) {
        if (this.config.app.logLevel !== 'none') {
            console.error(`[AuthManager] ${message}`, error);
        }
    }
}

/**
 * Helper function για error handling
 */
function handleAuthError(error) {
    if (error instanceof msal.BrowserAuthError) {
        return {
            type: 'BrowserAuthError',
            message: 'Πρόβλημα με το browser. Παρακαλώ δοκιμάστε ξανά.',
            details: error.message
        };
    } else if (error instanceof msal.InteractionRequiredAuthError) {
        return {
            type: 'InteractionRequired',
            message: 'Απαιτείται επαναπιστοποίηση.',
            details: error.message
        };
    } else if (error instanceof msal.ServerError) {
        return {
            type: 'ServerError',
            message: 'Πρόβλημα με τον server. Παρακαλώ δοκιμάστε αργότερα.',
            details: error.message
        };
    } else {
        return {
            type: 'UnknownError',
            message: 'Άγνωστο σφάλμα authentication.',
            details: error.message || error
        };
    }
}

// Export για χρήση σε άλλα modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, handleAuthError };
}

