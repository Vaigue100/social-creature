# Chatlings - Privacy-First YouTube Rewards System

## Overview

Chatlings is a cross-platform collection game where users earn unique digital rewards (chatlings) by liking YouTube videos. The system is designed with privacy as the top priority - no long-term user data is stored, and all interactions are session-based.

## Key Features

### Privacy-First Design

- **No OAuth Token Storage**: Access tokens are never stored in the database
- **Session-Based Only**: Tokens exist only during the OAuth callback and are discarded immediately
- **Anonymous Video Mappings**: Video-reward assignments contain no user identification
- **24-Hour Data TTL**: Video-reward mappings auto-expire after 24 hours
- **Decoupled Rewards**: Once claimed, rewards are completely separated from the platform

### Game Mechanics

1. **User Likes a Video** → System assigns a chatling to that video (valid for 24 hours)
2. **User Connects YouTube** → We fetch their liked videos and process rewards
3. **Reward Claimed** → The chatling is permanently added to user's collection
4. **Shared Rewards** → If another user likes the same video within 24 hours, they get the same chatling
5. **Expiry & Reset** → After 24 hours, the video gets a new random chatling

### Achievements

- **First Reward** - Claim your first chatling (10 points)
- **Collector** - Claim 10 different chatlings (25 points)
- **Super Collector** - Claim 50 different chatlings (50 points)
- **Master Collector** - Claim 100 different chatlings (100 points)
- **Epic Seeker** - Claim an Epic chatling (50 points)
- **Legendary Hunter** - Claim a Legendary chatling (100 points)

## Technical Architecture

### Database Schema

```sql
-- Anonymous video-reward mapping (24hr TTL)
video_rewards (
    video_id VARCHAR(255) UNIQUE,
    creature_id UUID,
    expires_at TIMESTAMP
)

-- Permanent user rewards (decoupled from videos)
user_rewards (
    user_id UUID,
    creature_id UUID,
    claimed_at TIMESTAMP,
    platform VARCHAR(50)
)

-- Achievements
achievements (
    achievement_key VARCHAR(100),
    title VARCHAR(255),
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    points INTEGER
)

-- User achievements
user_achievements (
    user_id UUID,
    achievement_id INTEGER,
    unlocked_at TIMESTAMP
)
```

### YouTube API Integration

**Scope Required**: `https://www.googleapis.com/auth/youtube.readonly`

**API Call**: `playlistItems.list` with `playlistId=LL` (Liked List)
- Cost: 1 quota unit per call
- Returns: 50 most recently liked videos
- Default quota: 10,000 units/day = 10,000 users/day

**Flow**:
1. User clicks "Claim Rewards"
2. OAuth redirect to Google
3. User authorizes (read-only access to liked videos)
4. Callback with authorization code
5. Exchange for access token (no refresh token)
6. Fetch liked videos immediately
7. Process and claim rewards
8. **Discard token** - never stored
9. Redirect user with results

### Session Management

Uses `express-session` for temporary authentication:
```javascript
{
  secret: process.env.SESSION_SECRET,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false // Set true in production with HTTPS
  }
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Required packages:
- `express` - Web server
- `express-session` - Session management
- `pg` - PostgreSQL client
- `googleapis` - YouTube Data API v3
- `dotenv` - Environment configuration

### 2. Run Database Migration

```bash
node scripts/run-youtube-likes-migration.js
```

This creates:
- `video_rewards` table
- `user_rewards` table
- `notifications` table
- `achievements` table (with seed data)
- `user_achievements` table

### 3. Configure YouTube OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable **YouTube Data API v3**
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `http://localhost:3000/api/auth/youtube/callback`
6. Save Client ID and Client Secret

Add to `.env`:
```env
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
SESSION_SECRET=your_random_secret_here
```

### 4. Start the Server

```bash
npm start
```

Server runs on port 3000:
- User Hub: http://localhost:3000/user/login.html
- Admin Console: http://localhost:3000

## Usage Guide

### For Users

