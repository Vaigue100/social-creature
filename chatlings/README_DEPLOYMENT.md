# Deployment Guide

## Quick Start

### Deploy Code Changes
```bash
Deploy-Code.bat
```

### Deploy Database Changes
```bash
Deploy-Database.bat
```

---

## Deploy-Code.bat

**Purpose:** Deploy code changes to Azure

**What it does:**
1. Commits all changes to git
2. Pushes to GitHub (backup)
3. Pushes to Azure (deploys app)

**When to use:**
- After making code changes
- After fixing bugs
- After adding new features

**Example:**
```bash
Deploy-Code.bat
# Enter commit message: "Add new chatroom feature"
# Code deploys to Azure in 2-3 minutes
```

---

## Deploy-Database.bat

**Purpose:** Manage database sync between local and Azure

### Options

#### 1. Full Restore: Local → Azure ⚠️ DESTRUCTIVE
- **Use when:** Initial deployment, major restructure
- **Warning:** WIPES ALL AZURE DATA
- **Process:**
  1. Backs up local database
  2. Wipes Azure database
  3. Restores local backup to Azure

#### 2. Full Restore: Azure → Local ⚠️ DESTRUCTIVE
- **Use when:** Testing with production data locally
- **Warning:** WIPES ALL LOCAL DATA
- **Process:**
  1. Backs up Azure database
  2. Wipes local database
  3. Restores Azure backup to local

#### 3. Single Table: Local → Azure ✅ SAFE
- **Use when:** Updating reference data (dimensions, lore, etc.)
- **Safe:** Only affects one table
- **Example tables:** `dim_body_type`, `lore_species`, `achievements`

#### 4. Single Table: Azure → Local ✅ SAFE
- **Use when:** Getting production data for one table
- **Safe:** Only affects one table
- **Example:** Get real user data for testing

### Example Usage

**Update achievement definitions on Azure:**
```bash
Deploy-Database.bat
# Choose: 3 (Single table: Local to Azure)
# Enter table name: achievements
# ✓ 30 rows copied to Azure
```

**Get production user data locally:**
```bash
Deploy-Database.bat
# Choose: 4 (Single table: Azure to Local)
# Enter table name: users
# ✓ 15 rows copied to local
```

---

## Typical Workflows

### Daily Development

1. **Make code changes locally**
2. **Test locally**
3. **Deploy to Azure:**
   ```bash
   Deploy-Code.bat
   # Enter commit message
   ```

### Deploy New Feature with Database Changes

1. **Make code changes**
2. **Update database locally** (add columns, tables, etc.)
3. **Test locally**
4. **Deploy database:**
   ```bash
   Deploy-Database.bat
   # Choose: 1 (Full restore Local to Azure)
   # WARNING: This wipes Azure data!
   ```
5. **Deploy code:**
   ```bash
   Deploy-Code.bat
   ```

### Update Reference Data

1. **Update local database** (e.g., add new achievements)
2. **Deploy just that table:**
   ```bash
   Deploy-Database.bat
   # Choose: 3 (Single table: Local to Azure)
   # Enter table: achievements
   ```

### Test with Production Data

1. **Get production data:**
   ```bash
   Deploy-Database.bat
   # Choose: 4 (Single table: Azure to Local)
   # Enter table: users
   ```
2. **Test locally**
3. **Make changes**
4. **Deploy back if needed**

---

## Important Notes

### Two Git Remotes

Your repo has TWO remotes:
- **origin** → GitHub (private backup)
- **azure** → Azure Git (deploys the app)

`Deploy-Code.bat` pushes to BOTH automatically.

### Deployment Time

- **Code deployment:** 2-3 minutes
- **Database full restore:** 1-2 minutes
- **Single table:** 5-10 seconds

### Destructive Operations

These operations WIPE DATA:
- ⚠️ Full restore Local → Azure
- ⚠️ Full restore Azure → Local

Always confirm with "YES" when prompted.

### Safe Operations

These only affect specific tables:
- ✅ Single table copy (either direction)

---

## Artwork Management

**Don't use batch files for artwork!**

Use **Azure Storage Explorer:**
1. Download: https://azure.microsoft.com/en-us/products/storage/storage-explorer/
2. Connect to: chatlingsartwork storage account
3. Drag and drop artwork folders

See `docs/MOUNT_AZURE_STORAGE.md` for details.

---

## Troubleshooting

### Deploy-Code.bat fails

**Error:** "Push to Azure failed"

**Solution:** Check git remote:
```bash
git remote -v
# Should show both 'origin' and 'azure'
```

If 'azure' is missing, add it:
```bash
git remote add azure https://app-chatlings-dev.scm.azurewebsites.net/app-chatlings-dev.git
```

### Deploy-Database.bat fails

**Error:** "Connection failed"

**Solution:** Check `.env.azure` file exists with Azure database credentials

**Error:** "Table not found"

**Solution:** Check table name spelling, it's case-sensitive

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy code | `Deploy-Code.bat` |
| Deploy database (full) | `Deploy-Database.bat` → choice 1 |
| Update one table | `Deploy-Database.bat` → choice 3 or 4 |
| Start local dev | `start-all-services.bat` |
| Stop local dev | `stop-all-services.bat` |
