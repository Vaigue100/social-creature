/**
 * YouTube Background Checker Service
 * Server-side hourly checking for users with YouTube integration
 * Only checks users who have logged in within the last 24 hours
 */

const { Client } = require('pg');
const { google } = require('googleapis');

class YouTubeBackgroundService {
  constructor(dbConfig, youtubeLikesService) {
    this.dbConfig = dbConfig;
    this.youtubeLikesService = youtubeLikesService;
    this.isRunning = false;

    // API Quota Configuration
    this.dailyQuota = 10000;           // YouTube API daily quota
    this.quotaPerCheck = 3;            // Units per user check (liked videos list)
    this.checkIntervalMinutes = 15;    // How often we run
    this.runsPerDay = (24 * 60) / this.checkIntervalMinutes; // 96 runs per day

    // Calculate optimal batch size
    this.maxChecksPerDay = Math.floor(this.dailyQuota / this.quotaPerCheck);
    this.batchSize = Math.floor(this.maxChecksPerDay / this.runsPerDay);

    console.log(`📊 YouTube Background Service Configuration:`);
    console.log(`   Daily Quota: ${this.dailyQuota} units`);
    console.log(`   Cost per check: ${this.quotaPerCheck} units`);
    console.log(`   Check interval: ${this.checkIntervalMinutes} minutes`);
    console.log(`   Runs per day: ${this.runsPerDay}`);
    console.log(`   Max checks per day: ${this.maxChecksPerDay}`);
    console.log(`   Batch size per run: ${this.batchSize} users`);
    console.log(`   Each user checked ~${(this.runsPerDay * this.batchSize / this.maxChecksPerDay).toFixed(1)}x per day (when at capacity)\n`);
  }

