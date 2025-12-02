# Animation Storage Setup

Animations are stored in **two locations**:
1. **Locally** in `chatlings/animations/processed/` (for development and backup)
2. **Azure Blob Storage** (for production and CDN delivery)

## Setup Instructions

### 1. Get Azure Storage Connection String

Run this command to get your Azure Storage connection string:

```bash
cd chatlings
scripts\get-azure-storage-key.bat
```

Or manually run:

```bash
az storage account show-connection-string --name chatlingsartwork --resource-group chatlings-dev-rg --query connectionString -o tsv
```

### 2. Add to .env File

Create or update your `.env` file (in the `chatlings` folder):

```bash
# Azure Blob Storage (for animations and artwork)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=chatlingsartwork;...
AZURE_STORAGE_CONTAINER_ANIMATIONS=animations
```

**Note:** Copy the ENTIRE connection string from the previous command.

### 3. Sync Existing Animations (Optional)

If you already have animations in `chatlings/animations/processed/`, sync them to Azure:

```bash
cd chatlings
node scripts/sync-animations-to-azure.js
```

This will:
- Upload all existing animations to Azure Blob Storage
- Skip files that already exist
- Show progress for each file

### 4. Restart Server

Restart your server to pick up the new environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
node admin-server.js
```

You should see this message on startup:
```
✓ Azure Blob Storage configured for animations (container: animations)
```

## How It Works

When you upload an animation via the admin panel:

1. **File is saved locally** to `chatlings/animations/processed/`
2. **File is uploaded to Azure** to `animations/processed/` container
3. **Database stores the local path** (for local development)
4. **Azure URL is logged** (for production use)

## Viewing Uploaded Animations

### Azure Portal
1. Go to: https://portal.azure.com
2. Navigate to: Storage Accounts → chatlingsartwork → Containers → animations
3. You'll see all your uploaded animations

### Azure Storage Explorer (Recommended)
1. Download: https://azure.microsoft.com/en-us/products/storage/storage-explorer/
2. Sign in with your Azure account
3. Navigate to: chatlingsartwork → Blob Containers → animations → processed
4. View, download, or manage your animations

### Direct URL
Animations are publicly accessible at:
```
https://chatlingsartwork.blob.core.windows.net/animations/processed/<filename>
```

Example:
```
https://chatlingsartwork.blob.core.windows.net/animations/processed/468d1e5a-45a4-4da2-9da8-6e745f6e7988_pose_1764479827238.mp4
```

## Troubleshooting

### Connection String Not Working
- Make sure you copied the ENTIRE string (it's very long)
- No quotes around the connection string in .env
- No spaces before or after the = sign

### Upload Fails
- Check that you're logged into Azure CLI: `az login`
- Verify your storage account exists: `az storage account list`
- Check container permissions in Azure Portal

### Missing Animations
- Run the sync script: `node scripts/sync-animations-to-azure.js`
- Check the local folder: `chatlings/animations/processed/`
- Verify in Azure Storage Explorer

## Storage Costs

Azure Blob Storage pricing (approximate):
- **Storage**: ~$0.02/GB per month
- **Uploads**: Free
- **Downloads**: ~$0.09/GB

For 100 animations at ~5MB each:
- Total size: ~500MB
- Monthly cost: **~$0.01 storage + bandwidth**

Very affordable! 💰
