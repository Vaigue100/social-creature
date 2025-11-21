/**
 * Chatroom Background Service
 *
 * Runs continuously every 15 minutes
 * Generates conversations for users based on likelihood scores
 *
 * Features:
 * - Dynamic likelihood calculation
 * - Prioritizes active users
 * - Generates limited conversations per run
 * - Handles inactivity topics
 */

const { Client } = require('pg');
const ChatroomService = require('./chatroom-service');

class ChatroomBackgroundService {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    this.chatroomService = new ChatroomService(dbConfig);
    this.interval = null;
    this.isRunning = false;

    // Configuration
    this.runIntervalMinutes = 15;
    this.maxConversationsPerRun = 10; // Generate max 10 conversations per 15-min run
    this.inactivityDaysThreshold = 3; // Days before inactivity topics appear
  }

  /**
   * Start the background service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Chatroom background service already running');
      return;
    }

    this.isRunning = true;
    console.log(`✓ Chatroom background service started (runs every ${this.runIntervalMinutes} minutes)`);

    // Run immediately on start
    this.runGeneration();

    // Schedule periodic runs
    this.interval = setInterval(() => {
      this.runGeneration();
    }, this.runIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop the background service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    console.log('✓ Chatroom background service stopped');
  }

  /**
   * Main generation cycle
   */
  async runGeneration() {
    const client = new Client(this.dbConfig);
    const batchId = `batch_${Date.now()}`;

    try {
      await client.connect();

      console.log(`\n${'='.repeat(80)}`);
      console.log(`Chatroom Generation Cycle - ${new Date().toLocaleString()}`);
      console.log('='.repeat(80));

      // 1. Update all user likelihood scores
      await this.updateAllLikelihoodScores(client);

      // 2. Get eligible users sorted by likelihood
      const eligibleUsers = await this.getEligibleUsers(client);

      console.log(`  Eligible users: ${eligibleUsers.length}`);

      if (eligibleUsers.length === 0) {
        console.log('  No eligible users for conversations');
        return;
      }

      // 3. Select top N users based on likelihood
      const selectedUsers = eligibleUsers.slice(0, this.maxConversationsPerRun);

      console.log(`  Selected users for generation: ${selectedUsers.length}`);
      console.log(`  Average likelihood: ${(selectedUsers.reduce((sum, u) => sum + parseFloat(u.likelihood_score), 0) / selectedUsers.length).toFixed(3)}`);

      // 4. Log batch start
      await this.logBatchStart(client, batchId, selectedUsers.length);

      // 5. Generate conversations
      let successCount = 0;
      let errorCount = 0;

      for (const user of selectedUsers) {
        try {
          // Check if user should get inactivity topic
          const useInactivityTopic = user.days_since_login >= this.inactivityDaysThreshold;

          // Generate conversation
          const conversationId = await this.generateConversationForUser(
            user.user_id,
            useInactivityTopic,
            client
          );

          if (conversationId) {
            successCount++;
            console.log(`  ✓ User ${user.user_id.substring(0, 8)}... (likelihood: ${user.likelihood_score}, inactive: ${useInactivityTopic})`);
          }

        } catch (error) {
          errorCount++;
          console.error(`  ✗ Error for user ${user.user_id.substring(0, 8)}...:`, error.message);
        }
      }

      // 6. Log batch completion
      await this.logBatchComplete(client, batchId, successCount, errorCount);

      console.log(`\n  Results: ${successCount} conversations generated, ${errorCount} errors`);
      console.log('='.repeat(80));

    } catch (error) {
      console.error('Error in chatroom generation cycle:', error);
    } finally {
      await client.end();
    }
  }

  /**
   * Update likelihood scores for all users
   */
  async updateAllLikelihoodScores(client) {
    // Ensure all users have a likelihood record
    await client.query(`
      INSERT INTO user_chat_likelihood (user_id, last_login_at)
      SELECT u.id, u.created_at
      FROM users u
      LEFT JOIN user_chat_likelihood ucl ON u.id = ucl.user_id
      WHERE ucl.user_id IS NULL
    `);

    // Update basic stats for all users
    await client.query(`
      UPDATE user_chat_likelihood ucl
      SET
        last_login_at = u.created_at,
        total_chatlings = (
          SELECT COUNT(*) FROM user_rewards WHERE user_id = ucl.user_id
        ),
        active_chatlings = (
          SELECT COUNT(*) FROM user_rewards WHERE user_id = ucl.user_id
        ) - (
          SELECT COUNT(*) FROM runaway_chatlings WHERE user_id = ucl.user_id AND is_recovered = false
        ),
        runaway_count = (
          SELECT COUNT(*) FROM runaway_chatlings WHERE user_id = ucl.user_id AND is_recovered = false
        ),
        chats_last_24h = (
          SELECT COUNT(*) FROM chatling_conversations
          WHERE user_id = ucl.user_id
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ),
        chats_last_7d = (
          SELECT COUNT(*) FROM chatling_conversations
          WHERE user_id = ucl.user_id
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ),
        last_chat_at = (
          SELECT MAX(created_at) FROM chatling_conversations WHERE user_id = ucl.user_id
        ),
        days_since_login = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.created_at)) / 86400,
        hours_since_last_chat = EXTRACT(EPOCH FROM (
          CURRENT_TIMESTAMP - COALESCE(
            (SELECT MAX(created_at) FROM chatling_conversations WHERE user_id = ucl.user_id),
            u.created_at
          )
        )) / 3600,
        updated_at = CURRENT_TIMESTAMP
      FROM users u
      WHERE ucl.user_id = u.id
    `);

    // Calculate likelihood scores using database function
    await client.query(`
      UPDATE user_chat_likelihood
      SET likelihood_score = calculate_chat_likelihood(user_id)
    `);
  }

  /**
   * Get eligible users sorted by likelihood
   */
  async getEligibleUsers(client) {
    const result = await client.query(`
      SELECT
        user_id,
        likelihood_score,
        days_since_login,
        total_chatlings,
        active_chatlings,
        chats_last_24h,
        hours_since_last_chat
      FROM user_chat_likelihood
      WHERE likelihood_score > 0
        AND active_chatlings >= 2
      ORDER BY likelihood_score DESC, days_since_login ASC
    `);

    return result.rows;
  }

  /**
   * Generate conversation for a specific user
   */
  async generateConversationForUser(userId, useInactivityTopic, client) {
    // Get topic
    let topic;
    let isInactivityTopic = false;

    if (useInactivityTopic && Math.random() < 0.4) { // 40% chance if inactive
      // Use inactivity topic
      const result = await client.query(`
        SELECT topic_text, 'inactivity' as category
        FROM inactivity_topics
        WHERE is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        topic = {
          id: null,
          topic_text: result.rows[0].topic_text,
          category: 'inactivity',
          sentiment: 'negative'
        };
        isInactivityTopic = true;
      }
    }

    // Fallback to regular topic if no inactivity topic
    if (!topic) {
      const result = await client.query(`
        SELECT id, topic_text, category, sentiment
        FROM trending_topics
        WHERE is_active = true
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY RANDOM()
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null; // No topics available
      }

      topic = result.rows[0];
    }

    // Get user's chatlings
    const chatlingsResult = await client.query(`
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

    const chatlings = chatlingsResult.rows;

    if (chatlings.length < 2) {
      return null;
    }

    // Select participants
    const participantCount = this.chatroomService.selectParticipants(chatlings).length;
    const participants = chatlings.slice(0, Math.min(participantCount, chatlings.length));

    // Generate conversation
    const { messages, moodImpact } = this.chatroomService.generator.generateConversation(
      participants,
      topic,
      isInactivityTopic
    );

    // Save conversation
    const conversationId = await this.chatroomService.saveConversation(
      userId,
      topic,
      participants.length,
      moodImpact,
      messages,
      client
    );

    // Update moods
    await this.chatroomService.updateMoods(userId, moodImpact, conversationId, client);

    // Check for runaways
    await this.chatroomService.checkRunaways(userId, moodImpact.unhappy, conversationId, client);

    // Create notification
    await this.chatroomService.createConversationNotification(userId, participants.length, client);

    return conversationId;
  }

  /**
   * Log batch start
   */
  async logBatchStart(client, batchName, usersToProcess) {
    await client.query(`
      INSERT INTO conversation_generation_log
        (batch_name, users_processed, conversations_created, errors, status, eligible_users)
      VALUES ($1, 0, 0, 0, 'running', $2)
    `, [batchName, usersToProcess]);
  }

  /**
   * Log batch completion
   */
  async logBatchComplete(client, batchName, successCount, errorCount) {
    await client.query(`
      UPDATE conversation_generation_log
      SET
        users_processed = $2,
        conversations_created = $2,
        errors = $3,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE batch_name = $1
    `, [batchName, successCount, errorCount]);
  }
}

module.exports = ChatroomBackgroundService;
