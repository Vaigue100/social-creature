# Deployment Workflow

## Overview

**Local development is faster** - develop locally, then deploy to Azure.

There are TWO types of deployments:

1. **Regular Deployment** (normal workflow) - Preserves Azure data
2. **Full Reset** (rare, destructive) - Wipes Azure and starts fresh

---

## Regular Deployment (RECOMMENDED)

Use this for normal development. **Preserves all Azure user data**.

### What Gets Deployed:
- ✓ Code changes (HTML, JS, CSS)
- ✓ Schema changes (new tables, columns, functions)
- ✓ New artwork files only
- ✗ Doesn't touch existing user data
- ✗ Doesn't delete existing artwork

### Steps:

#### 1. **Push Code to GitHub**
```bash
cd chatlings
git add .
git commit -m "Your commit message"
git push origin master
```

Azure will automatically pull and redeploy (takes ~2-3 minutes).

#### 2. **Apply Schema Changes** (if you changed database structure)

If you created a new migration file (e.g., `34_new_feature.sql`):

```bash
node scripts/run-migration-34.js
```

The script connects to Azure and applies only the schema changes.

#### 3. **Upload New Artwork** (if you generated new creature art)

```bash
# TODO: Create artwork sync script
node scripts/sync-artwork-to-azure.js
```

---

## Full Reset (DESTRUCTIVE - Use Rarely)

**⚠ WARNING**: This **WIPES ALL AZURE DATA** including:
- User accounts
- Creatures discovered
- Achievements earned
- Conversations
- Everything

**Only use when**:
- Initial deployment
- Major database restructure
- Beta testing data doesn't matter

### Steps:

```bash
# 1. Backup local database
node scripts/complete-backup.js

# 2. Restore to Azure (DESTRUCTIVE!)
node scripts/complete-restore.js

# 3. Upload all artwork
# TODO: Upload all artwork to Azure blob storage
```

---

## Current Status

### ✓ Working
- Azure website running
- Database fully restored (367 creatures, all data)
- Login system working
- `calculate_chat_likelihood()` function deployed

### ✗ Missing
- Artwork (creature images not visible)
- Artwork sync script
- Automated deployment script

---

## TODO: What We Need to Build

### 1. **Artwork Sync Script** (`scripts/sync-artwork-to-azure.js`)
- Uploads artwork to Azure blob storage
- Only uploads missing files (doesn't re-upload existing)
- Fast incremental sync

### 2. **Deployment Script** (`scripts/deploy-to-azure.sh`)
Combines all steps:
```bash
# One command to:
# - Git push code
# - Wait for Azure redeployment
# - Apply pending migrations
# - Sync artwork
```

### 3. **Migration Runner** (`scripts/run-all-pending-migrations.js`)
- Tracks which migrations have been run on Azure
- Automatically runs only new ones

---

## Development Workflow

### Daily Development:

1. **Work Locally** (fast iteration)
   - Make code changes
   - Test with local database
   - Generate new creatures/artwork locally

2. **Deploy to Azure** (when ready)
   ```bash
   # Option A: Manual steps
   git push
   node scripts/run-migration-XX.js  # if you made schema changes

   # Option B: One command (once we build it)
   ./deploy-to-azure.sh
   ```

3. **Test on Azure**
   - Visit your Azure URL
   - Verify changes
   - Beta testers see updates

### Database Changes:

**Schema Changes** (new tables/columns/functions):
- Create migration SQL file
- Run migration on Azure
- ✓ Preserves existing data

**Data Changes** (updating existing records):
- Write update scripts carefully
- Test locally first
- Run on Azure

---

## Key Principle

**Azure is PRODUCTION** - it has real user data from beta testing.

- ✓ Local = Development (fast, disposable)
- ✓ Azure = Production (preserve data)
- ✗ Never full restore unless necessary
- ✓ Always use migrations for schema changes