1. **Login** (http://localhost:3000/user/login.html)
   - Enter any username (no password needed)
   - Creates or finds user account

2. **Navigate to Integrations**
   - Click "Claim Rewards from Liked Videos"

3. **Authorize YouTube**
   - Redirected to Google OAuth
   - Grant read-only access to liked videos

4. **Claim Rewards**
   - System fetches your 50 most recent liked videos
   - Assigns chatlings to videos (or uses existing if within 24hrs)
   - Claims rewards for your collection
   - Shows how many new chatlings you got

5. **View Collection**
   - See all claimed chatlings
   - Filter by rarity
   - Sort by recency, name, or rarity

6. **Track Achievements**
   - View unlocked achievements
   - See progress towards locked achievements
   - Track total points earned

### For Developers

#### API Endpoints

**Authentication**:
- `POST /api/auth/login` - Simple username-based login (temp)
- `POST /api/auth/logout` - Destroy session

**User Data**:
- `GET /api/user/me` - Get current user info
- `GET /api/user/stats` - Get user statistics
- `GET /api/user/collection` - Get claimed rewards
- `GET /api/user/achievements` - Get achievements with progress
- `GET /api/user/notifications` - Get recent notifications

**YouTube Integration**:
- `GET /api/auth/youtube/authorize` - Start OAuth flow
- `GET /api/auth/youtube/callback` - OAuth callback (processes likes)

#### Services

**YouTubeLikesService** (`services/youtube-likes-service.js`):
- `getAuthorizationUrl(sessionId)` - Generate OAuth URL
- `getTokensFromCode(code)` - Exchange code for token
- `getLikedVideos(accessToken)` - Fetch user's liked videos
- `processLikesAndClaimRewards(userId, accessToken)` - Main processing logic
- `getOrAssignVideoReward(videoId)` - Get/create video-chatling mapping
- `claimReward(userId, creatureId)` - Add reward to user's collection
- `checkAchievements(userId)` - Check and unlock achievements

## Privacy & Compliance

### What We Store

**Permanently**:
- User ID, username, email (minimal user info)
- Claimed rewards (creature ID, claimed date, platform)
- Achievement unlocks

**Temporarily** (24 hours):
- Video ID → Creature ID mappings (auto-deleted)
- Notifications (can be marked read/deleted)

**Never Stored**:
- OAuth access tokens or refresh tokens
- YouTube user IDs or channel IDs
- Video titles, thumbnails, or metadata
- Liked video timestamps or user activity

### Compliance

**YouTube API Services Terms**: ✅ Compliant
- Only accesses data with user consent
- Does not store PII beyond what's necessary
- Does not scrape or access YouTube app directly
- Does not use data for advertising or profiling
- Clear disclosure of data usage

**GDPR Considerations**:
- Minimal data collection
- Session-based processing
- Automatic data expiry
- User can delete account anytime
- No tracking or profiling

### Privacy Policy Points

Include in your privacy policy:
1. We access your YouTube liked videos list with your permission
2. We process this data once per session and immediately discard access
3. We only store which chatlings you've claimed, not which videos you liked
4. Video-chatling mappings are anonymous and expire after 24 hours
5. You can delete your account and all data at any time

## Quota Management

### YouTube API Quota

- Default: 10,000 units/day
- `playlistItems.list`: 1 unit per call
- With current design: **10,000 users/day** capacity

### Optimization Strategies

1. **Cache Results** - Store last fetch timestamp, only re-fetch if >1 hour
2. **Limit maxResults** - Fetch fewer videos (25 instead of 50) to stay under quota
3. **Apply for Quota Increase** - Request higher quota from Google if scaling
4. **Implement Rate Limiting** - Prevent abuse (max 1 claim per hour per user)

## Future Enhancements

### Multi-Platform Support

- **Reddit**: Fetch upvoted posts via Reddit API
- **TikTok**: User-submitted links (no public API)
- **Twitter/X**: Liked tweets via Twitter API
- **Twitch**: Follow events or chat participation

### Advanced Features

- **Streaks**: Daily claim bonuses
- **Rarity Tiers**: Influence chatling assignment based on video category/tags
- **Trading**: Let users trade chatlings
- **Leaderboards**: Top collectors, rarest collections
- **Themes**: Seasonal chatling designs
- **Browser Extension**: Instant claim while browsing YouTube

### Infrastructure

- **Redis Session Store**: For scalability
- **Queue System**: Process claims asynchronously (Bull/BeeQueue)
- **CDN**: Serve chatling images from CDN
- **Database Read Replicas**: For high traffic
- **Monitoring**: Track API quota usage, errors, claim rates

## Troubleshooting

### "YouTube OAuth not configured"

Add `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` to `.env`

### OAuth redirect mismatch

Ensure redirect URI in Google Cloud Console matches exactly:
`http://localhost:3000/api/auth/youtube/callback`

### No rewards claimed

- Make sure you've liked some YouTube videos
- Check that you're logged in before connecting YouTube
- Verify server logs for errors

### Session expires

Sessions last 24 hours. After expiry, you'll need to log in again.

## Security Notes

### Production Checklist

- [ ] Set `cookie.secure: true` (requires HTTPS)
- [ ] Change `SESSION_SECRET` to strong random string
- [ ] Enable CORS with specific origins
- [ ] Add rate limiting middleware
- [ ] Implement CSRF protection
- [ ] Use environment-specific OAuth redirect URIs
- [ ] Enable SQL injection protection (parameterized queries)
- [ ] Add input validation middleware
- [ ] Set up monitoring and alerting
- [ ] Regular security audits

## License & Credits

This project demonstrates a privacy-first approach to social media integration.

**Key Principles**:
- User privacy first
- Minimal data collection
- Clear consent
- Automatic data expiry
- Full transparency

---

**Status**: Production-ready with proper OAuth credentials and security hardening

**Last Updated**: 2025-11-07