  /**
   * Main check function - runs hourly
   * Checks all eligible users for new liked videos
   */
  async checkAllUsers() {
    if (this.isRunning) {
      console.log('⏭️  YouTube background check already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log('🔍 YouTube Background Check Started');
    console.log('='.repeat(80));

    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get eligible users, prioritizing those who haven't been checked recently
      // 1. Have YouTube integrated (have refresh token)
      // 2. Were active within last 24 hours (claimed daily chatling, etc.)
      // 3. Order by last check time (oldest first) - use last_used_at from oauth_accounts
      // 4. LIMIT to batch size to spread quota across the day
      const eligibleUsers = await client.query(`
        SELECT DISTINCT
          u.id as user_id,
          u.email,
          u.last_active_at,
          oa.refresh_token,
          oa.access_token,
          oa.token_expires_at,
          oa.last_used_at as last_youtube_check
        FROM users u
        INNER JOIN oauth_accounts oa ON u.id = oa.user_id
        WHERE oa.provider = 'youtube'
          AND oa.refresh_token IS NOT NULL
          AND u.last_active_at IS NOT NULL
          AND u.last_active_at > NOW() - INTERVAL '24 hours'
        ORDER BY oa.last_used_at ASC NULLS FIRST
        LIMIT $1
      `, [this.batchSize]);

      // Get total eligible user count for reporting
      const totalEligibleResult = await client.query(`
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN oauth_accounts oa ON u.id = oa.user_id
        WHERE oa.provider = 'youtube'
          AND oa.refresh_token IS NOT NULL
          AND u.last_active_at IS NOT NULL
          AND u.last_active_at > NOW() - INTERVAL '24 hours'
      `);
      const totalEligible = parseInt(totalEligibleResult.rows[0].total);

      console.log(`📊 Checking ${eligibleUsers.rows.length} users (out of ${totalEligible} eligible)`);
      console.log(`   Batch size: ${this.batchSize} users per ${this.checkIntervalMinutes}-minute run`);
      console.log(`   Prioritizing users checked longest ago\n`);

      if (eligibleUsers.rows.length === 0) {
        console.log('✅ No users to check. Done!');
        return {
          totalUsers: 0,
          totalEligible: totalEligible,
          successCount: 0,
          errorCount: 0,
          newChatlings: 0,
          duration: 0,
          quotaUsed: 0,
          batchSize: this.batchSize,
          timestamp: new Date().toISOString()
        };
      }

      let totalNewRewards = 0;
      let successCount = 0;
      let errorCount = 0;

      // Check each user
      for (const user of eligibleUsers.rows) {
        try {
          const lastCheck = user.last_youtube_check ? new Date(user.last_youtube_check).toLocaleString() : 'Never';
          console.log(`\n👤 Checking user: ${user.email} (ID: ${user.user_id})`);
          console.log(`   Last active: ${new Date(user.last_active_at).toLocaleString()}`);
          console.log(`   Last YouTube check: ${lastCheck}`);

          // Get fresh access token (refresh if needed)
          const accessToken = await this.getValidAccessToken(user, client);

          // Fetch liked videos from YouTube
          const likedVideos = await this.youtubeLikesService.getLikedVideos(accessToken, 50);
          console.log(`   Found ${likedVideos.length} liked videos`);

          // Process rewards
          const newRewards = await this.processUserRewards(user.user_id, likedVideos, client);

          if (newRewards.length > 0) {
            console.log(`   ✨ Claimed ${newRewards.length} new Chatling(s)!`);
            totalNewRewards += newRewards.length;

            // Create notifications
            for (const reward of newRewards) {
              await this.createRewardNotification(user.user_id, reward, client);
            }
          } else {
            console.log(`   ✓ No new Chatlings (already claimed all)`);
          }

          // Update last check time
          await client.query(`
            UPDATE oauth_accounts
            SET last_used_at = NOW()
            WHERE user_id = $1 AND provider = 'youtube'
          `, [user.user_id]);

          successCount++;

        } catch (error) {
          console.error(`   ❌ Error checking user ${user.email}:`, error.message);
          errorCount++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      const summary = {
        totalUsers: eligibleUsers.rows.length,
        totalEligible: totalEligible,
        successCount,
        errorCount,
        newChatlings: totalNewRewards,
        duration: parseFloat(duration),
        quotaUsed: successCount * this.quotaPerCheck,
        batchSize: this.batchSize,
        timestamp: new Date().toISOString()
      };

      console.log('\n' + '='.repeat(80));
      console.log('✅ YouTube Background Check Complete');
      console.log('='.repeat(80));
      console.log(`📊 Summary:`);
      console.log(`   Users checked: ${successCount}/${eligibleUsers.rows.length}`);
      console.log(`   Total eligible users: ${totalEligible}`);
      console.log(`   New Chatlings claimed: ${totalNewRewards}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Quota used this run: ~${successCount * this.quotaPerCheck} units`);
      console.log(`   Next check: ${new Date(Date.now() + this.checkIntervalMinutes * 60 * 1000).toLocaleString()}`);
      console.log('='.repeat(80) + '\n');

      return summary;

    } catch (error) {
      console.error('\n❌ YouTube background check failed:', error);
      throw error;
    } finally {
      await client.end();
      this.isRunning = false;
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(user, client) {
    const now = new Date();
    const expiresAt = new Date(user.token_expires_at);

    // Check if token is expired or will expire soon (within 5 minutes)
    if (!user.access_token || expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log(`   🔄 Refreshing expired access token...`);

      const newTokens = await this.youtubeLikesService.refreshAccessToken(user.refresh_token);

      // Update stored token
      await client.query(`
        UPDATE oauth_accounts
        SET access_token = $1,
            token_expires_at = to_timestamp($2 / 1000.0),
            updated_at = NOW()
        WHERE user_id = $3 AND provider = 'youtube'
      `, [newTokens.accessToken, newTokens.expiresAt, user.user_id]);

      return newTokens.accessToken;
    }

    return user.access_token;
  }

  /**
   * Process rewards for a user's liked videos
   */
  async processUserRewards(userId, likedVideos, client) {
    const newRewards = [];

    // Check if this user has youtube_integrated_at set
    const integrationCheck = await client.query(`
      SELECT youtube_integrated_at, last_used_at
      FROM oauth_accounts
      WHERE user_id = $1 AND provider = 'youtube'
    `, [userId]);

    const integrationTimestamp = integrationCheck.rows[0]?.youtube_integrated_at;
    const lastCheckTimestamp = integrationCheck.rows[0]?.last_used_at;

    if (!integrationTimestamp) {
      // First time - set integration timestamp and skip all existing likes
      await client.query(`
        UPDATE oauth_accounts
        SET youtube_integrated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND provider = 'youtube'
      `, [userId]);
      console.log(`   ℹ️  First integration - skipping all existing ${likedVideos.length} likes`);
      return [];
    }

    // Use last_used_at as the cutoff - only process videos liked AFTER the last check
    const cutoffTime = lastCheckTimestamp || integrationTimestamp;
    console.log(`   📅 Processing likes after: ${new Date(cutoffTime).toLocaleString()}`);

    // Filter videos to only those liked after the cutoff
    const newLikes = likedVideos.filter(video => new Date(video.likedAt) > new Date(cutoffTime));
    const skippedByTimestamp = likedVideos.length - newLikes.length;

    if (skippedByTimestamp > 0) {
      console.log(`   ⏭️  Skipped ${skippedByTimestamp} videos liked before last check`);
    }

    let skippedAlreadyClaimed = 0;
    let processedCount = 0;

    for (const video of newLikes) {
      try {
        // Check if user already has this reward
        const alreadyClaimed = await client.query(`
          SELECT ur.id
          FROM user_rewards ur
          WHERE ur.user_id = $1 AND ur.source_video_id = $2
        `, [userId, video.videoId]);

        if (alreadyClaimed.rows.length > 0) {
          skippedAlreadyClaimed++;
          continue; // Skip if already claimed
        }

        processedCount++;

        // Get or assign reward for this video
        const creature = await this.youtubeLikesService.getOrAssignVideoReward(
          video.videoId,
          video.channelId,
          video.channelTitle,
          client
        );

        // Claim the reward for the user
        await client.query(`
          INSERT INTO user_rewards (user_id, creature_id, platform, source_video_id)
          VALUES ($1, $2, 'YouTube', $3)
          ON CONFLICT (user_id, creature_id) DO NOTHING
        `, [userId, creature.id, video.videoId]);

        newRewards.push({
          creature_id: creature.id,
          creature_name: creature.creature_name,
          rarity_tier: creature.rarity_tier,
          video_title: video.title,
          video_id: video.videoId
        });

        console.log(`   ✨ New like detected: "${video.title}" -> ${creature.creature_name}`);

      } catch (error) {
        console.error(`     Error processing video ${video.videoId}:`, error.message);
      }
    }

    if (skippedAlreadyClaimed > 0) {
      console.log(`   ℹ️  Skipped ${skippedAlreadyClaimed} already-claimed videos`);
    }
    if (processedCount > 0 && newRewards.length === 0) {
      console.log(`   ℹ️  Processed ${processedCount} videos but got no new rewards (ON CONFLICT DO NOTHING)`);
    }

    console.log(`   ✅ Summary: ${newRewards.length} new chatlings claimed from ${likedVideos.length} total likes`);

    return newRewards;
  }

  /**
   * Create notification for new reward
   */
  async createRewardNotification(userId, reward, client) {
    // Check if notification already exists for this video_id to prevent duplicates
    const existing = await client.query(`
      SELECT id FROM notifications
      WHERE user_id = $1
        AND notification_type = 'reward_claimed'
        AND metadata->>'video_id' = $2
    `, [userId, reward.video_id]);

    if (existing.rows.length > 0) {
      console.log(`     ℹ️  Notification already exists for video ${reward.video_id}, skipping`);
      return;
    }

    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, metadata, link)
      VALUES ($1, 'reward_claimed', $2, $3, $4, $5)
    `, [
      userId,
      'New Chatling from YouTube!',
      `Your Community Ambassador found ${reward.creature_name} from "${reward.video_title}"`,
      JSON.stringify({
        creature_id: reward.creature_id,
        creature_name: reward.creature_name,
        rarity_tier: reward.rarity_tier,
        video_id: reward.video_id
      }),
      `/user/view-creature.html?id=${reward.creature_id}`
    ]);
  }
}

module.exports = YouTubeBackgroundService;
