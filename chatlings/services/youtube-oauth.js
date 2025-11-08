/**
 * YouTube OAuth Service
 * Handles YouTube authentication using Google OAuth 2.0
 *
 * Setup Required:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable YouTube Data API v3
 * 4. Create OAuth 2.0 credentials (Web application)
 * 5. Add authorized redirect URI: http://localhost:3000/api/auth/youtube/callback
 * 6. Add credentials to .env file
 */

const { google } = require('googleapis');
const { Client } = require('pg');

class YouTubeOAuthService {
  constructor(config) {
    this.dbConfig = config;

    // Load OAuth credentials from environment
    this.clientId = process.env.YOUTUBE_CLIENT_ID;
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/auth/youtube/callback';

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️  YouTube OAuth not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env');
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Generate authorization URL for user to grant access
   */
  getAuthorizationUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId through state parameter
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Save user's YouTube tokens to database
   */
  async saveUserTokens(userId, tokens, channelInfo) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      await client.query(`
        UPDATE users
        SET
          youtube_user_id = $1,
          youtube_channel_id = $2,
          youtube_access_token = $3,
          youtube_refresh_token = $4,
          youtube_token_expires_at = $5,
          youtube_connected_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `, [
        channelInfo.id,
        channelInfo.snippet.title,
        tokens.access_token,
        tokens.refresh_token,
        new Date(tokens.expiry_date),
        userId
      ]);

      console.log(`✓ YouTube connected for user ${userId}`);

    } finally {
      await client.end();
    }
  }

  /**
   * Get user's channel information
   */
  async getUserChannel(accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client
    });

    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0];
    }

    throw new Error('No YouTube channel found for this account');
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get current tokens
      const result = await client.query(
        'SELECT youtube_refresh_token FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]?.youtube_refresh_token) {
        throw new Error('No refresh token found');
      }

      this.oauth2Client.setCredentials({
        refresh_token: result.rows[0].youtube_refresh_token
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Save new access token
      await client.query(`
        UPDATE users
        SET
          youtube_access_token = $1,
          youtube_token_expires_at = $2
        WHERE id = $3
      `, [
        credentials.access_token,
        new Date(credentials.expiry_date),
        userId
      ]);

      return credentials.access_token;

    } finally {
      await client.end();
    }
  }

  /**
   * Get valid access token for user (refreshing if needed)
   */
  async getValidAccessToken(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(
        'SELECT youtube_access_token, youtube_token_expires_at FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]) {
        throw new Error('User not found');
      }

      const { youtube_access_token, youtube_token_expires_at } = result.rows[0];

      // Check if token is expired or will expire soon (5 min buffer)
      const expiryDate = new Date(youtube_token_expires_at);
      const now = new Date();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryDate.getTime() - now.getTime() < fiveMinutes) {
        // Token expired or expiring soon, refresh it
        return await this.refreshAccessToken(userId);
      }

      return youtube_access_token;

    } finally {
      await client.end();
    }
  }
}

module.exports = YouTubeOAuthService;
