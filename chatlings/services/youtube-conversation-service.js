/**
 * YouTube Conversation Service
 *
 * Main orchestrator for AI-generated YouTube conversations.
 * Coordinates conversation generation, storage, retrieval, and customization.
 */

const { Pool } = require('pg');
const AIConversationGenerator = require('./ai-conversation-generator');
const ConversationCustomizer = require('./conversation-customizer');

class YouTubeConversationService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    this.aiGenerator = new AIConversationGenerator();
    this.customizer = new ConversationCustomizer();
  }

  /**
   * Generate conversations for multiple videos (daily job)
   * @param {Array} videos - Array of video objects from trending_topics
   * @returns {Object} - Generation statistics
   */
  async generateConversationsForVideos(videos) {
    console.log(`\n🎬 Generating AI conversations for ${videos.length} videos...`);

    const stats = {
      totalVideos: videos.length,
      successful: 0,
      failed: 0,
      totalCost: 0,
      totalDuration: 0,
      totalComments: 0,
      errors: []
    };

    for (const video of videos) {
      try {
        console.log(`\n[${ stats.successful + stats.failed + 1}/${videos.length}] Processing: ${video.title}`);

        // Check if conversation already exists for this video
        const existing = await this.pool.query(
          `SELECT id FROM youtube_base_conversations WHERE youtube_video_id = $1`,
          [video.youtube_video_id]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Conversation already exists, skipping...`);
          continue;
        }

        // Generate AI conversation
        const result = await this.aiGenerator.generateConversation(video);

        // Store in database
        await this.storeBaseConversation(video.id, video.youtube_video_id, result);

        // Update topic with conversation flag
        await this.pool.query(
          `UPDATE trending_topics
           SET has_conversation = true,
               conversation_generated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [video.id]
        );

        // Update stats
        stats.successful++;
        stats.totalCost += result.cost;
        stats.totalDuration += result.duration;
        stats.totalComments += result.totalComments;

        console.log(`   ✅ Stored conversation (ID: ${result.conversationId})`);

      } catch (error) {
        console.error(`   ❌ Failed to generate conversation:`, error.message);
        stats.failed++;
        stats.errors.push({
          videoId: video.youtube_video_id,
          title: video.title,
          error: error.message
        });
      }

      // Small delay between generations to avoid rate limits
      await this.sleep(1000);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ BATCH GENERATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Successful: ${stats.successful}/${stats.totalVideos}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Total comments: ${stats.totalComments}`);
    console.log(`   Total cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`   Total duration: ${(stats.totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Avg cost per video: $${(stats.totalCost / stats.successful).toFixed(4)}`);
    console.log('');

    return stats;
  }

  /**
   * Store base conversation in database
   */
  async storeBaseConversation(topicId, youtubeVideoId, generationResult) {
    const result = await this.pool.query(`
      INSERT INTO youtube_base_conversations (
        topic_id,
        youtube_video_id,
        conversation_data,
        total_comments,
        ai_model,
        ai_provider,
        generation_cost_usd,
        generation_duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      topicId,
      youtubeVideoId,
      JSON.stringify(generationResult.conversationData),
      generationResult.totalComments,
      'gpt-3.5-turbo',
      process.env.AI_PROVIDER || 'openai',
      generationResult.cost,
      generationResult.duration
    ]);

    return result.rows[0].id;
  }

  /**
   * Get personalized conversation for user
   * @param {string} userId - User ID
   * @param {string} videoId - YouTube video ID (optional - gets latest if not specified)
   * @returns {Object} - Personalized conversation
   */
  async getConversationForUser(userId, videoId = null) {
    console.log(`\n👤 Getting conversation for user ${userId}...`);

    try {
      // Get base conversation
      let baseConversation;
      if (videoId) {
        baseConversation = await this.getBaseConversationByVideoId(videoId);
      } else {
        baseConversation = await this.getLatestBaseConversation();
      }

      if (!baseConversation) {
        throw new Error('No conversations available');
      }

      console.log(`   📹 Video: ${baseConversation.conversationData.metadata.videoTitle}`);

      // Check if user has already viewed this conversation
      const existingView = await this.getUserConversation(userId, baseConversation.id);

      if (existingView) {
        console.log(`   ♻️  Returning cached personalized conversation`);
        return {
          ...existingView,
          fromCache: true
        };
      }

      // Get user's attitude settings
      const attitude = await this.getUserAttitude(userId);

      // Customize conversation for this user
      const customized = await this.customizer.customizeConversation(
        baseConversation,
        { id: userId },
        attitude
      );

      // Store personalized version
      const userConversationId = await this.storeUserConversation(
        userId,
        baseConversation.id,
        baseConversation.topic_id,
        customized
      );

      // Update user's glow
      await this.updateUserGlow(userId, customized.totalGlowChange);

      console.log(`   ✅ Personalized conversation created (ID: ${userConversationId})`);

      return {
        id: userConversationId,
        baseConversationId: baseConversation.id,
        topicId: baseConversation.topic_id,
        video: {
          youtubeVideoId: baseConversation.youtube_video_id,
          title: baseConversation.conversationData.metadata.videoTitle,
          category: baseConversation.conversationData.metadata.category
        },
        customizedContent: customized.customizedContent,
        assignedChatlings: customized.assignedChatlings,
        glowImpact: customized.glowImpact,
        totalGlowChange: customized.totalGlowChange,
        viewedAt: new Date(),
        fromCache: false
      };

    } catch (error) {
      console.error('❌ Error getting conversation for user:', error.message);
      throw error;
    }
  }

  /**
   * Get base conversation by video ID
   */
  async getBaseConversationByVideoId(videoId) {
    const result = await this.pool.query(`
      SELECT
        bc.id,
        bc.topic_id,
        bc.youtube_video_id,
        bc.conversation_data,
        bc.total_comments,
        bc.generated_at
      FROM youtube_base_conversations bc
      WHERE bc.youtube_video_id = $1
    `, [videoId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get latest base conversation
   */
  async getLatestBaseConversation() {
    const result = await this.pool.query(`
      SELECT
        bc.id,
        bc.topic_id,
        bc.youtube_video_id,
        bc.conversation_data,
        bc.total_comments,
        bc.generated_at
      FROM youtube_base_conversations bc
      ORDER BY bc.generated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get user's existing conversation view
   */
  async getUserConversation(userId, baseConversationId) {
    const result = await this.pool.query(`
      SELECT
        uc.id,
        uc.base_conversation_id,
        uc.topic_id,
        uc.assigned_chatlings,
        uc.customized_content,
        uc.glow_impact,
        uc.total_glow_change,
        uc.viewed_at,
        bc.youtube_video_id,
        bc.conversation_data
      FROM user_youtube_conversations uc
      JOIN youtube_base_conversations bc ON uc.base_conversation_id = bc.id
      WHERE uc.user_id = $1 AND uc.base_conversation_id = $2
    `, [userId, baseConversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      baseConversationId: row.base_conversation_id,
      topicId: row.topic_id,
      video: {
        youtubeVideoId: row.youtube_video_id,
        title: row.conversation_data.metadata.videoTitle,
        category: row.conversation_data.metadata.category
      },
      customizedContent: row.customized_content,
      assignedChatlings: row.assigned_chatlings,
      glowImpact: row.glow_impact,
      totalGlowChange: row.total_glow_change,
      viewedAt: row.viewed_at
    };
  }

  /**
   * Store user's personalized conversation
   */
  async storeUserConversation(userId, baseConversationId, topicId, customized) {
    const result = await this.pool.query(`
      INSERT INTO user_youtube_conversations (
        user_id,
        base_conversation_id,
        topic_id,
        assigned_chatlings,
        customized_content,
        glow_impact,
        total_glow_change
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      userId,
      baseConversationId,
      topicId,
      JSON.stringify(customized.assignedChatlings),
      JSON.stringify(customized.customizedContent),
      JSON.stringify(customized.glowImpact),
      customized.totalGlowChange
    ]);

    return result.rows[0].id;
  }

  /**
   * Get user's chat attitude settings
   */
  async getUserAttitude(userId) {
    const result = await this.pool.query(
      `SELECT * FROM user_chat_attitudes WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default attitude
      return this.customizer.getDefaultAttitude();
    }

    return result.rows[0];
  }

  /**
   * Update user's glow from conversation viewing
   */
  async updateUserGlow(userId, glowChange) {
    await this.pool.query(`
      UPDATE user_rewards
      SET
        total_glow_earned = COALESCE(total_glow_earned, 0) + $2,
        chatroom_participations = COALESCE(chatroom_participations, 0) + 1,
        last_chatroom_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId, glowChange]);
  }

  /**
   * Get all available conversations
   */
  async getAllConversations(limit = 10) {
    const result = await this.pool.query(`
      SELECT
        bc.id,
        bc.youtube_video_id,
        bc.total_comments,
        bc.generated_at,
        bc.conversation_data->>'metadata' as metadata,
        tt.title,
        tt.category,
        tt.thumbnail_url
      FROM youtube_base_conversations bc
      JOIN trending_topics tt ON bc.topic_id = tt.id
      ORDER BY bc.generated_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      id: row.id,
      youtubeVideoId: row.youtube_video_id,
      title: row.title,
      category: row.category,
      thumbnailUrl: row.thumbnail_url,
      totalComments: row.total_comments,
      generatedAt: row.generated_at
    }));
  }

  /**
   * Get user's conversation history
   */
  async getUserConversationHistory(userId, limit = 10) {
    const result = await this.pool.query(`
      SELECT
        uc.id,
        uc.total_glow_change,
        uc.viewed_at,
        bc.youtube_video_id,
        tt.title,
        tt.thumbnail_url
      FROM user_youtube_conversations uc
      JOIN youtube_base_conversations bc ON uc.base_conversation_id = bc.id
      JOIN trending_topics tt ON bc.topic_id = tt.id
      WHERE uc.user_id = $1
      ORDER BY uc.viewed_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats() {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_conversations,
        SUM(total_comments) as total_comments,
        SUM(generation_cost_usd) as total_cost,
        AVG(generation_cost_usd) as avg_cost_per_conversation,
        AVG(generation_duration_ms) as avg_duration_ms,
        MAX(generated_at) as last_generated_at
      FROM youtube_base_conversations
    `);

    return result.rows[0];
  }

  /**
   * Validate AI configuration
   */
  async validateAISetup() {
    return await this.aiGenerator.validateConfiguration();
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = YouTubeConversationService;
