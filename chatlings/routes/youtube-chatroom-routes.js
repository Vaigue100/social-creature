/**
 * YouTube AI Conversation API Routes
 * Handles AI-generated conversation viewing and attitude management
 */

const express = require('express');
const router = express.Router();
const db = require('../services/db');
const YouTubeConversationService = require('../services/youtube-conversation-service');

// Lazy initialize service (only when first API call is made)
let conversationService = null;
function getConversationService() {
  if (!conversationService) {
    try {
      conversationService = new YouTubeConversationService();
      console.log('✅ YouTubeConversationService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize YouTubeConversationService:', error);
      throw error;
    }
  }
  return conversationService;
}

/**
 * GET /api/chatroom/youtube/latest
 * Get the latest AI-generated conversation (personalized for user)
 */
router.get('/youtube/latest', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const conversation = await getConversationService().getConversationForUser(req.session.userId);

    res.json({
      success: true,
      conversation,
      message: conversation.fromCache
        ? 'Loaded your personalized conversation from cache'
        : 'Generated new personalized conversation'
    });

  } catch (error) {
    console.error('Error fetching latest conversation:', error);

    if (error.message === 'No conversations available') {
      return res.status(404).json({
        error: 'No conversations available yet',
        message: 'AI conversations are generated daily. Please check back soon!'
      });
    }

    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/chatroom/youtube/videos
 * List all available AI conversations
 */
router.get('/youtube/videos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const conversations = await getConversationService().getAllConversations(limit);

    res.json({
      success: true,
      conversations,
      total: conversations.length
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/chatroom/youtube/video/:videoId
 * Get specific video conversation (personalized for user)
 */
router.get('/youtube/video/:videoId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const conversation = await getConversationService().getConversationForUser(
      req.session.userId,
      req.params.videoId
    );

    res.json({
      success: true,
      conversation,
      message: conversation.fromCache
        ? 'Loaded your personalized conversation from cache'
        : 'Generated new personalized conversation'
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);

    if (error.message === 'No conversations available') {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'This video does not have an AI conversation yet'
      });
    }

    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/chatroom/youtube/history
 * Get user's conversation viewing history
 */
router.get('/youtube/history', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await getConversationService().getUserConversationHistory(req.session.userId, limit);

    // Calculate stats
    const totalGlow = history.reduce((sum, h) => sum + h.total_glow_change, 0);
    const avgGlow = history.length > 0 ? totalGlow / history.length : 0;

    res.json({
      success: true,
      history,
      stats: {
        totalViews: history.length,
        totalGlowEarned: totalGlow,
        averageGlow: Math.round(avgGlow * 10) / 10
      }
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/user/chat-attitude
 * Get user's current chat attitude settings
 */
router.get('/user/chat-attitude', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await db.query(
      `SELECT * FROM user_chat_attitudes WHERE user_id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      // Return default attitude
      return res.json({
        success: true,
        attitude: {
          enthusiasm_level: 5,
          criticism_level: 5,
          humor_level: 5,
          attitude_type: 'balanced'
        },
        isDefault: true
      });
    }

    res.json({
      success: true,
      attitude: result.rows[0],
      isDefault: false
    });

  } catch (error) {
    console.error('Error fetching attitude:', error);
    res.status(500).json({ error: 'Failed to fetch attitude' });
  }
});

/**
 * PUT /api/user/chat-attitude
 * Update user's chat attitude settings
 */
router.put('/user/chat-attitude', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { enthusiasm_level, criticism_level, humor_level } = req.body;

  // Validate inputs
  if (!enthusiasm_level || !criticism_level || !humor_level) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (enthusiasm_level < 1 || enthusiasm_level > 10 ||
      criticism_level < 1 || criticism_level > 10 ||
      humor_level < 1 || humor_level > 10) {
    return res.status(400).json({
      error: 'Invalid attitude values (must be 1-10)'
    });
  }

  // Determine attitude type
  const attitudeType = determineAttitudeType(enthusiasm_level, criticism_level, humor_level);

  try {
    await db.query(`
      INSERT INTO user_chat_attitudes (
        user_id,
        enthusiasm_level,
        criticism_level,
        humor_level,
        attitude_type
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        enthusiasm_level = EXCLUDED.enthusiasm_level,
        criticism_level = EXCLUDED.criticism_level,
        humor_level = EXCLUDED.humor_level,
        attitude_type = EXCLUDED.attitude_type,
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.session.userId,
      enthusiasm_level,
      criticism_level,
      humor_level,
      attitudeType
    ]);

    res.json({
      success: true,
      attitude: {
        enthusiasm_level,
        criticism_level,
        humor_level,
        attitude_type: attitudeType
      },
      message: 'Attitude updated successfully'
    });

  } catch (error) {
    console.error('Error updating attitude:', error);
    res.status(500).json({ error: 'Failed to update attitude' });
  }
});

/**
 * GET /api/chatroom/youtube/stats
 * Get AI generation statistics
 */
router.get('/youtube/stats', async (req, res) => {
  try {
    const stats = await getConversationService().getGenerationStats();

    res.json({
      success: true,
      stats: {
        totalConversations: parseInt(stats.total_conversations),
        totalComments: parseInt(stats.total_comments),
        totalCost: parseFloat(stats.total_cost || 0),
        avgCostPerConversation: parseFloat(stats.avg_cost_per_conversation || 0),
        avgDurationMs: parseFloat(stats.avg_duration_ms || 0),
        lastGeneratedAt: stats.last_generated_at
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/chatroom/youtube/validate
 * Validate AI setup (admin/debug endpoint)
 */
router.get('/youtube/validate', async (req, res) => {
  try {
    const validation = await getConversationService().validateAISetup();

    res.json({
      success: validation.success,
      validation
    });

  } catch (error) {
    console.error('Error validating AI setup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate AI setup',
      message: error.message
    });
  }
});

/**
 * Helper: Determine attitude type from levels
 */
function determineAttitudeType(enthusiasm, criticism, humor) {
  // Check for dominant attitude (>= 8)
  if (enthusiasm >= 8) return 'enthusiastic';
  if (criticism >= 8) return 'skeptical';
  if (humor >= 8) return 'humorous';

  // Check for balanced
  const avg = (enthusiasm + criticism + humor) / 3;
  const variance = Math.max(
    Math.abs(enthusiasm - avg),
    Math.abs(criticism - avg),
    Math.abs(humor - avg)
  );

  if (variance <= 2) return 'balanced';

  // Default to most prominent
  const max = Math.max(enthusiasm, criticism, humor);
  if (enthusiasm === max) return 'enthusiastic';
  if (criticism === max) return 'skeptical';
  if (humor === max) return 'humorous';

  return 'balanced';
}

module.exports = router;
