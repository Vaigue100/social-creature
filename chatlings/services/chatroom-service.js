/**
 * Chatroom Service
 *
 * Manages chatling conversations, mood tracking, and runaway system
 *
 * Features:
 * - Generate conversations (1-2 times per day)
 * - Track chatling moods (happy/neutral/unhappy)
 * - Handle runaway chatlings
 * - Recovery system
 */

const { Client } = require('pg');
const ConversationGenerator = require('./conversation-generator');

class ChatroomService {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    this.generator = new ConversationGenerator();

    // Participant count probability weights
    this.participantWeights = {
      2: 0.40, // 40% chance of 2 chatlings
      3: 0.30, // 30% chance of 3 chatlings
      4: 0.20, // 20% chance of 4 chatlings
      5: 0.10  // 10% chance of 5 chatlings
    };
  }

  /**
   * Generate a conversation for a user
   * Main orchestration method
   */
  async generateConversation(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // 1. Get user's chatlings
      const chatlings = await this.getUserChatlings(userId, client);

      if (chatlings.length < 2) {
        console.log(`User ${userId} has less than 2 chatlings, skipping conversation`);
        return null;
      }

      // 2. Select participants (2-5 chatlings, weighted)
      const participants = this.selectParticipants(chatlings);

      // 3. Get random trending topic
      const topic = await this.getRandomTopic(client);

      if (!topic) {
        console.log('No active topics available');
        return null;
      }

      // 4. Generate conversation
      const { messages, moodImpact } = this.generator.generateConversation(participants, topic);

      // 5. Save conversation to database
      const conversationId = await this.saveConversation(
        userId,
        topic,
        participants.length,
        moodImpact,
        messages,
        client
      );

      // 6. Update chatling moods
      await this.updateMoods(userId, moodImpact, conversationId, client);

      // 7. Check for runaways
      await this.checkRunaways(userId, moodImpact.unhappy, conversationId, client);

      // 8. Create notification for user
      await this.createConversationNotification(userId, participants.length, client);

      console.log(`✓ Generated conversation ${conversationId} for user ${userId}`);

      return conversationId;

    } finally {
      await client.end();
    }
  }

  /**
   * Get user's chatlings collection
   */
  async getUserChatlings(userId, client) {
    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.selected_image,
        c.rarity_tier,
        ur.mood_status,
        ur.unhappy_count
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      WHERE ur.user_id = $1
      ORDER BY RANDOM()
    `, [userId]);

    return result.rows;
  }

  /**
   * Select 2-5 participants with weighted probability
   */
  selectParticipants(chatlings) {
    // Determine count based on weights
    const count = this.weightedRandom(this.participantWeights);

    // Select random chatlings (up to available count)
    const maxCount = Math.min(count, chatlings.length);
    const shuffled = [...chatlings].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, maxCount);
  }

  /**
   * Weighted random selection
   */
  weightedRandom(weights) {
    const rand = Math.random();
    let cumulative = 0;

    for (const [value, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand < cumulative) {
        return parseInt(value);
      }
    }

    return 2; // Default fallback
  }

  /**
   * Get random active trending topic
   */
  async getRandomTopic(client) {
    const result = await client.query(`
      SELECT id, topic_text, category, sentiment
      FROM trending_topics
      WHERE is_active = true
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY RANDOM()
      LIMIT 1
    `);

    return result.rows[0];
  }

  /**
   * Save conversation to database
   */
  async saveConversation(userId, topic, participantCount, moodImpact, messages, client) {
    // Insert conversation
    const conversationResult = await client.query(`
      INSERT INTO chatling_conversations
        (user_id, topic_id, topic_text, participant_count, mood_impact)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [userId, topic.id, topic.topic_text, participantCount, JSON.stringify(moodImpact)]);

    const conversationId = conversationResult.rows[0].id;

    // Insert messages
    for (const message of messages) {
      await client.query(`
        INSERT INTO conversation_messages
          (conversation_id, creature_id, message_text, message_order, sentiment)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        conversationId,
        message.creature_id,
        message.message_text,
        message.message_order,
        message.sentiment
      ]);
    }

    return conversationId;
  }

  /**
   * Update chatling moods based on conversation
   */
  async updateMoods(userId, moodImpact, conversationId, client) {
    // Update happy chatlings
    for (const creatureId of moodImpact.happy) {
      await client.query(`
        UPDATE user_rewards
        SET
          mood_status = 'happy',
          mood_updated_at = CURRENT_TIMESTAMP,
          unhappy_count = 0,
          last_conversation_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND creature_id = $2
      `, [userId, creatureId]);
    }

    // Update neutral chatlings
    for (const creatureId of moodImpact.neutral) {
      await client.query(`
        UPDATE user_rewards
        SET
          mood_status = 'neutral',
          mood_updated_at = CURRENT_TIMESTAMP,
          last_conversation_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND creature_id = $2
      `, [userId, creatureId]);
    }

    // Update unhappy chatlings (increment unhappy_count)
    for (const creatureId of moodImpact.unhappy) {
      await client.query(`
        UPDATE user_rewards
        SET
          mood_status = 'unhappy',
          mood_updated_at = CURRENT_TIMESTAMP,
          unhappy_count = unhappy_count + 1,
          last_conversation_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND creature_id = $2
      `, [userId, creatureId]);
    }
  }

  /**
   * Check if unhappy chatlings run away
   * 10% chance if unhappy_count >= 3
   */
  async checkRunaways(userId, unhappyChatlings, conversationId, client) {
    for (const creatureId of unhappyChatlings) {
      // Get current unhappy count
      const result = await client.query(`
        SELECT unhappy_count, mood_status
        FROM user_rewards
        WHERE user_id = $1 AND creature_id = $2
      `, [userId, creatureId]);

      if (result.rows.length === 0) continue;

      const { unhappy_count, mood_status } = result.rows[0];

      // Check if eligible to run away
      if (unhappy_count >= 3 && mood_status === 'unhappy') {
        // 10% chance to run away
        if (Math.random() < 0.10) {
          await this.procesRunaway(userId, creatureId, unhappy_count, conversationId, client);
        }
      }
    }
  }

  /**
   * Process a chatling running away
   */
  async procesRunaway(userId, creatureId, unhappyCount, conversationId, client) {
    // Determine recovery difficulty based on unhappy count
    let difficulty;
    if (unhappyCount <= 4) difficulty = 'easy';
    else if (unhappyCount <= 6) difficulty = 'normal';
    else difficulty = 'hard';

    // Move to runaway_chatlings table
    await client.query(`
      INSERT INTO runaway_chatlings
        (user_id, creature_id, unhappy_count, last_conversation_id, recovery_difficulty)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, creatureId, unhappyCount, conversationId, difficulty]);

    // Remove from user_rewards
    await client.query(`
      DELETE FROM user_rewards
      WHERE user_id = $1 AND creature_id = $2
    `, [userId, creatureId]);

    // Also remove from team if assigned
    await client.query(`
      UPDATE users
      SET
        current_creature_id = CASE WHEN current_creature_id = $2 THEN NULL ELSE current_creature_id END,
        team_member_2_id = CASE WHEN team_member_2_id = $2 THEN NULL ELSE team_member_2_id END,
        team_member_3_id = CASE WHEN team_member_3_id = $2 THEN NULL ELSE team_member_3_id END,
        team_member_4_id = CASE WHEN team_member_4_id = $2 THEN NULL ELSE team_member_4_id END,
        team_member_5_id = CASE WHEN team_member_5_id = $2 THEN NULL ELSE team_member_5_id END
      WHERE id = $1
    `, [userId, creatureId]);

    // Create notification
    const creatureResult = await client.query(`
      SELECT creature_name FROM creatures WHERE id = $1
    `, [creatureId]);

    const creatureName = creatureResult.rows[0]?.creature_name || 'A chatling';

    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, metadata)
      VALUES ($1, 'chatling_runaway', $2, $3, $4)
    `, [
      userId,
      'Chatling Ran Away!',
      `${creatureName} became too unhappy and left your collection. You can try to recover them from the Chatroom.`,
      JSON.stringify({
        creature_id: creatureId,
        creature_name: creatureName,
        difficulty
      })
    ]);

    console.log(`  ⚠️  Chatling ${creatureId} ran away from user ${userId}`);
  }

  /**
   * Attempt to recover a runaway chatling
   */
  async recoverRunaway(userId, creatureId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get runaway info
      const runawayResult = await client.query(`
        SELECT * FROM runaway_chatlings
        WHERE user_id = $1
          AND creature_id = $2
          AND is_recovered = false
      `, [userId, creatureId]);

      if (runawayResult.rows.length === 0) {
        return { success: false, message: 'Chatling not found in runaway pool' };
      }

      const runaway = runawayResult.rows[0];

      // Calculate success chance
      const successRates = {
        easy: 0.80,
        normal: 0.50,
        hard: 0.20
      };

      const successChance = successRates[runaway.recovery_difficulty] || 0.50;
      const success = Math.random() < successChance;

      if (success) {
        // Recovery successful!
        // Add back to collection
        await client.query(`
          INSERT INTO user_rewards (user_id, creature_id, platform, mood_status, unhappy_count)
          VALUES ($1, $2, 'Recovered', 'neutral', 0)
        `, [userId, creatureId]);

        // Mark as recovered
        await client.query(`
          UPDATE runaway_chatlings
          SET is_recovered = true, recovered_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [runaway.id]);

        // Create notification
        const creatureResult = await client.query(`
          SELECT creature_name FROM creatures WHERE id = $1
        `, [creatureId]);

        const creatureName = creatureResult.rows[0]?.creature_name || 'Chatling';

        await client.query(`
          INSERT INTO notifications (user_id, notification_type, title, message, metadata)
          VALUES ($1, 'chatling_recovered', $2, $3, $4)
        `, [
          userId,
          'Chatling Recovered!',
          `${creatureName} has returned to your collection!`,
          JSON.stringify({ creature_id: creatureId, creature_name: creatureName })
        ]);

        return { success: true, message: `${creatureName} has returned!` };

      } else {
        // Recovery failed - increase difficulty
        const newDifficulty = runaway.recovery_difficulty === 'easy' ? 'normal'
          : runaway.recovery_difficulty === 'normal' ? 'hard'
          : 'hard';

        await client.query(`
          UPDATE runaway_chatlings
          SET recovery_difficulty = $1
          WHERE id = $2
        `, [newDifficulty, runaway.id]);

        return {
          success: false,
          message: 'Recovery failed. The chatling is still missing. Try again later.',
          newDifficulty
        };
      }

    } finally {
      await client.end();
    }
  }

  /**
   * Create notification for new conversation
   */
  async createConversationNotification(userId, participantCount, client) {
    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, link, metadata)
      VALUES ($1, 'new_conversation', $2, $3, $4, $5)
    `, [
      userId,
      'New Chatroom Activity!',
      `${participantCount} of your chatlings just had a conversation. Check it out!`,
      '/user/chatroom.html',
      JSON.stringify({ participant_count: participantCount })
    ]);
  }

  /**
   * Get user's conversations (paginated)
   */
  async getConversations(userId, limit = 10, offset = 0) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT
          cc.id,
          cc.topic_text,
          cc.participant_count,
          cc.mood_impact,
          cc.is_read,
          cc.created_at,
          (
            SELECT json_agg(
              json_build_object(
                'id', cm.id,
                'creature_id', cm.creature_id,
                'creature_name', c.creature_name,
                'creature_image', c.selected_image,
                'message_text', cm.message_text,
                'message_order', cm.message_order,
                'sentiment', cm.sentiment
              ) ORDER BY cm.message_order
            )
            FROM conversation_messages cm
            JOIN creatures c ON cm.creature_id = c.id
            WHERE cm.conversation_id = cc.id
          ) as messages
        FROM chatling_conversations cc
        WHERE cc.user_id = $1
        ORDER BY cc.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;

    } finally {
      await client.end();
    }
  }

  /**
   * Get runaway chatlings for user
   */
  async getRunaways(userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT
          rc.*,
          c.creature_name,
          c.selected_image,
          c.rarity_tier
        FROM runaway_chatlings rc
        JOIN creatures c ON rc.creature_id = c.id
        WHERE rc.user_id = $1
          AND rc.is_recovered = false
        ORDER BY rc.ran_away_at DESC
      `, [userId]);

      return result.rows;

    } finally {
      await client.end();
    }
  }

  /**
   * Mark conversation as read
   */
  async markConversationRead(conversationId, userId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      await client.query(`
        UPDATE chatling_conversations
        SET is_read = true
        WHERE id = $1 AND user_id = $2
      `, [conversationId, userId]);

    } finally {
      await client.end();
    }
  }
}

module.exports = ChatroomService;
