# Security Configuration

## Environment Variables

All sensitive credentials are stored in `.env` file which is **excluded from git**.

### Setup on New Machine

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   ```bash
   # Edit with your actual password
   DB_PASSWORD=your_actual_password_here
   ```

### Current Configuration

The following environment variables are used:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `chatlings` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | **Required** |

### Files Using Environment Variables

**Python Scripts:**
- `chatlings/scripts/generate_creature_art.py`
- All scripts use `python-dotenv` to load `.env`

**Node.js Scripts:**
- `chatlings/scripts/setup-database.js`
- `chatlings/backend/src/config/database.js`
- `chatlings/scripts/db-config.js` (shared config)
- All scripts use `dotenv` package

### Adding New Secrets

To add API keys or other secrets:

1. **Add to `.env`:**
   ```bash
   REPLICATE_API_TOKEN=your_token_here
   ```

2. **Add to `.env.example` (without value):**
   ```bash
   REPLICATE_API_TOKEN=your_token_here
   ```

3. **Access in code:**
   ```javascript
   // Node.js
   const apiToken = process.env.REPLICATE_API_TOKEN;
   ```

   ```python
   # Python
   import os
   api_token = os.getenv('REPLICATE_API_TOKEN')
   ```

## What's Protected

The `.gitignore` file excludes:
- `.env` files (all variants)
- `node_modules/`
- Python cache files
- Generated artwork images
- Database dumps
- IDE settings
- OS temporary files

## Important Notes

⚠️ **Never commit `.env` to git!**
⚠️ **Always use `.env.example` as a template**
⚠️ **Share credentials securely (not via email/chat)**

## Verifying Protection

Before committing, verify no secrets are included:

```bash
# Check what will be committed
git status

# Verify .env is ignored
git check-ignore .env
# Should output: .env

# Search for any remaining hardcoded passwords
grep -r "password" --exclude-dir=node_modules --exclude=".git" .
```

## Transferring to New Machine

When moving to your gaming PC:

1. **Transfer project files** (git clone, OneDrive, etc.)
2. **Copy `.env` separately** (secure method)
3. **Or recreate `.env`** from `.env.example`
4. **Install dependencies:**
   ```bash
   npm install
   pip install -r chatlings/scripts/requirements.txt
   ```
