/**
 * Daily Chatling Service
 * Handles daily chatling visits to users
 */

const { Pool } = require('pg');
const dbConfig = require('../scripts/db-config');

class DailyChatlingService {
  constructor() {
    this.pool = new Pool(dbConfig);
  }

  /**
   * Assign daily chatling to a user
   * If they don't have it in their collection, it's automatically added
   * Returns the chatling that visited and whether it was new
   * Note: Has a 1 in 7 chance of actually assigning a chatling
   */
  async assignDailyChatling(userId) {
    const client = await this.pool.connect();

    try {
      // 1 in 7 chance (approximately 14.3%)
      const randomChance = Math.random();
      if (randomChance > (1 / 7)) {
        console.log(`Daily chatling roll failed for user ${userId} (${(randomChance * 100).toFixed(1)}% - need < 14.3%)`);
        return null;
      }

      console.log(`Daily chatling roll succeeded for user ${userId}! (${(randomChance * 100).toFixed(1)}%)`);

      await client.query('BEGIN');

      // Use the database function to assign daily chatling
      const result = await client.query(
        'SELECT * FROM assign_daily_chatling($1)',
        [userId]
      );

      if (result.rows.length > 0) {
        const visit = result.rows[0];

        // Add creature to user's collection if it was a new discovery
        if (visit.was_new_discovery) {
          await client.query(`
            INSERT INTO user_rewards (user_id, creature_id, platform, claimed_at)
            VALUES ($1, $2, 'Daily Visit', NOW())
            ON CONFLICT DO NOTHING
          `, [userId, visit.chatling_id]);
        }

        // Create notification
        const notificationMessage = visit.was_new_discovery
          ? `A new chatling visited you: ${visit.chatling_name}! Added to your collection.`
          : `${visit.chatling_name} came to visit you again!`;

        await client.query(`
          INSERT INTO notifications (user_id, type, message, related_creature_id, is_read, created_at)
          VALUES ($1, 'daily_chatling', $2, $3, false, NOW())
        `, [userId, notificationMessage, visit.chatling_id]);

        await client.query('COMMIT');

        return {
          chatlingId: visit.chatling_id,
          chatlingName: visit.chatling_name,
          wasNewDiscovery: visit.was_new_discovery
        };
      }

      await client.query('COMMIT');
      return null;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's current chatling
   */
  async getCurrentChatling(userId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT
          c.id,
          c.creature_name,
          c.creature_shortname,
          c.rarity_tier,
          c.selected_image,
          c.vibe,
          u.last_daily_visit
        FROM users u
        LEFT JOIN creatures c ON u.current_creature_id = c.id
        WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].id) {
        return {
          id: result.rows[0].id,
          name: result.rows[0].creature_name,
          shortName: result.rows[0].creature_shortname,
          rarityTier: result.rows[0].rarity_tier,
          image: result.rows[0].selected_image,
          vibe: result.rows[0].vibe,
          lastDailyVisit: result.rows[0].last_daily_visit
        };
      }

      return null;

    } finally {
      client.release();
    }
  }

  /**
   * Check if user needs a daily visit
   * Returns true if last visit was not today
   */
  async needsDailyVisit(userId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT
          CASE
            WHEN last_daily_visit IS NULL THEN TRUE
            WHEN DATE(last_daily_visit) < CURRENT_DATE THEN TRUE
            ELSE FALSE
          END as needs_visit
        FROM users
        WHERE id = $1`,
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0].needs_visit : true;

    } finally {
      client.release();
    }
  }

  /**
   * Get daily visit history for a user
   */
  async getVisitHistory(userId, limit = 10) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT
          dv.visit_date,
          dv.was_new_discovery,
          dv.created_at,
          c.creature_name,
          c.creature_shortname,
          c.rarity_tier,
          c.selected_image
        FROM daily_visits dv
        JOIN creatures c ON dv.chatling_id = c.id
        WHERE dv.user_id = $1
        ORDER BY dv.visit_date DESC
        LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => ({
        date: row.visit_date,
        wasNewDiscovery: row.was_new_discovery,
        createdAt: row.created_at,
        chatling: {
          name: row.creature_name,
          shortName: row.creature_shortname,
          rarityTier: row.rarity_tier,
          image: row.selected_image
        }
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Assign a creator's chatling to a YouTube channel
   * This chatling will be encountered when others like the creator's videos
   */
  async assignCreatorChatling(channelId, channelTitle, userId) {
    const client = await this.pool.connect();

    try {
      // Check if creator already has a chatling assigned
      const existing = await client.query(
        'SELECT chatling_id FROM creator_chatlings WHERE channel_id = $1',
        [channelId]
      );

      if (existing.rows.length > 0) {
        return { chatlingId: existing.rows[0].chatling_id, isNew: false };
      }

      // Get the user's current chatling
      const currentResult = await client.query(
        'SELECT current_creature_id FROM users WHERE id = $1',
        [userId]
      );

      if (currentResult.rows.length === 0 || !currentResult.rows[0].current_creature_id) {
        // User doesn't have a current chatling, assign one first
        await this.assignDailyChatling(userId);

        const retryResult = await client.query(
          'SELECT current_creature_id FROM users WHERE id = $1',
          [userId]
        );

        if (retryResult.rows.length === 0 || !retryResult.rows[0].current_creature_id) {
          throw new Error('Failed to assign current chatling to user');
        }
      }

      // Use the user's current chatling as their creator chatling
      const chatlingId = currentResult.rows.length > 0
        ? currentResult.rows[0].current_creature_id
        : null;

      if (!chatlingId) {
        throw new Error('No current chatling found for user');
      }

      // Assign it to the channel
      await client.query(
        `INSERT INTO creator_chatlings (channel_id, channel_title, user_id, chatling_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (channel_id) DO NOTHING`,
        [channelId, channelTitle, userId, chatlingId]
      );

      return { chatlingId, isNew: true };

    } finally {
      client.release();
    }
  }

  /**
   * Get the chatling representing a YouTube channel
   */
  async getCreatorChatling(channelId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT
          cc.chatling_id,
          cc.channel_title,
          cc.assigned_at,
          c.creature_name,
          c.creature_shortname,
          c.rarity_tier,
          c.selected_image,
          c.vibe
        FROM creator_chatlings cc
        JOIN creatures c ON cc.chatling_id = c.id
        WHERE cc.channel_id = $1`,
        [channelId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          chatlingId: row.chatling_id,
          channelTitle: row.channel_title,
          assignedAt: row.assigned_at,
          chatling: {
            name: row.creature_name,
            shortName: row.creature_shortname,
            rarityTier: row.rarity_tier,
            image: row.selected_image,
            vibe: row.vibe
          }
        };
      }

      return null;

    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = new DailyChatlingService();
