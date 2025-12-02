# Azure Publish Tool

Interactive batch script for deploying changes to Azure.

## Quick Start

```bash
cd chatlings
azure-publish.bat
```

The script will guide you through:
1. **Push Code** - Deploy code changes to Azure
2. **Database Changes** - Run migrations or full restore
3. **Upload Artwork** - Sync artwork to blob storage

## Features

### 1. Push Code to Azure

- Commits and pushes code changes to GitHub
- Azure automatically redeploys in 2-3 minutes
- You'll be prompted for a commit message

**Choose this when:**
- You changed HTML, CSS, JavaScript
- You updated server-side code
- You added new features

### 2. Database Changes

Three options:

#### Nothing (Skip)
- No database changes
- Just deploying code and/or artwork

#### Full Backup & Restore ⚠️ DESTRUCTIVE
- Creates backup of local database
- **WIPES ALL AZURE DATA**
- Restores from local backup

**WARNING**: This deletes all Azure user data, achievements, conversations, etc.

**Only use when:**
- Initial deployment
- Major database restructure
- Beta testing data doesn't matter

#### Run Migration Script
- Shows list of all available migrations
- Applies only schema changes (preserves data)
- Safe for production

**Choose this when:**
- You added new columns/tables
- You created new functions
- You need schema updates without data loss

### 3. Upload Artwork

Options:
- **Nothing** - Skip artwork upload
- **frame** - Upload frame images only
- **thumbs** - Upload thumbnail images only
- **extracted** - Upload extracted images
- **linked** - Upload linked images
- **all** - Upload entire artwork directory

Only uploads **new files** - doesn't re-upload existing ones.

**Choose this when:**
- You generated new creature artwork
- You added new frame images
- You want to update specific artwork folders

## Example Workflows

### Daily Code Update
```
1. Push code? y
   Commit message: Fix login bug
2. Database? 1 (nothing)
3. Artwork? 1 (nothing)
```

### New Feature with Database Changes
```
1. Push code? y
   Commit message: Add daily rewards feature
2. Database? 3 (migration)
   Choose: 37_daily_rewards.sql
3. Artwork? 1 (nothing)
```

### New Creature Batch
```
1. Push code? n
2. Database? 1 (nothing)
3. Artwork? 4 (extracted)
```

### Full Deployment (Initial Setup)
```
1. Push code? y
   Commit message: Initial deployment
2. Database? 2 (full restore) ⚠️
   Confirm: YES
3. Artwork? 6 (all)
```

## Tips

- **Always test locally first** before pushing to Azure
- **Use migrations** instead of full restore whenever possible
- **Backup important data** before full restore
- **Check Azure deployment** status after pushing code
- **Wait 2-3 minutes** for Azure to redeploy after code push

## Troubleshooting

### Git Push Fails
- Check your git credentials
- Ensure you're on the correct branch
- Verify remote URL: `git remote -v`

### Migration Fails
- Check migration SQL syntax
- Verify database connection (`.env.azure`)
- Check if migration was already run

### Artwork Upload Fails
- Verify Azure CLI is logged in: `az login`
- Check storage account permissions
- Ensure artwork files exist locally

## Azure Resources

- **Website**: https://chatlings-dev.azurewebsites.net
- **Database**: psql-chatlings-dev-lyg7hq.postgres.database.azure.com
- **Blob Storage**: https://chatlingsartwork.blob.core.windows.net/artwork/

## Related Files

- `scripts/complete-backup.js` - Creates database backup
- `scripts/complete-restore.js` - Restores database to Azure
- `scripts/run-migration-XX.js` - Migration runner scripts
- `scripts/sync-artwork-to-azure.js` - Artwork sync script
- `docs/DEPLOYMENT_WORKFLOW.md` - Detailed deployment guide
