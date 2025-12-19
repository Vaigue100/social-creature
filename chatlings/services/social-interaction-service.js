const { Client } = require('pg');

/**
 * Social Interaction Service
 * Handles Top Trumps style interactions between chatlings
 */

class SocialInteractionService {
  constructor(dbConfig) {
    this.config = { ...dbConfig, database: 'chatlings' };
  }

  /**
   * Trigger an interaction between user's current chatling and another chatling
   * @param {string} userId - User ID
   * @param {string} chatling2Id - The chatling they're encountering
   * @returns {Object} Interaction result with story and outcome
   */
  async triggerInteraction(userId, chatling2Id) {
    const client = new Client(this.config);

    try {
      await client.connect();

      // Get user's current chatling (from daily visit)
      const currentChatling = await this.getCurrentChatling(client, userId);
      if (!currentChatling) {
        throw new Error('User has no current chatling. Please trigger daily visit first.');
      }

      const chatling1Id = currentChatling.creature_id;

      // Get user's Rizz & Glow stats for their current chatling
      const userStats = await this.getUserStats(client, userId, chatling1Id);

      // Check if they've already interacted
      const existingInteraction = await client.query(`
        SELECT * FROM creature_friendships
        WHERE user_id = $1
        AND ((chatling_1_id = $2 AND chatling_2_id = $3)
         OR (chatling_1_id = $3 AND chatling_2_id = $2))
      `, [userId, chatling1Id, chatling2Id]);

      if (existingInteraction.rows.length > 0) {
        return {
          alreadyInteracted: true,
          previousOutcome: existingInteraction.rows[0].became_friends,
          message: existingInteraction.rows[0].interaction_story
        };
      }

      // Get both chatlings with their names
      const chatlings = await client.query(`
        SELECT id, creature_name FROM creatures WHERE id IN ($1, $2)
      `, [chatling1Id, chatling2Id]);

      const chatling1 = chatlings.rows.find(c => c.id === chatling1Id);
      const chatling2 = chatlings.rows.find(c => c.id === chatling2Id);

      // Roll 3 random categories
      const categories = await this.rollCategories(client);

      // Get scores for both chatlings in those categories
      // User's chatling gets Rizz + Glow boost, opponent does not
      const chatling1Scores = await this.getScores(client, chatling1Id, categories, userStats);
      const chatling2Scores = await this.getScores(client, chatling2Id, categories);

      // Calculate combined score
      const combinedScore =
        chatling1Scores[0].score + chatling1Scores[1].score + chatling1Scores[2].score +
        chatling2Scores[0].score + chatling2Scores[1].score + chatling2Scores[2].score;

      // Determine threshold (can be adjusted)
      const threshold = 200; // Sum of 6 scores needs to be > 200 (out of 600 possible)

      // Determine outcome
      const becameFriends = combinedScore > threshold;

      // Generate interaction story
      const story = this.generateStory(
        chatling1,
        chatling2,
        categories,
        chatling1Scores,
        chatling2Scores,
        combinedScore,
        threshold,
        becameFriends
      );

      // Record interaction
      await client.query(`
        INSERT INTO creature_friendships (
          user_id, chatling_1_id, chatling_2_id, became_friends,
          category_1_id, category_2_id, category_3_id,
          chatling_1_score_1, chatling_1_score_2, chatling_1_score_3,
          chatling_2_score_1, chatling_2_score_2, chatling_2_score_3,
          combined_score, threshold_needed, interaction_story
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        userId, chatling1Id, chatling2Id, becameFriends,
        categories[0].id, categories[1].id, categories[2].id,
        chatling1Scores[0].score, chatling1Scores[1].score, chatling1Scores[2].score,
        chatling2Scores[0].score, chatling2Scores[1].score, chatling2Scores[2].score,
        combinedScore, threshold, story
      ]);

      // If became friends, add chatling2 to user's collection
      if (becameFriends) {
        await this.addToCollection(client, userId, chatling2Id);

        // Create notification
        await this.createNotification(client, userId, {
          type: 'new_friend',
          title: '🎉 New Friend!',
          message: story,
          creature_id: chatling2Id
        });
      } else {
        // Just notification, no reward
        await this.createNotification(client, userId, {
          type: 'interaction',
          title: '👋 Chatling Encounter',
          message: story
        });
      }

      return {
        becameFriends,
        chatling1: chatling1.creature_name,
        chatling2: chatling2.creature_name,
        categories: categories.map(c => c.category_name),
        chatling1Scores: chatling1Scores.map(s => s.score),
        chatling2Scores: chatling2Scores.map(s => s.score),
        combinedScore,
        threshold,
        story
      };

    } finally {
      await client.end();
    }
  }

  /**
   * Roll 3 random categories
   */
  async rollCategories(client) {
    const result = await client.query(`
      SELECT id, category_name, icon
      FROM dim_social_trait_category
      ORDER BY RANDOM()
      LIMIT 3
    `);
    return result.rows;
  }

  /**
   * Get user's Rizz & Glow stats for a specific creature
   * Returns { rizz: number, glow: number } or default { rizz: 0, glow: 0 } if not found
   */
  async getUserStats(client, userId, creatureId) {
    const result = await client.query(`
      SELECT rizz, glow
      FROM user_rewards
      WHERE user_id = $1 AND creature_id = $2
    `, [userId, creatureId]);

    return result.rows[0] || { rizz: 0, glow: 0 };
  }

  /**
   * Get scores for a chatling in specific categories
   * Optionally applies Rizz + Glow boost if userStats provided
   */
  async getScores(client, chatlingId, categories, userStats = null) {
    const result = await client.query(`
      SELECT cst.score, c.category_name, c.icon
      FROM creature_social_traits cst
      JOIN dim_social_trait_category c ON cst.trait_category_id = c.id
      WHERE cst.creature_id = $1
      AND cst.trait_category_id = ANY($2::int[])
      ORDER BY array_position($2::int[], cst.trait_category_id::int)
    `, [chatlingId, categories.map(c => c.id)]);

    // Apply Rizz + Glow boost to each trait score
    if (userStats) {
      const statBoost = (userStats.rizz || 0) + (userStats.glow || 0);
      return result.rows.map(row => ({
        ...row,
        base_score: row.score,  // Keep original for display
        score: Math.max(0, Math.min(100, row.score + statBoost))  // Boosted, clamped to 0-100
      }));
    }

    return result.rows;
  }

  /**
   * Get user's current chatling from daily visit
   */
  async getCurrentChatling(client, userId) {
    const result = await client.query(`
      SELECT creature_id
      FROM daily_chatling_visits
      WHERE user_id = $1
      AND visit_date = CURRENT_DATE
      ORDER BY visit_time DESC
      LIMIT 1
    `, [userId]);
    return result.rows[0];
  }

  /**
   * Add chatling to user's collection
   * If already owned, increments found_count and updates rizz
   */
  async addToCollection(client, userId, creatureId) {
    const result = await client.query(`
      INSERT INTO user_rewards (user_id, creature_id, claimed_at, platform, found_count, rizz)
      VALUES ($1, $2, NOW(), 'social_interaction', 1, 0)
      ON CONFLICT (user_id, creature_id) DO UPDATE SET
        found_count = user_rewards.found_count + 1,
        rizz = LEAST(user_rewards.found_count, 10),
        claimed_at = NOW()
      RETURNING found_count, rizz, (xmax = 0) AS was_new
    `, [userId, creatureId]);

    return result.rows[0]; // Return stats for notification purposes
  }

  /**
   * Create notification for user
   */
  async createNotification(client, userId, notification) {
    await client.query(`
      INSERT INTO notifications (user_id, type, title, message, creature_id, is_read)
      VALUES ($1, $2, $3, $4, $5, false)
    `, [userId, notification.type, notification.title, notification.message, notification.creature_id || null]);
  }

  /**
   * Generate interaction story based on scores
   */
  generateStory(chatling1, chatling2, categories, scores1, scores2, combinedScore, threshold, becameFriends) {
    const cat1 = { name: categories[0].category_name, icon: categories[0].icon, c1: scores1[0].score, c2: scores2[0].score };
    const cat2 = { name: categories[1].category_name, icon: categories[1].icon, c1: scores1[1].score, c2: scores2[1].score };
    const cat3 = { name: categories[2].category_name, icon: categories[2].icon, c1: scores1[2].score, c2: scores2[2].score };

    if (becameFriends) {
      return `${chatling1.creature_name} and ${chatling2.creature_name} just met! ✨

They connected over:
${cat1.icon} **${cat1.name}**: ${chatling1.creature_name} (${cat1.c1}) and ${chatling2.creature_name} (${cat2.c1})
${cat2.icon} **${cat2.name}**: ${chatling1.creature_name} (${cat2.c1}) and ${chatling2.creature_name} (${cat2.c2})
${cat3.icon} **${cat3.name}**: ${chatling1.creature_name} (${cat3.c1}) and ${chatling2.creature_name} (${cat3.c2})

Combined chemistry: **${combinedScore}/${threshold}** needed ✅

🎉 **They became friends!** ${chatling2.creature_name} has been added to your collection!`;
    } else {
      // Find the weakest category
      const diffs = [
        { cat: cat1, diff: Math.abs(cat1.c1 - cat1.c2) },
        { cat: cat2, diff: Math.abs(cat2.c1 - cat2.c2) },
        { cat: cat3, diff: Math.abs(cat3.c1 - cat3.c2) }
      ].sort((a, b) => b.diff - a.diff)[0];

      return `${chatling1.creature_name} met ${chatling2.creature_name}, but things didn't quite click... 😅

They tried connecting over:
${cat1.icon} **${cat1.name}**: ${chatling1.creature_name} (${cat1.c1}) vs ${chatling2.creature_name} (${cat1.c2})
${cat2.icon} **${cat2.name}**: ${chatling1.creature_name} (${cat2.c1}) vs ${chatling2.creature_name} (${cat2.c2})
${cat3.icon} **${cat3.name}**: ${chatling1.creature_name} (${cat3.c1}) vs ${chatling2.creature_name} (${cat3.c2})

Combined chemistry: **${combinedScore}/${threshold}** needed ❌

The main issue was their ${diffs.cat.icon} **${diffs.cat.name}** - they were just too different. Maybe they'll get along better another time!`;
    }
  }
}

module.exports = SocialInteractionService;
