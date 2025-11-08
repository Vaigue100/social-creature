# Chatlings - Quick Start Guide

## What Changed?

Your Chatlings project has been updated to a **privacy-first, YouTube likes-based reward system**. This is more compliant with YouTube's API terms and uses fewer quota units.

## Key Differences from Original Design

| Original (Comments) | New (Likes) |
|---------------------|-------------|
| Polls YouTube API every 5 min | On-demand, session-based only |
| Tracks user comments | Fetches liked videos once |
| Stores OAuth tokens in DB | No token storage (session-only) |
| Chatling per channel | Chatling per video |
| Comment-based discovery | Like-based rewards |
| 5 units/call polling | 1 unit/call on-demand |

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
cd "C:\Users\Barney\Social Creature\chatlings"
npm install
```

### 2. Configure Environment

Create/update `.env` in project root:

```env
# Database (if not already set)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password

# Session Secret (required)
SESSION_SECRET=change_this_to_something_random_and_secure

# YouTube OAuth (optional - get from Google Cloud Console)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
```

### 3. Run Migration (Already Done!)

The migration has already been executed, but if you need to run it again:

```bash
npm run migrate:likes
```

### 4. Start the Server

```bash
npm start
```

### 5. Test It Out

1. Open: http://localhost:3000/user/login.html
2. Enter any username (e.g., "testuser")
3. Click "Login / Sign Up"
4. Navigate to **Integrations** page
5. Click **"Claim Rewards from Liked Videos"**

**Note**: Without YouTube OAuth configured, you'll get an error. See setup below.

## 📺 YouTube OAuth Setup (Required for Full Functionality)

### Option 1: Quick Test (Skip YouTube)

You can test the UI without YouTube:
1. Login as any user
2. View empty collection
3. View achievements
4. UI works, but can't claim rewards yet

### Option 2: Full Setup (15 minutes)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create or Select Project**

3. **Enable YouTube Data API v3**:
   - Navigation Menu → APIs & Services → Library
   - Search "YouTube Data API v3"
   - Click "Enable"

4. **Create OAuth Credentials**:
   - APIs & Services → Credentials
   - "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Chatlings Local Dev"
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/youtube/callback
     ```
   - Click "Create"

5. **Copy Credentials**:
   - Copy Client ID
   - Copy Client Secret
   - Add to `.env` file

6. **Restart Server**:
   ```bash
   npm start
   ```

7. **Test**:
   - Login to user hub
   - Go to Integrations
   - Click "Claim Rewards from Liked Videos"
   - Authorize with your Google account
   - See results!

## 🎮 How the Game Works

### For Users

1. **Like YouTube videos** as you normally would
2. **Connect to Chatlings** (via Integrations page)
3. **Claim rewards** - system fetches your 50 most recent likes
4. **Get chatlings** - each video has a unique chatling for 24 hours
5. **Build collection** - keep claiming to collect more chatlings
6. **Unlock achievements** - reach milestones for bonus points

### For the System

```
User likes video → Video gets chatling assigned (24hr) → User claims reward
                                                              ↓
                          Reward permanently added to user's collection
                                                              ↓
                          If another user likes same video within 24hrs → Same chatling
                                                              ↓
                          After 24hrs → Video gets new random chatling
```

### Privacy Features

✅ No long-term OAuth storage
✅ Access token used once then discarded
✅ No video history stored
✅ No user activity tracking
✅ Video-chatling mappings anonymous
✅ Auto-expire after 24 hours

## 📁 File Structure

```
chatlings/
├── user/                          # User-facing web app
│   ├── login.html                 # Simple username login
│   ├── index.html                 # Dashboard
│   ├── collections.html           # View claimed rewards
│   ├── achievements.html          # Track progress
│   └── integrations.html          # YouTube connection
├── services/
│   ├── index.js                   # Service initialization
│   └── youtube-likes-service.js   # YouTube integration
├── scripts/
│   ├── run-youtube-likes-migration.js
│   └── sql/
│       └── migration_youtube_likes.sql
├── admin-server.js                # Main server (updated)
├── package.json                   # Dependencies
├── PRIVACY_FIRST_README.md       # Full documentation
└── QUICKSTART.md                  # This file
```

## 🧪 Testing Without Real Data

### Create Test User

```sql
INSERT INTO users (username, email)
VALUES ('testuser', 'test@example.com');
```

### Manually Add Test Rewards

```sql
-- Get a random creature
SELECT id FROM creatures WHERE selected_image IS NOT NULL LIMIT 1;

-- Add to user's collection (replace UUIDs with actual values)
INSERT INTO user_rewards (user_id, creature_id, platform)
VALUES
  ('USER_ID_HERE', 'CREATURE_ID_HERE', 'YouTube');
```

### View in Collection

Login as the user and go to Collections page - you'll see the test reward!

## ⚡ Quick Commands

```bash
# Start server
npm start

# Run migration
npm run migrate:likes

# Install dependencies
npm install
```

## 🐛 Troubleshooting

### "YouTube OAuth not configured"

Add credentials to `.env` file (see YouTube OAuth Setup above)

### "Not authenticated" errors

Make sure you're logged in via `/user/login.html` first

### No rewards when connecting YouTube

- Verify you've liked some videos recently
- Check server logs for errors
- Make sure OAuth redirect URI matches exactly

### Port 3000 already in use

Change `PORT` variable in `admin-server.js` or kill existing process

## 📚 Documentation

- **PRIVACY_FIRST_README.md** - Complete technical documentation
- **YOUTUBE_SETUP.md** - Original YouTube setup guide
- **USER_HUB_README.md** - Original user hub documentation

## 🎯 Next Steps

1. ✅ Get server running
2. ✅ Set up YouTube OAuth
3. ✅ Test claiming rewards
4. ⬜ Add proper user authentication (replace simple login)
5. ⬜ Deploy to production
6. ⬜ Add more platforms (Reddit, etc.)

## 🔒 Privacy Compliance

This implementation is designed to comply with:
- YouTube API Services Terms of Service
- Google API Services User Data Policy
- GDPR (minimal data collection)
- General privacy best practices

See `PRIVACY_FIRST_README.md` for full details.

---

**Need Help?** Check the detailed documentation in `PRIVACY_FIRST_README.md`

**Ready to go?** Run `npm start` and visit http://localhost:3000/user/login.html
