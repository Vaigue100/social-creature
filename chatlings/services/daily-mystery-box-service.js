/**
 * Daily Mystery Box Service
 * Allows users to claim one chatling per day with rarity-based chances
 * Can claim any chatling (not just new ones) and tracks "found count"
 */

const { Client } = require('pg');

class DailyMysteryBoxService {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;

    // Rarity drop rates (must total 100%)
    this.rarityRates = {
      'Common': 75,      // 75% chance
      'Uncommon': 20,    // 20% chance
      'Rare': 4.2,       // 4.2% chance
      'Epic': 0.7,       // 0.7% chance
      'Legendary': 0.1   // 0.1% chance
    };
  }

  /**
   * Check if user can claim today (once per 24 hours)
   */
  async canClaimToday(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const lastClaim = await client.query(`
        SELECT claimed_at
        FROM daily_claims
        WHERE user_id = $1
        ORDER BY claimed_at DESC
        LIMIT 1
      `, [userId]);

      if (lastClaim.rows.length === 0) {
        return { canClaim: true, nextClaimAt: null };
      }

      const lastClaimTime = new Date(lastClaim.rows[0].claimed_at);
      const now = new Date();
      const hoursSinceLastClaim = (now - lastClaimTime) / (1000 * 60 * 60);

      if (hoursSinceLastClaim >= 24) {
        return { canClaim: true, nextClaimAt: null };
      }

      const nextClaimAt = new Date(lastClaimTime.getTime() + 24 * 60 * 60 * 1000);
      return { canClaim: false, nextClaimAt, hoursRemaining: 24 - hoursSinceLastClaim };

    } finally {
      await client.end();
    }
  }

  /**
   * Claim daily mystery box chatling
   * Returns the chatling found and whether it was new
   */
  async claimDailyBox(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Check if can claim
      const canClaim = await this.canClaimToday(userId);
      if (!canClaim.canClaim) {
        throw new Error(`Can only claim once per 24 hours. Next claim in ${canClaim.hoursRemaining.toFixed(1)} hours`);
      }

      // Roll for rarity
      const rarity = this.rollRarity();
      console.log(`🎲 Rolled rarity: ${rarity}`);

      // Get random chatling of this rarity
      const creature = await this.getRandomCreatureByRarity(rarity, client);
      if (!creature) {
        throw new Error(`No ${rarity} chatlings available`);
      }

      // Check if user already has this chatling
      const existing = await client.query(`
        SELECT found_count
        FROM user_rewards
        WHERE user_id = $1 AND creature_id = $2
      `, [userId, creature.id]);

      const wasNew = existing.rows.length === 0;
      const previousFoundCount = existing.rows.length > 0 ? existing.rows[0].found_count : 0;

      // Add or increment found count
      if (wasNew) {
        // First time finding this chatling
        await client.query(`
          INSERT INTO user_rewards (user_id, creature_id, platform, found_count, claimed_at)
          VALUES ($1, $2, 'DailyBox', 1, NOW())
        `, [userId, creature.id]);
      } else {
        // Found again - increment counter
        await client.query(`
          UPDATE user_rewards
          SET found_count = found_count + 1,
              claimed_at = NOW()
          WHERE user_id = $1 AND creature_id = $2
        `, [userId, creature.id]);
      }

      // Record the claim in daily_claims table
      await client.query(`
        INSERT INTO daily_claims (user_id, creature_id, rarity_tier, was_new)
        VALUES ($1, $2, $3, $4)
      `, [userId, creature.id, rarity, wasNew]);

      // Update user's last_active_at
      await client.query(`
        UPDATE users
        SET last_active_at = NOW()
        WHERE id = $1
      `, [userId]);

      // Check and unlock rarity-based achievements
      await this.checkRarityAchievements(userId, rarity, client);

      // Create notification
      await this.createClaimNotification(userId, creature, wasNew, previousFoundCount + 1, client);

      console.log(`  ✨ User ${userId} claimed ${creature.creature_name} (${rarity}) - ${wasNew ? 'NEW' : 'Found ' + (previousFoundCount + 1) + ' times'}`);

      return {
        creature: {
          id: creature.id,
          name: creature.creature_name,
          rarity: rarity,
          image: creature.selected_image
        },
        wasNew,
        foundCount: previousFoundCount + 1
      };

    } finally {
      await client.end();
    }
  }

  /**
   * Roll for rarity based on drop rates
   */
  rollRarity() {
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, rate] of Object.entries(this.rarityRates)) {
      cumulative += rate;
      if (roll < cumulative) {
        return rarity;
      }
    }

    return 'Common'; // Fallback
  }

  /**
   * Get random creature of specified rarity
   */
  async getRandomCreatureByRarity(rarity, client) {
    const result = await client.query(`
      SELECT id, creature_name, selected_image, rarity_tier
      FROM creatures
      WHERE rarity_tier = $1
        AND selected_image IS NOT NULL
        AND is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `, [rarity]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check and unlock rarity-based find achievements
   */
  async checkRarityAchievements(userId, rarity, client) {
    // Count total finds of this rarity
    const countResult = await client.query(`
      SELECT SUM(found_count) as total_found
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      WHERE ur.user_id = $1 AND c.rarity_tier = $2
    `, [userId, rarity]);

    const totalFound = parseInt(countResult.rows[0].total_found) || 0;

    // Get all achievements for this rarity that user qualifies for
    const requirementType = `found_rarity_${rarity.toLowerCase()}`;
    const achievements = await client.query(`
      SELECT a.*
      FROM achievements a
      WHERE a.requirement_type = $1
        AND a.requirement_value <= $2
        AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua
          WHERE ua.user_id = $3 AND ua.achievement_id = a.id
        )
    `, [requirementType, totalFound, userId]);

    for (const achievement of achievements.rows) {
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
          rarity: rarity,
          total_found: totalFound
        })
      ]);

      console.log(`  🏆 Achievement unlocked: ${achievement.title}`);
    }
  }

  /**
   * Create notification for claim
   */
  async createClaimNotification(userId, creature, wasNew, foundCount, client) {
    const title = wasNew ? '🎉 New Chatling Discovered!' : `📦 Found Again! (${foundCount}x)`;
    const message = wasNew
      ? `You opened the mystery box and found ${creature.creature_name}!`
      : `You found ${creature.creature_name} again! Total: ${foundCount} times`;

    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, metadata)
      VALUES ($1, 'reward_claimed', $2, $3, $4)
    `, [
      userId,
      title,
      message,
      JSON.stringify({
        creature_id: creature.id,
        creature_name: creature.creature_name,
        rarity_tier: creature.rarity_tier,
        was_new: wasNew,
        found_count: foundCount
      })
    ]);
  }
}

module.exports = DailyMysteryBoxService;
