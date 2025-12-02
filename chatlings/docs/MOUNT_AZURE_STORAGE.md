# Mount Azure Blob Storage as Drive

## Option 1: Azure Storage Explorer (EASIEST - RECOMMENDED)

### Install
1. Download: https://azure.microsoft.com/en-us/products/storage/storage-explorer/
2. Install and launch
3. Sign in with your Azure account

### Use
1. Expand your subscription
2. Navigate to: Storage Accounts → chatlingsartwork → Blob Containers → artwork
3. **Drag and drop** your artwork folders directly
4. Click "Upload" → "Upload Folder" to upload entire folders

### Benefits
- Visual drag-and-drop interface
- Automatically skips existing files
- Shows upload progress
- Easy to manage files

---

## Option 2: Mount as Network Drive with Rclone

This mounts blob storage as a drive letter (e.g., Z:) so you can use it like any folder.

### Install Rclone
1. Download: https://rclone.org/downloads/
2. Extract to `C:\rclone\`
3. Add `C:\rclone\` to your PATH

### Configure Rclone

Run this in Command Prompt:

```cmd
rclone config
```

Follow the prompts:
1. `n` - New remote
2. Name: `chatlings`
3. Storage: `azureblob` (type the number for Azure Blob Storage)
4. Account name: `chatlingsartwork`
5. Key: (get from Azure Portal or run this command):
   ```cmd
   az storage account keys list --account-name chatlingsartwork --resource-group chatlings-dev-rg --query "[0].value" -o tsv
   ```
6. Leave other options as default
7. `q` to quit

### Mount as Drive

```cmd
rclone mount chatlings:artwork Z: --vfs-cache-mode full
```

Now `Z:\` is your blob storage! You can:
- Copy files: `copy artwork\frame\*.png Z:\frame\`
- Use Windows Explorer to drag and drop
- Access it from any program

### Auto-mount on Startup (Optional)

Create `mount-azure-storage.bat`:
```batch
@echo off
start /min rclone mount chatlings:artwork Z: --vfs-cache-mode full
```

Put it in your Startup folder.

---

## Option 3: AzCopy (Command Line)

Microsoft's official command-line tool for bulk uploads.

### Install
Download from: https://aka.ms/downloadazcopy

### Sync Entire Artwork Folder

```cmd
azcopy sync "artwork" "https://chatlingsartwork.blob.core.windows.net/artwork" --recursive
```

### Sync Just Frame Folder

```cmd
azcopy sync "artwork\frame" "https://chatlingsartwork.blob.core.windows.net/artwork/frame"
```

Benefits:
- Very fast for bulk uploads
- Only uploads changed files
- Good for automated scripts

---

## Recommendation

**For you: Use Azure Storage Explorer**

1. Install it once
2. Bookmark the artwork container
3. Whenever you generate new artwork:
   - Open Storage Explorer
   - Navigate to artwork container
   - Drag and drop the new folder
   - Done!

No command line, no scripts, just drag and drop like Google Drive.

---

## Current Blob Storage Structure

```
artwork/
├── frame/
│   ├── dragon.png
│   ├── floof.png
│   ├── gothic.png
│   └── ... (13 files currently)
└── (other folders you upload)
```

When you upload `artwork\extracted\`, it will appear as `artwork/extracted/` in blob storage automatically.
