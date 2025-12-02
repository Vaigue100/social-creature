# Batch Files Guide

## Main Tools (Use These)

### `azure-publish.bat` ⭐ MAIN DEPLOYMENT TOOL
**What it does:** Interactive tool for deploying to Azure
- Pushes code to GitHub AND Azure (deploys the app)
- Runs database migrations
- Uploads artwork to blob storage

**When to use:** Any time you want to deploy changes to Azure

**Usage:**
```bash
azure-publish.bat
```

---

### `start-all-services.bat`
**What it does:** Starts all local development services
- Database (PostgreSQL)
- Admin server
- Any background services

**When to use:** Starting local development

**Usage:**
```bash
start-all-services.bat
```

---

### `stop-all-services.bat`
**What it does:** Stops all local development services

**When to use:** Shutting down local development

**Usage:**
```bash
stop-all-services.bat
```

---

### `backup-database.bat`
**What it does:** Creates a backup of your local database

**When to use:** Before major changes, periodic backups

**Usage:**
```bash
backup-database.bat
```

---

## Utility Scripts (Optional)

### `add-all-chatlings-to-Test001.bat`
Adds all chatlings to a test user account

### `remove-chatlings.bat`
Removes chatlings from your collection

### `backup-to-google-drive.bat`
Full backup including database and artwork to Google Drive

### `copy-to-google-drive.bat`
Copies existing backups to Google Drive

### `start-server-debug.bat`
Starts server with error logging to file

### `switch-account.bat`
Switch between user accounts (testing)

---

## Artwork Upload

**Don't use batch files for artwork uploads!**

Use **Azure Storage Explorer** instead:
1. Download: https://azure.microsoft.com/en-us/products/storage/storage-explorer/
2. Connect using the connection string (see docs/MOUNT_AZURE_STORAGE.md)
3. Drag and drop artwork folders

This is much easier and more reliable than the batch scripts.

---

## Quick Reference

**Deploy code changes to Azure:**
```bash
azure-publish.bat
# Choose: [1] y (push code)
```

**Run database migration on Azure:**
```bash
azure-publish.bat
# Choose: [3] run migration
```

**Start local development:**
```bash
start-all-services.bat
```

**Stop local development:**
```bash
stop-all-services.bat
```

---

## Important Notes

### Two Git Remotes

Your repo has two remotes:
- **origin** → GitHub (private backup)
- **azure** → Azure Git (deploys the app)

`azure-publish.bat` automatically pushes to **both** when you deploy.

### Manual Git Commands

If you want to push manually:
```bash
git add .
git commit -m "Your message"
git push origin main   # Push to GitHub
git push azure main    # Deploy to Azure
```

### Deployment Time

After pushing to Azure, wait **2-3 minutes** for deployment to complete.
