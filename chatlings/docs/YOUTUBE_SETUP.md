# YouTube Integration Setup Guide

This guide will help you set up the YouTube integration for the Chatlings game.

## Overview

The YouTube integration allows users to:
- Connect their YouTube account via OAuth
- Discover chatlings by commenting on YouTube videos
- Each YouTube channel has a unique chatling that changes every 24 hours
- Build a collection of chatlings they've encountered

## Prerequisites

1. Node.js and npm installed
2. PostgreSQL database running
3. Google Cloud Platform account

## Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project or select an existing one

3. Enable the YouTube Data API v3:
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/youtube/callback`
   - For production, add your domain's callback URL as well
   - Click "Create"

5. Save your credentials:
   - Copy the Client ID
   - Copy the Client Secret

## Step 2: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here

# YouTube OAuth Configuration
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
```

## Step 3: Install Dependencies

Run the following command to install required packages:

```bash
npm install googleapis
```

## Step 4: Run Database Migration

The YouTube integration requires additional database tables:

```bash
node scripts/run-youtube-migration.js
```

This will create:
- `youtube_channel_assignments` - Tracks which chatling is assigned to each channel
- `notifications` - Stores user notifications
- `achievements` - Defines available achievements
- `user_achievements` - Tracks unlocked achievements

It also adds YouTube-related columns to the `users` table.

## Step 5: Start the Server

```bash
node admin-server.js
```

The server will start on port 3000 by default.

## Step 6: Test the Integration

1. Open your browser to: `http://localhost:3000/user`

2. Navigate to the "Integrations" page

3. Click "Connect YouTube"

4. You'll be redirected to Google's OAuth consent screen

5. Grant the required permissions:
   - View your YouTube account
   - View and manage your YouTube videos

6. After authorization, you'll be redirected back to the app

7. The discovery service will start checking your comments every 5 minutes

## How It Works

### OAuth Flow

1. User clicks "Connect YouTube"
2. User is redirected to Google OAuth consent screen
3. User grants permissions
4. Google redirects back with authorization code
5. Server exchanges code for access & refresh tokens
6. Tokens are stored in database

### Discovery Process

1. Every 5 minutes, the service polls the YouTube API
2. For each connected user, it fetches their recent comments
3. For each comment on a video:
   - Gets the channel ID of the video owner
   - Checks if that channel has a chatling assigned
   - If not, assigns a random chatling (valid for 24 hours)
   - Records the encounter for the user
   - Creates a notification if it's a new discovery

4. Achievement checking:
   - After new discoveries, checks if user unlocked achievements
   - Examples: "First Friend" (1 discovery), "Social Butterfly" (10 discoveries)

### Chatling Assignment

- Each YouTube channel gets ONE chatling at a time
- The chatling persists for 24 hours
- After 24 hours, the assignment expires
- Next user to comment gets a new randomly assigned chatling
- Multiple users can meet the same chatling on the same channel

## API Endpoints

### User Endpoints

- `GET /api/user/collection` - Get user's discovered chatlings
- `GET /api/user/achievements` - Get achievements and progress
- `GET /api/user/youtube-status` - Check YouTube connection status
- `POST /api/user/youtube-disconnect` - Disconnect YouTube
- `POST /api/user/check-discoveries` - Manually trigger discovery check

### OAuth Endpoints

- `GET /api/auth/youtube/authorize` - Start OAuth flow
- `GET /api/auth/youtube/callback` - OAuth callback handler

## Troubleshooting

### "YouTube OAuth not configured" error

Make sure you've set the `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` in your `.env` file.

### OAuth redirect mismatch

Ensure the redirect URI in Google Cloud Console exactly matches the one in your `.env` file.

### No comments being discovered

- Check that the discovery service is running
- Verify your access token hasn't expired
- Make sure you've commented on videos AFTER connecting your YouTube account

### Token expired errors

The service automatically refreshes expired tokens. If you see persistent errors:
1. Disconnect and reconnect your YouTube account
2. Check that your OAuth credentials are valid

## Security Notes

- Never commit `.env` file to version control
- Keep your Client Secret secure
- Tokens are stored encrypted in the database
- Users can disconnect at any time

## Future Enhancements

Potential improvements:
- Real-time discovery using webhooks instead of polling
- Browser extension for instant notifications
- Support for other platforms (Reddit, Twitter, etc.)
- Chatling trading between users
- Daily/weekly challenges

## Support

For issues or questions, check the project's GitHub issues page.
