# Chatlings Quick Start Guide

## You Got an Error? Here's the Fix!

The error you saw means PostgreSQL's command-line tool (`psql`) isn't in your Windows PATH. Don't worry - we have two easy solutions:

## Solution 1: Use Node.js Setup (Recommended - Easiest!)

This method doesn't require `psql` at all.

### Step 1: Check if PostgreSQL is Running

First, let's check if PostgreSQL is installed:

```batch
cd chatlings\scripts\bat
check_postgres.bat
```

### Step 2: Install PostgreSQL (if needed)

If PostgreSQL is **not installed**:

1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer
3. **IMPORTANT:** During installation, set the admin password to: `!1Swagger!1`
   (Or if you use a different password, update it in the scripts later)
4. Install on default port: 5432
5. Complete the installation

### Step 3: Run Node.js Setup

```batch
cd chatlings\scripts\bat
setup_nodejs.bat
```

This will:
- Check that Node.js is installed
- Install the required PostgreSQL driver
- Create the database
- Create all tables
- Import all 3,408 creatures and lore data

**Done!** Your database is ready.

---

## Solution 2: Add PostgreSQL to PATH (Advanced)

If you prefer to use the original `psql` method:

### Find Your PostgreSQL Installation

PostgreSQL is usually installed in one of these locations:
- `C:\Program Files\PostgreSQL\14\bin`
- `C:\Program Files\PostgreSQL\15\bin`
- `C:\Program Files (x86)\PostgreSQL\14\bin`

### Add to Windows PATH

1. Press `Windows + R`
2. Type `sysdm.cpl` and press Enter
3. Click "Environment Variables"
4. Under "System variables", find "Path" and click "Edit"
5. Click "New"
6. Add your PostgreSQL bin path (e.g., `C:\Program Files\PostgreSQL\14\bin`)
7. Click OK on all dialogs
8. **Close and reopen your Command Prompt**

### Run Setup

```batch
cd chatlings\scripts\bat
setup_complete.bat
```

---

## Verify Installation

After setup completes, test your database:

### Option A: Using Node.js

```batch
cd chatlings\backend
npm install
node -e "const db = require('./src/config/database'); db.query('SELECT COUNT(*) FROM creatures').then(r => console.log('Creatures:', r.rows[0].count)).then(() => process.exit(0))"
```

### Option B: Using PostgreSQL Tools

If you installed pgAdmin (comes with PostgreSQL):
1. Open pgAdmin
2. Connect to localhost
3. Find the "chatlings" database
4. Browse the tables to see your 3,408 creatures!

---

## Start the Backend Server

Once the database is set up:

```batch
cd chatlings\backend
npm install
npm run dev
```

Then open your browser to:
- http://localhost:3000/health - Health check
- http://localhost:3000/api/creatures - View creatures

---

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

PostgreSQL service isn't running:

**Windows:**
1. Press `Windows + R`
2. Type `services.msc` and press Enter
3. Find "postgresql-x64-XX" (where XX is your version)
4. Right-click and select "Start"

OR use the batch script:
```batch
cd chatlings\scripts\bat
start_services.bat
```

### "password authentication failed"

The password is incorrect. Default in our scripts is `!1Swagger!1`

To change it:
1. Edit `chatlings\backend\src\config\database.js`
2. Change the password in the config
3. Edit `chatlings\scripts\setup-database.js`
4. Change the password at the top

### "database already exists"

The Node.js setup script will ask if you want to drop and recreate it.
- Answer `yes` to start fresh
- Answer `no` to keep existing data

### Need Help?

Check these files:
- `chatlings/README.md` - Full project documentation
- `chatlings/docs/architecture/DATABASE.md` - Database details
- `chatlings/SETUP_COMPLETE.md` - Complete setup guide

---

## Next Steps

After your database is running:

1. **Backend Development**
   - Set up environment variables (copy `.env.example` to `.env`)
   - Implement user authentication
   - Add social media API integrations

2. **Frontend Development**
   - Set up React web app
   - Build creature collection UI
   - Create encounter animations

3. **Testing**
   - Test creature API endpoints
   - Review the lore in the database
   - Plan your animation generation pipeline

Good luck building Chatlings! 🎮✨
