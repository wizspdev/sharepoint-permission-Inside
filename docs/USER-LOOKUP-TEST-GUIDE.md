# 🔍 User Lookup Testing Guide

## Πώς να Δοκιμάσεις το User Lookup για m.apostolidis@wizsp.com

### Βήμα 1: Πήγαινε στο User Lookup Tab

1. Κλικάρε στο tab **"Αναζήτηση Χρήστη"** (με το 🔍 icon)

### Βήμα 2: (Προαιρετικά) Επίλεξε Sites για Filtering

Στο πρώτο πεδίο "**Φιλτράρισμα Sites**":
- Επίλεξε **"📌 Προεπιλεγμένα Sites"** για να αναζητήσεις μόνο σε CRM και KB
- Ή άφησέ το κενό για αναζήτηση σε όλα τα configured sites

### Βήμα 3: Εισαγωγή Email

Στο πεδίο "**Email Χρήστη**", γράψε:
```
m.apostolidis@wizsp.com
```

### Βήμα 4: Κλικ "Αναζήτηση"

Κλικάρε το μπλε button **"🔍 Αναζήτηση"**

### Βήμα 5: Αποτελέσματα που θα Δεις

#### 📊 Summary Cards (πάνω μέρος):
- **Sites με Πρόσβαση:** Π.χ. 2 sites (CRM, kb)
- **Φάκελοι:** Αριθμός φακέλων με unique permissions
- **Ομάδες:** Αριθμός groups που ανήκει

#### 📑 Tabs με Λεπτομέρειες:

**Tab 1: Sites (X)**
Table με:
- Site Name
- Permission Level (Direct ή via Group)
- Group Name (αν μέσω group)
- Permission Type

**Tab 2: Φάκελοι (Y)**
Table με:
- Folder Path
- Site
- Permission Level
- Access Type

**Tab 3: Ομάδες (Z)**
List με:
- Group Name
- Site
- Description

### 🎯 Αναμενόμενα Αποτελέσματα

Για τον **m.apostolidis@wizsp.com** (από όσα είδαμε):

#### Sites:
✅ **KB Site** - Limited Access
- Πιθανόν μέσω nested group

#### Groups (που πιθανόν ανήκει):
- Membri knowledgebase
- Ή κάποιο nested group

## 🔍 Console Output

Κοίτα το Console (F12) για να δεις το flow:

```
[SiteSelector] Selected sites: [...]
Loading user permissions for: m.apostolidis@wizsp.com
[PermissionAggregator] Aggregating permissions for user...
Found X sites with access
Found Y folders with access
Found Z group memberships
✅ User permissions loaded successfully
```

## 📊 Τι θα Μάθεις

Από το User Lookup θα δεις:

1. **Σε ποια sites** έχει πρόσβαση ο Michalis
2. **Τι permissions** έχει σε κάθε site
3. **Σε ποια groups** ανήκει
4. **Σε ποια folders** έχει unique permissions
5. **Direct vs Inherited** permissions

## 🎨 Expected UI

### Summary Section:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  📊 Sites       │  │  📁 Φάκελοι     │  │  👥 Ομάδες      │
│      2          │  │      0          │  │      1          │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Tabs:
```
[Sites (2)] [Φάκελοι (0)] [Ομάδες (1)]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────┐
│ Site Name    │ Permission │ Via Group   │
├──────────────────────────────────────────┤
│ KB           │ Limited    │ ✅ Yes      │
│ CRM          │ Full Ctrl  │ ❌ Direct   │
└──────────────────────────────────────────┘
```

## 🐛 Πιθανά Issues

### "Δεν βρέθηκαν δικαιώματα"
**Αιτίες:**
- Ο χρήστης δεν έχει πρόσβαση σε κανένα από τα configured sites
- Τα sites δεν έχουν φορτώσει σωστά
- API permissions issue

**Λύση:**
- Έλεγξε ότι ο χρήστης υπάρχει στο SharePoint
- Δοκίμασε με διαφορετικό email
- Έλεγξε το Console για errors

### Loading Κολλάει
**Λύση:**
Με τα timeout fixes, θα κλείσει αυτόματα σε 30 δευτερόλεπτα.

Στο Console τρέξε:
```javascript
hideLoading();
```

## 📸 Screenshot Request

Μετά τη δοκιμή, θα ήθελα να δω screenshot ή να μου πεις:
- Πόσα sites βρήκε
- Πόσα folders
- Σε ποια groups ανήκει
- Αν υπάρχουν errors στο console

---

**Δοκίμασε το και πες μου τα αποτελέσματα!** 🔍😊

