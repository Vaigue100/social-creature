/**
 * YouTube Chatroom API Routes
 * Handles chatroom schedules, participation, and attitude management
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const glowCalculator = require('../services/glow-calculator');
const chatroomScheduler = require('../services/chatroom-scheduler');

/**
 * GET /api/chatroom/schedules/upcoming
 * Get upcoming chatroom schedules
 */
router.get('/schedules/upcoming', async (req, res) => {
  try {
    const schedules = await chatroomScheduler.getUpcomingChatrooms();

    // Calculate time until each chatroom
    const schedulesWithCountdown = schedules.map(schedule => ({
      ...schedule,
      timeUntilOpen: Math.max(0, new Date(schedule.open_time) - Date.now()),
      isOpenSoon: new Date(schedule.open_time) - Date.now() < 15 * 60 * 1000 // < 15 min
    }));

    res.json({
      success: true,
      schedules: schedulesWithCountdown
    });

  } catch (error) {
    console.error('Error fetching upcoming schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

/**
 * GET /api/chatroom/schedules/active
 * Get currently active chatroom
 */
router.get('/schedules/active', async (req, res) => {
  try {
    const activeChatroom = await chatroomScheduler.getActiveChatroom();

    if (!activeChatroom) {
      return res.json({
        success: true,
        chatroom: null,
        message: 'No active chatroom right now'
      });
    }

    // Check if user has already participated
    let hasParticipated = false;
    if (req.session.userId) {
      const participationCheck = await db.query(`
        SELECT id FROM user_attitude_history
        WHERE user_id = $1 AND chatroom_id = $2
      `, [req.session.userId, activeChatroom.id]);

      hasParticipated = participationCheck.rows.length > 0;
    }

    res.json({
      success: true,
      chatroom: {
        ...activeChatroom,
        timeRemaining: Math.max(0, new Date(activeChatroom.close_time) - Date.now()),
        hasParticipated
      }
    });

  } catch (error) {
    console.error('Error fetching active chatroom:', error);
    res.status(500).json({ error: 'Failed to fetch active chatroom' });
  }
});

/**
 * GET /api/chatroom/schedules/:id
 * Get specific chatroom schedule
 */
router.get('/schedules/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM chatroom_schedules
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    res.json({
      success: true,
      schedule: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * POST /api/chatroom/participate
 * Participate in active chatroom
 */
router.post('/participate', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { chatroomId, creatureId, enthusiasm, criticism, humor } = req.body;

  // Validate inputs
  if (!chatroomId || !creatureId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!enthusiasm || !criticism || !humor ||
      enthusiasm < 1 || enthusiasm > 10 ||
      criticism < 1 || criticism > 10 ||
      humor < 1 || humor > 10) {
    return res.status(400).json({ error: 'Invalid attitude values (must be 1-10)' });
  }

  try {
    // Check if chatroom is active
    const chatroomResult = await db.query(`
      SELECT * FROM chatroom_schedules
      WHERE id = $1 AND status = 'open'
        AND open_time <= NOW() AND close_time > NOW()
    `, [chatroomId]);

    if (chatroomResult.rows.length === 0) {
      return res.status(400).json({ error: 'Chatroom is not currently active' });
    }

    const chatroom = chatroomResult.rows[0];

    // Check if already participated
    const alreadyParticipated = await db.query(`
      SELECT id FROM user_attitude_history
      WHERE user_id = $1 AND chatroom_id = $2
    `, [req.session.userId, chatroomId]);

    if (alreadyParticipated.rows.length > 0) {
      return res.status(400).json({ error: 'Already participated in this chatroom' });
    }

    // Verify creature ownership
    const creatureCheck = await db.query(`
      SELECT c.id FROM creatures c
      JOIN user_rewards ur ON c.id = ur.creature_id
      WHERE c.id = $1 AND ur.user_id = $2
    `, [creatureId, req.session.userId]);

    if (creatureCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Creature not found or not owned' });
    }

    // Get user's participation history for variety bonus
    const historyResult = await db.query(`
      SELECT enthusiasm, criticism, humor
      FROM user_attitude_history
      WHERE user_id = $1
      ORDER BY participated_at DESC
      LIMIT 5
    `, [req.session.userId]);

    // Calculate glow
    const videoContext = {
      category: chatroom.video_category,
      subcategory: chatroom.video_subcategory
    };

    const userSettings = { enthusiasm, criticism, humor };
    const glowResult = glowCalculator.calculateGlow(
      userSettings,
      videoContext,
      historyResult.rows
    );

    // Record participation
    await db.query(`
      INSERT INTO user_attitude_history (
        user_id, chatroom_id, creature_id,
        enthusiasm, criticism, humor,
        glow_earned, match_score,
        extremism_penalty, variety_bonus
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      req.session.userId,
      chatroomId,
      creatureId,
      enthusiasm,
      criticism,
      humor,
      glowResult.glow,
      glowResult.breakdown.matchBonus,
      glowResult.breakdown.extremismPenalty,
      glowResult.breakdown.varietyBonus
    ]);

    // Update user_rewards glow
    await db.query(`
      UPDATE user_rewards
      SET
        total_glow_earned = COALESCE(total_glow_earned, 0) + $1,
        chatroom_participations = COALESCE(chatroom_participations, 0) + 1,
        last_chatroom_at = NOW()
      WHERE user_id = $2 AND creature_id = $3
    `, [glowResult.glow, req.session.userId, creatureId]);

    // Increment chatroom participant count
    await chatroomScheduler.incrementParticipantCount(chatroomId);

    res.json({
      success: true,
      glowEarned: glowResult.glow,
      breakdown: glowResult.breakdown,
      message: `You earned ${glowResult.glow} glow!`
    });

  } catch (error) {
    console.error('Error recording participation:', error);
    res.status(500).json({ error: 'Failed to record participation' });
  }
});

/**
 * GET /api/chatroom/my-history
 * Get user's participation history
 */
router.get('/my-history', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await db.query(`
      SELECT
        uah.*,
        cs.video_title,
        cs.video_category,
        cs.video_subcategory,
        cs.video_thumbnail_url,
        c.creature_name
      FROM user_attitude_history uah
      JOIN chatroom_schedules cs ON uah.chatroom_id = cs.id
      LEFT JOIN creatures c ON uah.creature_id = c.id
      WHERE uah.user_id = $1
      ORDER BY uah.participated_at DESC
      LIMIT 50
    `, [req.session.userId]);

    // Calculate stats
    const totalGlow = result.rows.reduce((sum, r) => sum + r.glow_earned, 0);
    const avgGlow = result.rows.length > 0
      ? totalGlow / result.rows.length
      : 0;

    res.json({
      success: true,
      history: result.rows,
      stats: {
        totalParticipations: result.rows.length,
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
 * GET /api/chatroom/attitudes/presets
 * Get attitude presets
 */
router.get('/attitudes/presets', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM attitude_presets
      ORDER BY name
    `);

    res.json({
      success: true,
      presets: result.rows
    });

  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

/**
 * POST /api/chatroom/attitudes/save
 * Save custom attitude
 */
router.post('/attitudes/save', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { creatureId, attitudeName, enthusiasm, criticism, humor } = req.body;

  if (!creatureId || !attitudeName || !enthusiasm || !criticism || !humor) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (enthusiasm < 1 || enthusiasm > 10 ||
      criticism < 1 || criticism > 10 ||
      humor < 1 || humor > 10) {
    return res.status(400).json({ error: 'Invalid attitude values (must be 1-10)' });
  }

  try {
    // Verify creature ownership
    const creatureCheck = await db.query(`
      SELECT c.id FROM creatures c
      JOIN user_rewards ur ON c.id = ur.creature_id
      WHERE c.id = $1 AND ur.user_id = $2
    `, [creatureId, req.session.userId]);

    if (creatureCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Creature not found or not owned' });
    }

    // Upsert attitude
    await db.query(`
      INSERT INTO user_chat_attitudes (
        user_id, creature_id, attitude_name,
        enthusiasm, criticism, humor
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, creature_id, attitude_name)
      DO UPDATE SET
        enthusiasm = EXCLUDED.enthusiasm,
        criticism = EXCLUDED.criticism,
        humor = EXCLUDED.humor,
        updated_at = NOW()
    `, [req.session.userId, creatureId, attitudeName, enthusiasm, criticism, humor]);

    res.json({
      success: true,
      message: 'Attitude saved successfully'
    });

  } catch (error) {
    console.error('Error saving attitude:', error);
    res.status(500).json({ error: 'Failed to save attitude' });
  }
});

/**
 * GET /api/chatroom/attitudes/my
 * Get user's saved attitudes
 */
router.get('/attitudes/my', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { creatureId } = req.query;

  try {
    let query = `
      SELECT
        uca.*,
        c.creature_name
      FROM user_chat_attitudes uca
      JOIN creatures c ON uca.creature_id = c.id
      WHERE uca.user_id = $1
        AND uca.is_active = true
    `;
    const params = [req.session.userId];

    if (creatureId) {
      query += ` AND uca.creature_id = $2`;
      params.push(creatureId);
    }

    query += ` ORDER BY uca.updated_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      attitudes: result.rows
    });

  } catch (error) {
    console.error('Error fetching attitudes:', error);
    res.status(500).json({ error: 'Failed to fetch attitudes' });
  }
});

/**
 * POST /api/chatroom/calculate-glow
 * Calculate estimated glow (preview before participation)
 */
router.post('/calculate-glow', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { chatroomId, enthusiasm, criticism, humor } = req.body;

  if (!chatroomId || !enthusiasm || !criticism || !humor) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get chatroom details
    const chatroomResult = await db.query(`
      SELECT video_category, video_subcategory
      FROM chatroom_schedules
      WHERE id = $1
    `, [chatroomId]);

    if (chatroomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    const chatroom = chatroomResult.rows[0];

    // Get user's history for variety bonus
    const historyResult = await db.query(`
      SELECT enthusiasm, criticism, humor
      FROM user_attitude_history
      WHERE user_id = $1
      ORDER BY participated_at DESC
      LIMIT 5
    `, [req.session.userId]);

    // Calculate glow
    const videoContext = {
      category: chatroom.video_category,
      subcategory: chatroom.video_subcategory
    };

    const userSettings = { enthusiasm, criticism, humor };
    const glowResult = glowCalculator.calculateGlow(
      userSettings,
      videoContext,
      historyResult.rows
    );

    res.json({
      success: true,
      estimatedGlow: glowResult.glow,
      breakdown: glowResult.breakdown
    });

  } catch (error) {
    console.error('Error calculating glow:', error);
    res.status(500).json({ error: 'Failed to calculate glow' });
  }
});

module.exports = router;
