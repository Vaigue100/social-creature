# Environment Files Guide

## Current .env File Structure

### Root Level: `.env` (MAIN FILE)
**Location:** `C:\Users\Barney\Social Creature\.env`

This is the main environment file used by the application. Contains:

- **Database Configuration** (local development)
  - DB_HOST=localhost
  - DB_PORT=5432
  - DB_NAME=chatlings
  - DB_USER=postgres
  - DB_PASSWORD (set for local PostgreSQL)

- **OAuth/API Keys**
  - Google OAuth credentials
  - YouTube API credentials

- **Azure Blob Storage** (for animations and artwork)
  - AZURE_STORAGE_CONNECTION_STRING
  - AZURE_STORAGE_CONTAINER_ANIMATIONS=animations
  - AZURE_STORAGE_CONTAINER_ARTWORK=artwork

- **Artwork Storage Configuration**
  - ARTWORK_STORAGE_MODE=azure (or 'local' for development)
  - AZURE_ARTWORK_BASE_URL

- **Web Push Notifications**
  - VAPID keys for push notifications

### Chatlings Folder: `.env.azure`
**Location:** `C:\Users\Barney\Social Creature\chatlings\.env.azure`

Contains Azure-specific database configuration:
- DB_HOST (Azure PostgreSQL server)
- DB_NAME=chatlings
- DB_USER=chatlings_admin
- DB_PASSWORD (Azure DB password)
- DB_PORT=5432
- DB_SSL=true

**Used by:** Migration scripts and deployment processes that need to connect to Azure DB

## Storage Mode Configuration

### Setting: `ARTWORK_STORAGE_MODE`

**Options:**
- `azure` (default) - Images served from Azure Blob Storage
- `local` - Images served from local `chatlings/artwork/` folder

### How It Works:

#### When `ARTWORK_STORAGE_MODE=azure`:
- Admin pages (manage-animations.html, family-browser.html) load images from: `https://chatlingsdevlyg7hq.blob.core.windows.net/artwork/linked/`
- User pages load images from Azure blob storage
- Requires images to be synced to Azure first

#### When `ARTWORK_STORAGE_MODE=local`:
- Admin pages (manage-animations.html, family-browser.html) load images from: `http://localhost:3000/images/`
- Images served from `chatlings/artwork/linked/` folder
- Useful for development before syncing to Azure

### Switching Between Modes:

**For Development (Local Images):**
```env
ARTWORK_STORAGE_MODE=local
```

**For Production (Azure Images):**
```env
ARTWORK_STORAGE_MODE=azure
```

## Important Security Notes

⚠️ **The root `.env` file contains sensitive credentials:**
- Database passwords
- OAuth client secrets
- Azure storage connection strings
- VAPID private keys

**Never commit `.env` files to git!**

The `.gitignore` is configured to exclude:
- `.env`
- `.env.local`
- `.env.*.local`
- `chatlings/.env.azure`

## Environment File Loading

### Server Startup:
```javascript
// admin-server.js loads root .env
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
```

### Migration Scripts:
```javascript
// Scripts load .env.azure first (for Azure DB), then parent .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env.azure') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
```

## Consolidation Recommendation

Currently there are 2 active .env files:
1. Root `.env` - Main configuration
2. `chatlings/.env.azure` - Azure DB credentials for migrations

**Recommendation:** Keep this structure as it allows:
- Local development with local DB (root `.env`)
- Production migrations with Azure DB (`.env.azure`)
- Easy switching between environments

## Example: Adding New Environment Variable

1. Add to root `.env`:
```env
NEW_API_KEY=your_key_here
```

2. Access in code:
```javascript
const apiKey = process.env.NEW_API_KEY;
```

3. Add to `.env.example` for documentation:
```env
NEW_API_KEY=your_api_key_here
```

## Troubleshooting

### Images not loading in admin pages?
1. Check `ARTWORK_STORAGE_MODE` in `.env`
2. If set to 'azure', ensure images are synced to Azure Blob Storage
3. If set to 'local', ensure images exist in `chatlings/artwork/linked/`
4. Check browser console for 404 errors

### Database connection errors?
1. For local development: Check root `.env` DB credentials
2. For Azure/migrations: Check `chatlings/.env.azure` credentials
3. Verify PostgreSQL service is running (local) or firewall rules (Azure)

### OAuth/YouTube not working?
1. Check OAuth credentials in root `.env`
2. Verify callback URLs match your environment (localhost vs production)
3. Check that credentials haven't expired in Google Cloud Console
