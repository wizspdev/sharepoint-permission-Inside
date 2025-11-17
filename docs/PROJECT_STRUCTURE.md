# SharePoint Permissions Manager - Project Structure

Αυτό το document περιγράφει τη δομή του project και τον σκοπό κάθε αρχείου.

## 📂 Δομή Αρχείων

```
SPAccess/
│
├── index.html                          # Κύρια σελίδα της εφαρμογής
├── app.js                              # Main application controller
├── config.js                           # Configuration αρχείο (ΠΡΟΣ ΕΠΕΞΕΡΓΑΣΙΑ)
├── styles.css                          # Custom CSS styles
│
├── auth.js                             # MSAL authentication wrapper
├── sp-api.js                           # SharePoint REST API client
├── graph-api.js                        # Microsoft Graph API client
│
├── utils/                              # Utility functions και helpers
│   ├── constants.js                    # Constants (permissions, translations, κτλ.)
│   ├── helpers.js                      # Helper functions (formatting, export, κτλ.)
│   └── permission-aggregator.js        # Permission aggregation service
│
├── components/                         # UI Components
│   ├── site-permissions.js             # Site-level permissions viewer/editor
│   ├── folder-permissions.js           # Folder-level permissions viewer/editor
│   ├── shared-folders.js               # Shared folders explorer
│   ├── user-permissions-lookup.js      # User lookup (reverse search)
│   ├── user-selector.js                # User/Group picker modal
│   └── permission-modal.js             # Permission add/edit modal
│
├── azure-setup-guide.md                # Αναλυτικές οδηγίες Azure AD setup
├── README.md                           # Κύριο documentation
├── PROJECT_STRUCTURE.md                # Αυτό το αρχείο
└── .gitignore                          # Git ignore rules
```

## 📄 Περιγραφή Αρχείων

### Core Files

#### `index.html`
- Κύρια HTML σελίδα
- Περιέχει τη δομή της εφαρμογής
- Tabs navigation (Sites, Folders, Shared Folders, User Lookup)
- Imports όλα τα scripts και styles

#### `app.js`
- Main application controller
- Χειρίζεται την initialization
- Orchestrates τα components
- Global error handling

#### `config.js` ⚠️ ΠΡΟΣ ΕΠΕΞΕΡΓΑΣΙΑ
- **ΠΡΕΠΕΙ να τροποποιηθεί πριν τη χρήση**
- Περιέχει Azure AD configuration (clientId, tenantId, κτλ.)
- SharePoint monitored sites
- Application settings
- UI preferences

#### `styles.css`
- Custom CSS styling
- Bootstrap overrides
- Responsive design
- Animations και transitions

### Authentication & API Clients

#### `auth.js`
- MSAL.js wrapper
- Authentication flow management
- Token acquisition (Graph + SharePoint)
- Login/Logout functionality
- Cache management

#### `sp-api.js`
- SharePoint REST API client
- Methods για:
  - Site permissions (get, add, remove)
  - Folder permissions (get, add, remove, break/restore inheritance)
  - Lists και folders
  - Role definitions
  - Groups και users
- Request caching
- Error handling

#### `graph-api.js`
- Microsoft Graph API client
- Methods για:
  - User search και information
  - Group information
  - Site discovery
  - Batch requests
- Response caching
- Pagination handling

### Utilities

#### `utils/constants.js`
- Permission levels definitions
- Principal types
- Status codes
- UI translations (Greek/English)
- Icons mapping
- Table column definitions

#### `utils/helpers.js`
- Date formatting
- File size formatting
- Sorting και filtering
- Export functions (CSV, JSON)
- UI helpers (notifications, loading, confirmations)
- Pagination helpers

#### `utils/permission-aggregator.js`
- Aggregates permissions ανά χρήστη
- Reverse lookup logic
- Combines SharePoint + Graph data
- Creates permission summaries
- Identifies direct vs group permissions

### Components

#### `components/site-permissions.js`
**Site Permissions Viewer/Editor Component**
- Εμφανίζει permissions σε site level
- Table view με sorting/filtering
- Add/Edit/Remove permissions
- Export functionality

#### `components/folder-permissions.js`
**Folder Permissions Component**
- Εμφανίζει folders με unique permissions
- Accordion view για λεπτομέρειες
- Break/Restore inheritance
- Add/Remove folder permissions

#### `components/shared-folders.js`
**Shared Folders Explorer**
- Εμφανίζει κοινόχρηστους φακέλους
- Sharing links information
- Folder properties
- Card-based layout

