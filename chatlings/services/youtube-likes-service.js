/**
 * YouTube Likes Service (Privacy-First)
 * Rewards users for liking videos
 * No long-term user data storage - session-based only
 */

const { google } = require('googleapis');
const { Client } = require('pg');

class YouTubeLikesService {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;

    // OAuth configuration
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
  getAuthorizationUrl(sessionId) {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token for background checking
      scope: scopes,
      state: sessionId, // Pass session ID to link back after OAuth
      prompt: 'consent' // Force consent screen to ensure refresh token
    });
  }

  /**
   * Exchange authorization code for tokens (including refresh token)
   */
  async getTokensFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);

    // Create a new OAuth2 client with the tokens to fetch user info
    const { OAuth2 } = google.auth;
    const authenticatedClient = new OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
    authenticatedClient.setCredentials(tokens);

    // Get user info to retrieve provider_user_id
    const oauth2 = google.oauth2({ version: 'v2', auth: authenticatedClient });
    const userInfo = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date,
      googleUserId: userInfo.data.id,
      email: userInfo.data.email
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date
      };
    } catch (error) {
      console.error('Error refreshing YouTube token:', error);
      throw new Error('Failed to refresh YouTube access token');
    }
  }

  /**
   * Fetch user's liked videos from YouTube
   * Uses the "LL" playlist (Liked Videos)
   */
  async getLikedVideos(accessToken, maxResults = 50) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client
    });

    try {
      // Fetch liked videos (LL = Liked List)
      const response = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: 'LL',
        maxResults: maxResults
      });

      return (response.data.items || []).map(item => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        likedAt: item.snippet.publishedAt // When the user liked this video
      }));

    } catch (error) {
      console.error('Error fetching liked videos:', error.message);
      throw new Error('Failed to fetch liked videos from YouTube');
    }
  }

  /**
   * Process liked videos and claim rewards for user
   * Returns list of new rewards claimed
   */
  async processLikesAndClaimRewards(userId, accessToken) {
    const client = new Client(this.dbConfig);
    const newRewards = [];

    try {
      await client.connect();

      // Check if this is the first YouTube integration
      const integrationCheck = await client.query(`
        SELECT youtube_integrated_at
        FROM oauth_accounts
        WHERE user_id = $1 AND provider = 'youtube'
        LIMIT 1
      `, [userId]);

      const isFirstIntegration = !integrationCheck.rows[0]?.youtube_integrated_at;

      if (isFirstIntegration) {
        // Mark as integrated and skip processing old likes
        await client.query(`
          UPDATE oauth_accounts
          SET youtube_integrated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND provider = 'youtube'
        `, [userId]);

        console.log(`First YouTube integration for user ${userId} - skipping existing likes`);
        return []; // Return empty array on first integration
      }

      // Get user's liked videos
      const likedVideos = await this.getLikedVideos(accessToken);

      console.log(`Processing ${likedVideos.length} liked videos for user ${userId}`);

      for (const video of likedVideos) {
        try {
          // Check if user already has this reward
          const alreadyClaimed = await this.checkUserHasReward(userId, video.videoId, client);

          if (alreadyClaimed) {
            continue; // Skip if already claimed
          }

          // Get or assign reward for this video
          // Check for creator chatling first
          const creature = await this.getOrAssignVideoReward(
            video.videoId,
            video.channelId,
            video.channelTitle,
            client
          );

          // Claim the reward for the user (with video ID to prevent duplicates)
          await this.claimReward(userId, creature.id, client, video.videoId);

          newRewards.push({
            creature_id: creature.id,
            creature_name: creature.creature_name,
            rarity_tier: creature.rarity_tier,
            video_title: video.title
          });

          // Create notification
          await this.createRewardNotification(userId, creature, video, client);

        } catch (error) {
          console.error(`Error processing video ${video.videoId}:`, error.message);
          // Continue with other videos
        }
      }

      // Check and unlock achievements
      if (newRewards.length > 0) {
        await this.checkAchievements(userId, client);
      }

      // Cleanup expired video rewards
      await this.cleanupExpiredRewards(client);

      return newRewards;

    } finally {
      await client.end();
    }
  }

  /**
   * Check if user already has claimed a reward from this video
   * Checks permanent history via source_video_id (prevents duplicate claims)
   */
  async checkUserHasReward(userId, videoId, client) {
    const result = await client.query(`
      SELECT ur.id
      FROM user_rewards ur
      WHERE ur.user_id = $1
        AND ur.source_video_id = $2
    `, [userId, videoId]);

    return result.rows.length > 0;
  }

  /**
   * Get or assign a reward (chatling) to a video
   * Rewards stay with videos for 24 hours
   * First checks if the channel has a creator chatling
   */
  async getOrAssignVideoReward(videoId, channelId, channelTitle, client) {
    // Check if video already has a reward assigned
    const existing = await client.query(`
      SELECT vr.*, c.*
      FROM video_rewards vr
      JOIN creatures c ON vr.creature_id = c.id
      WHERE vr.video_id = $1 AND vr.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `, [videoId]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Check if the channel has a creator chatling
    let creature = null;
    if (channelId) {
      const creatorChatling = await client.query(`
        SELECT c.*
        FROM creator_chatlings cc
        JOIN creatures c ON cc.chatling_id = c.id
        WHERE cc.channel_id = $1
      `, [channelId]);

      if (creatorChatling.rows.length > 0) {
        creature = creatorChatling.rows[0];
        console.log(`Using creator chatling for channel ${channelTitle}: ${creature.creature_name}`);
      }
    }

    // If no creator chatling, assign a random chatling
    if (!creature) {
      const randomCreature = await client.query(`
        SELECT * FROM creatures
        WHERE selected_image IS NOT NULL
        ORDER BY RANDOM()
        LIMIT 1
      `);

      if (randomCreature.rows.length === 0) {
        throw new Error('No creatures available');
      }

      creature = randomCreature.rows[0];
    }

    // Create reward assignment (expires in 24 hours)
    await client.query(`
      INSERT INTO video_rewards (video_id, creature_id, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '24 hours')
      ON CONFLICT (video_id)
      DO UPDATE SET
        creature_id = $2,
        assigned_at = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
    `, [videoId, creature.id]);

    console.log(`  Assigned chatling "${creature.creature_name}" to video ${videoId}`);

    return creature;
  }

  /**
   * Claim a reward for a user (permanent)
   * Stores source_video_id to prevent duplicate claims from same video
   * If user already has this creature, increments found_count and updates rizz
   */
  async claimReward(userId, creatureId, client, videoId = null) {
    const result = await client.query(`
      INSERT INTO user_rewards (user_id, creature_id, platform, source_video_id, found_count, rizz)
      VALUES ($1, $2, 'YouTube', $3, 1, 0)
      ON CONFLICT (user_id, creature_id) DO UPDATE SET
        found_count = user_rewards.found_count + 1,
        rizz = LEAST(user_rewards.found_count, 10),
        claimed_at = NOW(),
        source_video_id = COALESCE(user_rewards.source_video_id, $3)
      RETURNING found_count, rizz, (xmax = 0) AS was_new
    `, [userId, creatureId, videoId]);

    return result.rows[0]; // Return stats for notification purposes
  }

  /**
   * Create notification for new reward claim
   */
  async createRewardNotification(userId, creature, video, client) {
    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, metadata, link)
      VALUES ($1, 'reward_claimed', $2, $3, $4, $5)
    `, [
      userId,
      'New Chatling Claimed!',
      `You got ${creature.creature_name} from liking "${video.title}"`,
      JSON.stringify({
        creature_id: creature.id,
        creature_name: creature.creature_name,
        rarity_tier: creature.rarity_tier,
        video_title: video.title
      }),
      `/user/view-creature.html?id=${creature.id}`
    ]);
  }

  /**
   * Check and unlock achievements for user
   */
  async checkAchievements(userId, client) {
    // Get user's total reward count
    const countResult = await client.query(`
      SELECT COUNT(DISTINCT creature_id) as count
      FROM user_rewards
      WHERE user_id = $1
    `, [userId]);

    const rewardCount = parseInt(countResult.rows[0].count);

    // Check count-based achievements
    const achievements = await client.query(`
      SELECT * FROM achievements
      WHERE requirement_type = 'reward_count'
        AND requirement_value <= $1
    `, [rewardCount]);

    for (const achievement of achievements.rows) {
      // Check if user already has this achievement
      const existing = await client.query(`
        SELECT id FROM user_achievements
        WHERE user_id = $1 AND achievement_id = $2
      `, [userId, achievement.id]);

      if (existing.rows.length === 0) {
        // Unlock achievement
        await client.query(`
          INSERT INTO user_achievements (user_id, achievement_id)
          VALUES ($1, $2)
        `, [userId, achievement.id]);

        // Create notification
        await client.query(`
          INSERT INTO notifications (user_id, notification_type, title, message, metadata, link)
          VALUES ($1, 'achievement_unlocked', $2, $3, $4, $5)
        `, [
          userId,
          'Achievement Unlocked!',
          achievement.title,
          JSON.stringify({
            achievement_id: achievement.id,
            points: achievement.points
          }),
          '/user/achievements.html'
        ]);

        console.log(`  Achievement unlocked: ${achievement.title}`);
      }
    }

    // Check rarity-based achievements
    await this.checkRarityAchievements(userId, client);
  }

  /**
   * Check rarity-based achievements
   */
  async checkRarityAchievements(userId, client) {
    // Check if user has claimed any Epic or Legendary chatlings
    const rarities = await client.query(`
      SELECT DISTINCT c.rarity_tier
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      WHERE ur.user_id = $1
        AND c.rarity_tier IN ('Epic', 'Legendary')
    `, [userId]);

    const hasEpic = rarities.rows.some(r => r.rarity_tier === 'Epic');
    const hasLegendary = rarities.rows.some(r => r.rarity_tier === 'Legendary');

    if (hasEpic) {
      await this.unlockRarityAchievement(userId, 'epic_seeker', client);
    }

    if (hasLegendary) {
      await this.unlockRarityAchievement(userId, 'legendary_hunter', client);
    }
  }

  /**
   * Unlock a specific rarity achievement
   */
  async unlockRarityAchievement(userId, achievementKey, client) {
    const achievement = await client.query(`
      SELECT * FROM achievements WHERE achievement_key = $1
    `, [achievementKey]);

    if (achievement.rows.length === 0) return;

    const ach = achievement.rows[0];

    // Check if already unlocked
    const existing = await client.query(`
      SELECT id FROM user_achievements
      WHERE user_id = $1 AND achievement_id = $2
    `, [userId, ach.id]);

    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES ($1, $2)
      `, [userId, ach.id]);

      await client.query(`
        INSERT INTO notifications (user_id, notification_type, title, message, metadata, link)
        VALUES ($1, 'achievement_unlocked', $2, $3, $4, $5)
      `, [
        userId,
        'Achievement Unlocked!',
        ach.title,
        JSON.stringify({ achievement_id: ach.id, points: ach.points }),
        '/user/achievements.html'
      ]);
    }
  }

  /**
   * Cleanup expired video rewards (privacy-focused - auto-delete)
   */
  async cleanupExpiredRewards(client) {
    const result = await client.query(`
      DELETE FROM video_rewards WHERE expires_at < CURRENT_TIMESTAMP
    `);

    if (result.rowCount > 0) {
      console.log(`  Cleaned up ${result.rowCount} expired video rewards`);
    }
  }
}

module.exports = YouTubeLikesService;
