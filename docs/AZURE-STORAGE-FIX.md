# Azure Storage 400 Error - Fix Documentation

## 🐛 Πρόβλημα

Όταν προσπαθούσαμε να αποθηκεύσουμε sites στο Azure Table Storage, παίρναμε:

```
Error: Azure Storage UPSERT failed: 400 - InvalidInput
```

## 🔍 Αιτία

Το Azure Table Storage έχει συγκεκριμένα REST API endpoints:

### ❌ Λάθος (Παλιός Κώδικας):
```javascript
// POST στο base URL - δεν είναι σωστό για update
POST https://account.table.core.windows.net/TableName
```

### ✅ Σωστό (Νέος Κώδικας):

**Για INSERT (νέο entity):**
```javascript
POST https://account.table.core.windows.net/TableName
Headers:
  - Content-Type: application/json
  - Accept: application/json;odata=nometadata
  - Prefer: return-no-content
Body: {
  PartitionKey: "...",
  RowKey: "...",
  ...otherProperties
}
```

**Για UPSERT (insert OR replace):**
```javascript
PUT https://account.table.core.windows.net/TableName(PartitionKey='...',RowKey='...')
Headers:
  - Content-Type: application/json
  - Accept: application/json;odata=nometadata
Body: {
  PartitionKey: "...",
  RowKey: "...",
  ...otherProperties
}
```

## 🔧 Αλλαγές που Έγιναν

### 1. Διαχωρισμός των Operations

**Παλιά:**
- Ένα `upsert()` method που δεν δούλευε σωστά

**Νέα:**
- `insertEntity()` - Για νέα entities (POST)
- `upsertEntity()` - Για update ή insert (PUT με entity key στο URL)

### 2. Ενημέρωση της addDefaultSite()

```javascript
// Προσπαθεί πρώτα INSERT
await this.insertEntity(entity);

// Αν υπάρχει ήδη (409 conflict), κάνει UPSERT
catch (insertError) {
    if (insertError.message.includes('409')) {
        await this.upsertEntity(entity);
    }
}
```

### 3. Βελτίωση της saveDefaultSites()

Προσθήκη support για διαφορετικά formats sites (string ή object).

## 📋 Azure Table Storage REST API Endpoints

### GET - List Entities
```
GET https://account.table.core.windows.net/TableName()?$filter=...
```

### POST - Insert Entity
```
POST https://account.table.core.windows.net/TableName
Body: { PartitionKey, RowKey, ...data }
```

### PUT - Insert or Replace Entity (Upsert)
```
PUT https://account.table.core.windows.net/TableName(PartitionKey='x',RowKey='y')
Body: { PartitionKey, RowKey, ...data }
```

### MERGE - Update Entity
```
MERGE https://account.table.core.windows.net/TableName(PartitionKey='x',RowKey='y')
Body: { ...dataToUpdate }
```

### DELETE - Delete Entity
```
DELETE https://account.table.core.windows.net/TableName(PartitionKey='x',RowKey='y')
Headers: If-Match: *
```

## ✅ Testing

Μετά την αλλαγή, για να δοκιμάσεις:

1. **Άνοιξε την εφαρμογή**
2. **Πήγαινε στο Settings tab**
3. **Πρόσθεσε ένα site:**
   - Αναζήτησε ένα site ή
   - Βάλε manual URL
   - Κλικάρε Προσθήκη
4. **Κλικάρε Αποθήκευση**

### Αναμενόμενο Αποτέλεσμα:
- ✅ "Οι ρυθμίσεις αποθηκεύτηκαν"
- Στο Azure Portal → Storage Account → Tables → DefaultSites θα δεις το entity

### Debug στο Console:
```javascript
// Θα δεις:
[AzureStorage] Added site to defaults: YourSiteName
[AzureStorage] Saved 1 default sites to Azure Storage
```

## 🆘 Troubleshooting

### Ακόμα παίρνω 400 Error
**Έλεγξε:**
- ✅ Το PartitionKey και RowKey είναι strings (όχι null/undefined)
- ✅ Τα property names δεν έχουν invalid characters
- ✅ Το SAS token έχει Write permissions

### Παίρνω 409 Conflict
**Αυτό είναι φυσιολογικό!** Σημαίνει ότι το entity υπάρχει ήδη.
Ο κώδικας το χειρίζεται αυτόματα με fallback σε UPSERT.

### Παίρνω 403 Forbidden
**Αιτία:** Το SAS token δεν έχει τα σωστά permissions.
**Λύση:** Δημιούργησε νέο SAS token με: Read, Write, Add, Delete, List

### Παίρνω 404 Not Found
**Αιτία:** Το table "DefaultSites" δεν υπάρχει.
**Λύση:** Δημιούργησέ το στο Azure Portal → Storage Account → Tables

## 📚 Resources

- [Azure Table Storage REST API](https://learn.microsoft.com/en-us/rest/api/storageservices/table-service-rest-api)
- [Insert Entity Operation](https://learn.microsoft.com/en-us/rest/api/storageservices/insert-entity)
- [Update Entity Operation](https://learn.microsoft.com/en-us/rest/api/storageservices/update-entity2)

---

**Fixed Date:** 2025-11-12  
**Status:** ✅ Resolved

