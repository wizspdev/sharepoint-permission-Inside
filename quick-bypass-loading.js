/**
 * TEMPORARY FIX - Bypass Loading Issues
 * Προσθέστε αυτό ΠΡΟΣΩΡΙΝΑ στο index.html για να bypass-άρετε το loading
 */

// Override showLoading να μην κάνει τίποτα (temporary!)
const originalShowLoading = window.showLoading;
const originalHideLoading = window.hideLoading;

let loadingTimeout = null;

window.showLoading = function(message) {
    console.log('🔄 Loading:', message);
    
    // Call original
    if (originalShowLoading) {
        originalShowLoading(message);
    }
    
    // Auto-hide μετά από 5 δευτερόλεπτα (safety)
    if (loadingTimeout) clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Auto-hiding loading after 5 seconds');
        window.hideLoading();
    }, 5000);
};

window.hideLoading = function() {
    console.log('✅ Hiding loading');
    
    // Clear timeout
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
    
    // Call original
    if (originalHideLoading) {
        originalHideLoading();
    }
    
    // Force remove any stuck modals
    setTimeout(() => {
        document.querySelectorAll('.loading-overlay').forEach(el => el.remove());
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.style.overflow = 'auto';
    }, 100);
};

console.log('✅ Loading bypass installed - Loading will auto-hide after 5 seconds');

