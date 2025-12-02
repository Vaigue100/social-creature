/**
 * Services Integration
 * Centralizes all service initialization
 * Privacy-first design - session-based, no long-term storage
 */

const YouTubeLikesService = require('./youtube-likes-service');
const ChatroomBackgroundService = require('./chatroom-background-service');
const YouTubeBackgroundService = require('./youtube-background-service');
const DailyMysteryBoxService = require('./daily-mystery-box-service');

class Services {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;

    // Initialize services
    this.youtubeLikes = new YouTubeLikesService(dbConfig);
    this.chatroomBackground = new ChatroomBackgroundService(dbConfig);
    this.youtubeBackground = new YouTubeBackgroundService(dbConfig, this.youtubeLikes);
    this.dailyMysteryBox = new DailyMysteryBoxService(dbConfig);
  }

  /**
   * Start all background services
   */
  start() {
    console.log('\n' + '='.repeat(80));
    console.log('Background Services Status');
    console.log('='.repeat(80));

    if (this.youtubeLikes.clientId && this.youtubeLikes.clientSecret) {
      console.log('✓ YouTube Likes Service ready (OAuth configured)');
      console.log('✓ YouTube Background Checker starting (checks every 15 minutes with smart batching)');
      console.log('  Only checks users who were active within last 24 hours');

      // Run initial check after 2 minutes (to allow server to fully start)
      setTimeout(() => {
        console.log('\n🔍 Running initial YouTube background check...');
        this.youtubeBackground.checkAllUsers().catch(err => {
          console.error('Initial YouTube check error:', err);
        });
      }, 2 * 60 * 1000);

      // Schedule 15-minute checks with smart batching
      this.youtubeCheckInterval = setInterval(() => {
        this.youtubeBackground.checkAllUsers().catch(err => {
          console.error('YouTube background check error:', err);
        });
      }, 15 * 60 * 1000); // Every 15 minutes

    } else {
      console.log('⚠️  YouTube OAuth not configured');
      console.log('   Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env to enable');
    }

    // Start chatroom background service
    this.chatroomBackground.start();

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Stop all background services
   */
  stop() {
    console.log('✓ Stopping services...');
    this.chatroomBackground.stop();
    if (this.youtubeCheckInterval) {
      clearInterval(this.youtubeCheckInterval);
      console.log('✓ YouTube background checker stopped');
    }
    console.log('✓ Services stopped');
  }

  /**
   * Update user's login streak and check achievements
   * Called on every login to track consecutive days
   */
  async updateLoginStreak(userId, userData, client) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastLoginAt = userData.last_login_at ? new Date(userData.last_login_at) : null;
    const lastStreakDate = userData.last_streak_date ? new Date(userData.last_streak_date).toISOString().split('T')[0] : null;
    let currentStreak = userData.login_streak_days || 0;

    // Determine streak status
    if (!lastStreakDate || lastStreakDate === today) {
      // First login ever OR already logged in today - no change to streak
      // Just update last_login_at
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastStreakDate === yesterdayStr) {
        // Logged in yesterday - increment streak
        currentStreak += 1;
      } else {
        // Gap in logins - reset streak
        currentStreak = 1;
      }
    }

    // Update user's login tracking and activity
    await client.query(`
      UPDATE users
      SET last_login_at = NOW(),
          last_active_at = NOW(),
          login_streak_days = $1,
          last_streak_date = CURRENT_DATE
      WHERE id = $2
    `, [currentStreak, userId]);

    console.log(`✓ Login tracked for user ${userId}: ${currentStreak} day streak`);

    // Check and unlock streak achievements
    await this.checkLoginStreakAchievements(userId, currentStreak, client);
  }

  /**
   * Check and unlock login streak achievements
   */
  async checkLoginStreakAchievements(userId, currentStreak, client) {
    // Get all login streak achievements that user qualifies for
    const achievementsToUnlock = await client.query(`
      SELECT a.*
      FROM achievements a
      WHERE a.requirement_type = 'login_streak'
        AND a.requirement_value <= $1
        AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua
          WHERE ua.user_id = $2 AND ua.achievement_id = a.id
        )
    `, [currentStreak, userId]);

    for (const achievement of achievementsToUnlock.rows) {
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
        '🏆 Achievement Unlocked!',
        `${achievement.title}: ${achievement.description}`,
        JSON.stringify({
          achievement_id: achievement.id,
          achievement_key: achievement.achievement_key,
          points: achievement.points,
          streak_days: currentStreak
        })
      ]);

      console.log(`  🏆 Achievement unlocked: ${achievement.title}`);
    }
  }
}

module.exports = Services;