#### `components/user-permissions-lookup.js`
**User Lookup Component** (Νέο Feature!)
- Αναζήτηση χρήστη με autocomplete
- Εμφανίζει όλα τα sites με πρόσβαση
- Εμφανίζει όλους τους folders με πρόσβαση
- Groups membership
- Direct vs inherited permissions
- Summary cards με statistics
- Export user permissions report

#### `components/user-selector.js`
**User/Group Picker Modal**
- Modal για επιλογή χρήστη ή group
- Tabs: Users και Groups
- Search functionality
- Site-specific ή tenant-wide selection

#### `components/permission-modal.js`
**Permission Add/Edit Modal**
- Modal για add/edit permissions
- Role selector με descriptions
- Integration με user-selector
- Validation

### Documentation

#### `azure-setup-guide.md`
- Αναλυτικές οδηγίες για Azure AD App Registration
- Step-by-step setup
- Required permissions
- Troubleshooting
- Screenshots και examples

#### `README.md`
- Γενικό documentation
- Features overview
- Quick start guide
- Usage instructions
- Configuration
- Troubleshooting

## 🔄 Data Flow

```
User Interaction
    ↓
UI Component
    ↓
App Controller (app.js)
    ↓
API Client (sp-api.js / graph-api.js)
    ↓
Auth Manager (auth.js)
    ↓
Azure AD / SharePoint / Graph API
    ↓
Response Processing
    ↓
UI Update
```

## 🎨 UI Architecture

```
index.html
    ├── Navigation (navbar)
    ├── Login Screen (pre-auth)
    └── Main App (post-auth)
        ├── Tabs Navigation
        └── Tab Panels
            ├── Sites Panel → SitePermissionsComponent
            ├── Folders Panel → FolderPermissionsComponent
            ├── Shared Panel → SharedFoldersComponent
            └── User Lookup Panel → UserPermissionsLookupComponent
```

## 📦 Dependencies

### External Libraries (CDN)
- **MSAL.js 2.38.1**: Authentication
- **Bootstrap 5.3.2**: UI Framework
- **Bootstrap Icons 1.11.1**: Icons

### No Build Process Required
- Pure JavaScript (ES6+)
- No npm/webpack/babel
- No compilation step
- Direct deployment to SharePoint

## 🔐 Security Considerations

### Authentication Flow
1. User clicks login
2. MSAL redirects to Azure AD
3. User authenticates
4. Azure AD redirects back με token
5. Token stored σε sessionStorage
6. Token used για API calls

### Token Management
- Access tokens cached
- Automatic refresh (silent)
- Separate tokens για Graph/SharePoint
- No client secrets (implicit flow)

### Permissions Model
- Delegated permissions (user context)
- Least privilege principle
- Admin consent required
- Audit logging (Azure AD)

## 🚀 Deployment Process

1. **Prepare Configuration**
   - Edit `config.js`
   - Update Azure AD settings
   - Add monitored sites

2. **Upload to SharePoint**
   - Create library (e.g., `SPAccess`)
   - Upload all files maintaining structure
   - Set appropriate permissions

3. **Access Application**
   - Navigate to `index.html`
   - First-time consent flow
   - Start using

## 🔧 Customization Points

### Easy Customizations
- `config.js`: Settings, monitored sites, UI preferences
- `styles.css`: Colors, fonts, layout
- `utils/constants.js`: Translations, permission mappings

### Advanced Customizations
- Add new components in `components/`
- Extend API clients με new methods
- Add new tabs στο `index.html`
- Custom permission levels
- Additional export formats

## 📊 Performance Considerations

### Caching Strategy
- API responses cached (5 min default)
- Per-site cache invalidation
- Manual refresh option

### Optimization
- Lazy loading των components
- Pagination για large datasets
- Batch API requests όπου είναι δυνατόν
- Debouncing σε search inputs

### Limitations
- Max 50-100 items per request (configurable)
- Cache timeout: 5 minutes
- Concurrent request limit: 5

## 🐛 Debugging

### Enable Debug Mode
Στο `config.js`:
```javascript
app: {
    debugMode: true,
    logLevel: 'debug'
}
```

### Browser Console
- Authentication flow logs
- API request/response logs
- Error stack traces
- Performance metrics

### Common Issues
- Check browser console
- Verify Azure AD configuration
- Check API permissions
- Review network tab

## 📝 Maintenance

### Regular Tasks
- Review permissions
- Update monitored sites
- Check audit logs
- Update documentation

### Updates
- MSAL.js updates (check for security fixes)
- Bootstrap updates
- API version changes
- Browser compatibility

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-12  
**Maintainer**: SharePoint Admin Team

