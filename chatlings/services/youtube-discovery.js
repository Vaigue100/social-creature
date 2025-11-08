/**
 * YouTube Discovery Service
 * Polls YouTube API for user comments and assigns chatlings to channels
 */

const { google } = require('googleapis');
const { Client } = require('pg');

class YouTubeDiscoveryService {
  constructor(dbConfig, oauthService) {
    this.dbConfig = dbConfig;
    this.oauthService = oauthService;
    this.pollingInterval = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
  }

  /**
   * Start polling for all connected users
   */
  startPolling() {
    if (this.isRunning) {
      console.log('Discovery service already running');
      return;
    }

    this.isRunning = true;
    console.log('✓ YouTube Discovery Service started');

    // Poll immediately, then every interval
    this.poll();
    this.pollingTimer = setInterval(() => this.poll(), this.pollingInterval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isRunning = false;
    console.log('✓ YouTube Discovery Service stopped');
  }

  /**
   * Poll for new comments for all connected users
   */
  async poll() {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get all users with YouTube connected
      const result = await client.query(`
        SELECT id, youtube_user_id, youtube_access_token
        FROM users
        WHERE youtube_user_id IS NOT NULL
      `);

      console.log(`Checking discoveries for ${result.rows.length} connected users...`);

      for (const user of result.rows) {
        try {
          await this.checkUserDiscoveries(user.id);
        } catch (error) {
          console.error(`Error checking discoveries for user ${user.id}:`, error.message);
        }
      }

    } catch (error) {
      console.error('Error in discovery polling:', error);
    } finally {
      await client.end();
    }
  }

  /**
   * Check for new discoveries for a specific user
   */
  async checkUserDiscoveries(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get valid access token
      const accessToken = await this.oauthService.getValidAccessToken(userId);

      // Get user's recent comments
      const comments = await this.getUserRecentComments(accessToken);

      let newDiscoveries = 0;

      for (const comment of comments) {
        const channelId = comment.snippet.channelId;
        const videoId = comment.snippet.videoId;

        // Get or assign chatling to this channel
        const creature = await this.getOrAssignChannelChatling(channelId, client);

        // Record encounter
        const isNew = await this.recordEncounter(userId, creature.id, channelId, videoId, client);

        if (isNew) {
          newDiscoveries++;
          // Create notification
          await this.createDiscoveryNotification(userId, creature, client);
        }
      }

      if (newDiscoveries > 0) {
        console.log(`  User ${userId}: ${newDiscoveries} new discoveries`);

        // Check and unlock achievements
        await this.checkAchievements(userId, client);
      }

    } finally {
      await client.end();
    }
  }

  /**
   * Get user's recent comments from YouTube API
   */
  async getUserRecentComments(accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    // Get user's recent comment threads
    const response = await youtube.commentThreads.list({
      part: ['snippet'],
      maxResults: 50,
      order: 'time'
    });

    return response.data.items || [];
  }

  /**
   * Get or assign a chatling to a YouTube channel
   * Chatlings stay with channels for 24 hours
   */
  async getOrAssignChannelChatling(channelId, client) {
    // Check if channel has an active assignment
    const existing = await client.query(`
      SELECT yca.*, c.*
      FROM youtube_channel_assignments yca
      JOIN creatures c ON yca.creature_id = c.id
      WHERE yca.channel_id = $1 AND yca.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `, [channelId]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // No active assignment, assign a random chatling
    const randomCreature = await client.query(`
      SELECT * FROM creatures
      WHERE selected_image IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (randomCreature.rows.length === 0) {
      throw new Error('No creatures available');
    }

    const creature = randomCreature.rows[0];

    // Create assignment (expires in 24 hours)
    await client.query(`
      INSERT INTO youtube_channel_assignments (channel_id, creature_id, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '24 hours')
      ON CONFLICT (channel_id)
      DO UPDATE SET
        creature_id = $2,
        assigned_at = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
    `, [channelId, creature.id]);

    console.log(`  Assigned chatling "${creature.creature_name}" to channel ${channelId}`);

    return creature;
  }

  /**
   * Record a user encounter with a chatling
   * Returns true if this is a new encounter
   */
  async recordEncounter(userId, creatureId, channelId, videoId, client) {
    const existing = await client.query(`
      SELECT id FROM user_encounters
      WHERE user_id = $1 AND creature_id = $2
    `, [userId, creatureId]);

    if (existing.rows.length > 0) {
      // Already encountered, increment count
      await client.query(`
        UPDATE user_encounters
        SET
          encounter_count = encounter_count + 1,
          post_url = $3
        WHERE user_id = $1 AND creature_id = $2
      `, [userId, creatureId, `https://youtube.com/watch?v=${videoId}`]);

      return false;
    }

    // New encounter
    await client.query(`
      INSERT INTO user_encounters (user_id, creature_id, platform, post_url)
      VALUES ($1, $2, 'YouTube', $3)
    `, [userId, creatureId, `https://youtube.com/watch?v=${videoId}`]);

    return true;
  }

  /**
   * Create notification for new discovery
   */
  async createDiscoveryNotification(userId, creature, client) {
    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, metadata)
      VALUES ($1, 'friend_discovered', $2, $3, $4)
    `, [
      userId,
      'New Friend Discovered!',
      `You met ${creature.creature_name}!`,
      JSON.stringify({
        creature_id: creature.id,
        creature_name: creature.creature_name,
        rarity_tier: creature.rarity_tier
      })
    ]);
  }

  /**
   * Check and unlock achievements for user
   */
  async checkAchievements(userId, client) {
    // Get user's encounter count
    const countResult = await client.query(`
      SELECT COUNT(DISTINCT creature_id) as count
      FROM user_encounters
      WHERE user_id = $1
    `, [userId]);

    const encounterCount = parseInt(countResult.rows[0].count);

    // Check encounter-based achievements
    const achievements = await client.query(`
      SELECT * FROM achievements
      WHERE requirement_type = 'encounter_count'
      AND requirement_value <= $1
    `, [encounterCount]);

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
          INSERT INTO notifications (user_id, notification_type, title, message, metadata)
          VALUES ($1, 'achievement_unlocked', $2, $3, $4)
        `, [
          userId,
          'Achievement Unlocked!',
          achievement.title,
          JSON.stringify({
            achievement_id: achievement.id,
            points: achievement.points
          })
        ]);

        console.log(`  Achievement unlocked: ${achievement.title}`);
      }
    }
  }

  /**
   * Manual check for a specific user
   */
  async checkNow(userId) {
    try {
      const before = await this.getEncounterCount(userId);
      await this.checkUserDiscoveries(userId);
      const after = await this.getEncounterCount(userId);

      return {
        new_discoveries: after - before
      };
    } catch (error) {
      console.error('Error in manual check:', error);
      throw error;
    }
  }

  /**
   * Get total encounter count for user
   */
  async getEncounterCount(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT COUNT(DISTINCT creature_id) as count
        FROM user_encounters
        WHERE user_id = $1
      `, [userId]);

      return parseInt(result.rows[0].count) || 0;

    } finally {
      await client.end();
    }
  }
}

module.exports = YouTubeDiscoveryService;
