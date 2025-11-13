/**
 * Helper Functions - Χρήσιμες βοηθητικές συναρτήσεις
 */

/**
 * Format date
 */
function formatDate(dateString, format = 'DD/MM/YYYY HH:mm') {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return '-';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get permission level name from role definition name
 */
function getPermissionLevelInfo(roleName) {
    for (const [key, value] of Object.entries(PERMISSION_LEVELS)) {
        if (value.name === roleName || value.name.toLowerCase() === roleName.toLowerCase()) {
            return value;
        }
    }
    
    // Default
    return {
        name: roleName,
        icon: 'bi-question-circle',
        color: 'secondary',
        description: roleName,
        weight: 0
    };
}

/**
 * Get principal type name
 */
function getPrincipalTypeName(principalType) {
    return PRINCIPAL_TYPE_NAMES[principalType] || 'Unknown';
}

/**
 * Get principal icon
 */
function getPrincipalIcon(principalType) {
    switch (principalType) {
        case PRINCIPAL_TYPES.USER:
            return ICONS.user;
        case PRINCIPAL_TYPES.SECURITY_GROUP:
        case PRINCIPAL_TYPES.SHAREPOINT_GROUP:
            return ICONS.group;
        default:
            return ICONS.group;
    }
}

/**
 * Sort array of objects by key
 */
function sortByKey(array, key, ascending = true) {
    return array.sort((a, b) => {
        let aVal = getNestedValue(a, key);
        let bVal = getNestedValue(b, key);
        
        // Handle null/undefined
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Convert to lowercase for string comparison
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

/**
 * Get nested object value by path (e.g., 'user.profile.name')
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Filter array by search term
 */
function filterBySearchTerm(array, searchTerm, searchKeys) {
    if (!searchTerm) return array;
    
    const term = searchTerm.toLowerCase();
    
    return array.filter(item => {
        return searchKeys.some(key => {
            const value = getNestedValue(item, key);
            return value && String(value).toLowerCase().includes(term);
        });
    });
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Export to CSV
 */
function exportToCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) {
        showNotification('Δεν υπάρχουν δεδομένα για εξαγωγή', 'warning');
        return;
    }
    
    // Get headers
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            if (value == null) return '';
            const stringValue = String(value);
            return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        });
        csv += values.join(',') + '\n';
    });
    
    // Download
    downloadFile(csv, filename, 'text/csv');
}

/**
 * Export to JSON
 */
function exportToJSON(data, filename = 'export.json') {
    if (!data) {
        showNotification('Δεν υπάρχουν δεδομένα για εξαγωγή', 'warning');
        return;
    }
    
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, filename, 'application/json');
}

/**
 * Download file helper
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Show notification/toast
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Check if Bootstrap toast container exists
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Icon based on type
    let icon = ICONS.info;
    let bgClass = 'bg-info';
    
    switch (type) {
        case 'success':
            icon = ICONS.success;
            bgClass = 'bg-success';
            break;
        case 'error':
            icon = ICONS.error;
            bgClass = 'bg-danger';
            break;
        case 'warning':
            icon = ICONS.warning;
            bgClass = 'bg-warning';
            break;
    }
    
    // Create toast
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icon} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: duration });
    toast.show();
    
    // Remove from DOM after hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/**
 * Show loading indicator
 */
function showLoading(message = 'Φόρτωση...') {
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingOverlay.style.zIndex = '9999';
        loadingOverlay.innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mb-0 loading-message">${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.querySelector('.loading-message').textContent = message;
        loadingOverlay.style.display = 'flex';
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        // Remove the element completely instead of just hiding it
        loadingOverlay.remove();
    }
    
    // Also remove any stuck modal backdrops
    document.querySelectorAll('.modal-backdrop.fade.show').forEach(el => {
        if (!document.querySelector('.modal.show')) {
            // Only remove backdrop if no modal is actually open
            el.remove();
        }
    });
    
    // Ensure body scroll is restored
    document.body.style.overflow = 'auto';
}

/**
 * Confirm dialog
 */
function confirmDialog(message, title = 'Επιβεβαίωση') {
    return new Promise((resolve) => {
        // Check if modal exists
        let modal = document.getElementById('confirmModal');
        
        if (!modal) {
            // Create modal
            const modalHtml = `
                <div class="modal fade" id="confirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Επιβεβαίωση</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p class="confirm-message"></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Ακύρωση</button>
                                <button type="button" class="btn btn-primary confirm-yes">Επιβεβαίωση</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('confirmModal');
        }
        
        // Update content
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.confirm-message').textContent = message;
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Handle yes button
        const yesBtn = modal.querySelector('.confirm-yes');
        const handleYes = () => {
            bsModal.hide();
            yesBtn.removeEventListener('click', handleYes);
            resolve(true);
        };
        yesBtn.addEventListener('click', handleYes);
        
        // Handle modal close
        modal.addEventListener('hidden.bs.modal', () => {
            resolve(false);
        }, { once: true });
    });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Αντιγράφηκε στο clipboard', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard', error);
        showNotification('Αποτυχία αντιγραφής', 'error');
        return false;
    }
}

/**
 * Get translation
 */
function t(key, lang = null) {
    const language = lang || CONFIG.ui.language || 'el';
    return TRANSLATIONS[language]?.[key] || key;
}

/**
 * Paginate array
 */
function paginateArray(array, page, pageSize) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
        data: array.slice(startIndex, endIndex),
        totalPages: Math.ceil(array.length / pageSize),
        currentPage: page,
        totalItems: array.length,
        hasNext: endIndex < array.length,
        hasPrevious: page > 1
    };
}

/**
 * Create pagination HTML
 */
function createPaginationHtml(totalPages, currentPage, onPageChange) {
    if (totalPages <= 1) return '';
    
    let html = '<nav><ul class="pagination justify-content-center">';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi ${ICONS.chevronLeft}"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi ${ICONS.chevronRight}"></i>
            </a>
        </li>
    `;
    
    html += '</ul></nav>';
    
    return html;
}

/**
 * Retry async function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const waitTime = delay * Math.pow(2, i);
            console.warn(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms`, error);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        formatFileSize,
        getPermissionLevelInfo,
        getPrincipalTypeName,
        getPrincipalIcon,
        sortByKey,
        getNestedValue,
        filterBySearchTerm,
        debounce,
        throttle,
        exportToCSV,
        exportToJSON,
        downloadFile,
        showNotification,
        showLoading,
        hideLoading,
        confirmDialog,
        escapeHtml,
        generateId,
        copyToClipboard,
        t,
        paginateArray,
        createPaginationHtml,
        retryWithBackoff
    };
}

