/**
 * Admin Console Server for Image Selection
 * Serves the admin interface and handles image selection API
 */

const express = require('express');
const session = require('express-session');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const Services = require('./services');
const dailyChatlingService = require('./services/daily-chatling-service');
const SocialInteractionService = require('./services/social-interaction-service');
const ChatroomService = require('./services/chatroom-service');
const passport = require('./config/passport');

const app = express();
const PORT = 3000;

// Database config
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

// Initialize services
const services = new Services(config);
const socialInteractionService = new SocialInteractionService(require('./scripts/db-config'));
const chatroomService = new ChatroomService(config);

// Session middleware (privacy-first - no long-term storage)
app.use(session({
  secret: process.env.SESSION_SECRET || 'chatlings-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport for OAuth
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'admin')));
app.use('/user', express.static(path.join(__dirname, 'user')));
app.use('/artwork', express.static(path.join(__dirname, 'artwork')));
app.use('/images', express.static(path.join(__dirname, 'artwork', 'linked')));
app.use('/thumbs', express.static(path.join(__dirname, 'artwork', 'thumbs')));

// Handle favicon requests (just return 204 No Content to avoid 404 errors)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Redirect /admin to admin index
app.get('/admin', (req, res) => res.redirect('/index.html'));

/**
 * Get next creature that needs image selection
 */
app.get('/api/next-creature', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Note: This endpoint is for the old image selection queue workflow
    // With the new schema, creatures are created by the watcher with images already assigned
    // This endpoint is kept for backward compatibility but may not have data

    res.json({
      done: true,
      message: 'Image selection queue is deprecated. Use Family Browser to view creatures.'
    });

  } catch (error) {
    console.error('Error fetching creature:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Save selected image for a creature
 * Moves selected image to linked/ folder and other 3 to discarded/ folder
 * If image already stored as BLOB, exports it to linked/ folder
 */
app.post('/api/select-image', async (req, res) => {
  const { creatureId, imageFilename } = req.body;

  if (!creatureId || !imageFilename) {
    return res.status(400).json({ error: 'Missing creatureId or imageFilename' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Create folders if they don't exist
    const linkedDir = path.join(__dirname, 'artwork', 'linked');
    const discardedDir = path.join(__dirname, 'artwork', 'discarded');
    if (!fs.existsSync(linkedDir)) fs.mkdirSync(linkedDir, { recursive: true });
    if (!fs.existsSync(discardedDir)) fs.mkdirSync(discardedDir, { recursive: true });

    const sourcePath = path.join(__dirname, 'artwork', imageFilename);
    const linkedPath = path.join(linkedDir, imageFilename);

    // Check if file exists in artwork folder or if it's already a BLOB
    if (fs.existsSync(sourcePath)) {
      // Move selected image to linked folder
      fs.renameSync(sourcePath, linkedPath);
      console.log(`Moved to linked: ${imageFilename}`);
    } else {
      // File doesn't exist - check if it's stored as BLOB and export it
      const blobResult = await client.query(
        'SELECT selected_image_data FROM creatures WHERE id = $1 AND selected_image_data IS NOT NULL',
        [creatureId]
      );

      if (blobResult.rows.length > 0 && blobResult.rows[0].selected_image_data) {
        // Export BLOB to linked folder
        fs.writeFileSync(linkedPath, blobResult.rows[0].selected_image_data);
        console.log(`Exported from BLOB to linked: ${imageFilename}`);
      }
    }

    // Update database - store only filename, clear BLOB
    await client.query(
      'UPDATE creatures SET selected_image = $1, selected_image_data = NULL WHERE id = $2',
      [imageFilename, creatureId]
    );

    // Get all 4 image filenames from queue
    const queueResult = await client.query(
      'SELECT image_1_path, image_2_path, image_3_path, image_4_path FROM image_selection_queue WHERE creature_id::uuid = $1',
      [creatureId]
    );

    if (queueResult.rows.length > 0) {
      const allImages = [
        queueResult.rows[0].image_1_path,
        queueResult.rows[0].image_2_path,
        queueResult.rows[0].image_3_path,
        queueResult.rows[0].image_4_path
      ].filter(Boolean);

      // Move the other 3 images to discarded folder
      for (const filename of allImages) {
        if (filename !== imageFilename) {
          const sourceFile = path.join(__dirname, 'artwork', filename);
          const discardedFile = path.join(discardedDir, filename);

          try {
            if (fs.existsSync(sourceFile)) {
              fs.renameSync(sourceFile, discardedFile);
              console.log(`Moved to discarded: ${filename}`);
            }
          } catch (err) {
            console.error(`Error moving ${filename} to discarded:`, err);
          }
        }
      }
    }

    // Remove from queue
    await client.query(
      'DELETE FROM image_selection_queue WHERE creature_id::uuid = $1',
      [creatureId]
    );

    console.log(`[SELECTED] Creature ${creatureId}: ${imageFilename} (moved to linked/, others to discarded/)`);

    res.json({ success: true });

  } catch (error) {
    console.error('Error saving selection:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Skip all images for a creature
 * Moves all 4 images to discarded/ folder and removes from queue without storing any image
 */
app.post('/api/skip-images', async (req, res) => {
  const { creatureId } = req.body;

  if (!creatureId) {
    return res.status(400).json({ error: 'Missing creatureId' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Create discarded folder if it doesn't exist
    const discardedDir = path.join(__dirname, 'artwork', 'discarded');
    if (!fs.existsSync(discardedDir)) fs.mkdirSync(discardedDir, { recursive: true });

    // Get all 4 image filenames from queue
    const queueResult = await client.query(
      'SELECT image_1_path, image_2_path, image_3_path, image_4_path FROM image_selection_queue WHERE creature_id::uuid = $1',
      [creatureId]
    );

    if (queueResult.rows.length > 0) {
      const imagePaths = [
        queueResult.rows[0].image_1_path,
        queueResult.rows[0].image_2_path,
        queueResult.rows[0].image_3_path,
        queueResult.rows[0].image_4_path
      ].filter(Boolean);

      // Move all 4 images to discarded folder
      for (const filename of imagePaths) {
        const sourceFile = path.join(__dirname, 'artwork', filename);
        const discardedFile = path.join(discardedDir, filename);

        try {
          if (fs.existsSync(sourceFile)) {
            fs.renameSync(sourceFile, discardedFile);
            console.log(`Moved to discarded: ${filename}`);
          }
        } catch (err) {
          console.error(`Error moving ${filename} to discarded:`, err);
        }
      }
    }

    // Remove from queue (no image data stored in creatures table)
    await client.query(
      'DELETE FROM image_selection_queue WHERE creature_id::uuid = $1',
      [creatureId]
    );

    console.log(`[SKIPPED] Creature ${creatureId}: All images moved to discarded/, no selection made`);

    res.json({ success: true });

  } catch (error) {
    console.error('Error skipping images:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Trash an image - unlinks from database and moves to trashed folder
 */
app.post('/api/trash-image', async (req, res) => {
  const { creatureId, imageFilename } = req.body;

  if (!creatureId || !imageFilename) {
    return res.status(400).json({ error: 'Missing creatureId or imageFilename' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Create trashed folder if it doesn't exist
    const trashedDir = path.join(__dirname, 'artwork', 'trashed');
    if (!fs.existsSync(trashedDir)) fs.mkdirSync(trashedDir, { recursive: true });

    const linkedPath = path.join(__dirname, 'artwork', 'linked', imageFilename);
    const trashedPath = path.join(trashedDir, imageFilename);

    // Move image from linked to trashed folder
    if (fs.existsSync(linkedPath)) {
      fs.renameSync(linkedPath, trashedPath);
      console.log(`Moved to trashed: ${imageFilename}`);
    } else {
      console.log(`Image not found in linked folder: ${imageFilename}`);
    }

    // Unlink image from database (set selected_image to NULL and soft delete)
    await client.query(
      'UPDATE creatures SET selected_image = NULL, is_active = false WHERE id = $1',
      [creatureId]
    );

    console.log(`[TRASHED] Creature ${creatureId}: ${imageFilename} moved to trashed/, creature marked as inactive`);

    res.json({ success: true });

  } catch (error) {
    console.error('Error trashing image:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get all dimension options for tabbed navigation
 */
app.get('/api/dimensions', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get all dimension tables
    const bodyTypes = await client.query('SELECT id, body_type_name FROM dim_body_type ORDER BY id');
    const activities = await client.query('SELECT id, activity_name FROM dim_social_activity ORDER BY id');
    const moods = await client.query('SELECT id, mood_name FROM dim_social_mood ORDER BY id');
    const colorSchemes = await client.query('SELECT id, scheme_name FROM dim_color_scheme ORDER BY id');
    const quirks = await client.query('SELECT id, quirk_name FROM dim_special_quirk ORDER BY id');
    const sizes = await client.query('SELECT id, size_name FROM dim_size_category ORDER BY id');

    res.json({
      bodyTypes: bodyTypes.rows,
      activities: activities.rows,
      moods: moods.rows,
      colorSchemes: colorSchemes.rows,
      quirks: quirks.rows,
      sizes: sizes.rows
    });

  } catch (error) {
    console.error('Error fetching dimensions:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get creatures by dimension filters
 */
app.get('/api/creatures-by-dimensions', async (req, res) => {
  const client = new Client(config);
  const { body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id, show_inactive } = req.query;

  try {
    await client.connect();

    // Build query based on provided filters
    const filters = [];
    const params = [];
    let paramIndex = 1;

    // Always filter by is_active unless show_inactive is true (for admin)
    if (show_inactive !== 'true') {
      filters.push('c.is_active = true');
    }

    if (body_type_id) {
      filters.push(`cp.body_type_id = $${paramIndex++}`);
      params.push(body_type_id);
    }
    if (activity_id) {
      filters.push(`cp.activity_id = $${paramIndex++}`);
      params.push(activity_id);
    }
    if (mood_id) {
      filters.push(`cp.mood_id = $${paramIndex++}`);
      params.push(mood_id);
    }
    if (color_scheme_id) {
      filters.push(`cp.color_scheme_id = $${paramIndex++}`);
      params.push(color_scheme_id);
    }
    if (quirk_id) {
      filters.push(`cp.quirk_id = $${paramIndex++}`);
      params.push(quirk_id);
    }
    if (size_id) {
      filters.push(`cp.size_id = $${paramIndex++}`);
      params.push(size_id);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.selected_image,
        c.rarity_tier,
        c.is_active,
        cp.id as prompt_id,
        bt.body_type_name,
        sa.activity_name,
        sm.mood_name,
        cs.scheme_name as color_scheme,
        sq.quirk_name,
        sc.size_name
      FROM creatures c
      JOIN creature_prompts cp ON c.prompt_id = cp.id
      JOIN dim_body_type bt ON cp.body_type_id = bt.id
      JOIN dim_social_activity sa ON cp.activity_id = sa.id
      JOIN dim_social_mood sm ON cp.mood_id = sm.id
      JOIN dim_color_scheme cs ON cp.color_scheme_id = cs.id
      JOIN dim_special_quirk sq ON cp.quirk_id = sq.id
      JOIN dim_size_category sc ON cp.size_id = sc.id
      ${whereClause}
      ORDER BY c.is_active DESC, c.id
      LIMIT 100
    `, params);

    res.json({ creatures: result.rows });

  } catch (error) {
    console.error('Error fetching creatures:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get overall progress statistics
 */
app.get('/api/stats', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get stats for creatures with images (new schema)
    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(selected_image) as completed
      FROM creatures
      WHERE is_active = true
    `);

    const stats = result.rows[0];

    res.json({
      total: parseInt(stats.total) || 0,
      completed: parseInt(stats.completed) || 0,
      remaining: parseInt(stats.total) - parseInt(stats.completed) || 0
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// ============================================================================
// USER HUB API ENDPOINTS (Privacy-First, Session-Based)
// ============================================================================

/**
 * Get current user info from session
 */
app.get('/api/user/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get current chatling
    const currentChatling = await dailyChatlingService.getCurrentChatling(req.session.userId);

    res.json({
      ...user,
      currentChatling
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get user stats (rewards claimed, achievements, etc.)
 */
app.get('/api/user/stats', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Get total rewards claimed
    const rewards = await client.query(
      'SELECT COUNT(DISTINCT creature_id) as count FROM user_rewards WHERE user_id = $1',
      [req.session.userId]
    );

    // Get total achievements
    const achievements = await client.query(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1',
      [req.session.userId]
    );

    // Get total points from achievements
    const points = await client.query(`
      SELECT COALESCE(SUM(a.points), 0) as total
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
    `, [req.session.userId]);

    // Get rarity breakdown
    const rarityBreakdown = await client.query(`
      SELECT
        c.rarity_tier,
        COUNT(*) as count
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      WHERE ur.user_id = $1
      GROUP BY c.rarity_tier
      ORDER BY
        CASE c.rarity_tier
          WHEN 'Legendary' THEN 1
          WHEN 'Epic' THEN 2
          WHEN 'Rare' THEN 3
          WHEN 'Uncommon' THEN 4
          WHEN 'Common' THEN 5
        END
    `, [req.session.userId]);

    // Get total available chatlings by rarity
    const rarityTotals = await client.query(`
      SELECT
        c.rarity_tier,
        COUNT(*) as total
      FROM creatures c
      WHERE c.selected_image IS NOT NULL
      GROUP BY c.rarity_tier
      ORDER BY
        CASE c.rarity_tier
          WHEN 'Legendary' THEN 1
          WHEN 'Epic' THEN 2
          WHEN 'Rare' THEN 3
          WHEN 'Uncommon' THEN 4
          WHEN 'Common' THEN 5
        END
    `);

    // Merge rarity breakdown with totals
    const rarityTotalsMap = {};
    rarityTotals.rows.forEach(row => {
      rarityTotalsMap[row.rarity_tier] = parseInt(row.total);
    });

    const rarityBreakdownWithTotals = rarityBreakdown.rows.map(row => ({
      rarity_tier: row.rarity_tier,
      count: parseInt(row.count),
      total: rarityTotalsMap[row.rarity_tier] || 0
    }));

    res.json({
      total_rewards: parseInt(rewards.rows[0].count) || 0,
      total_achievements: parseInt(achievements.rows[0].count) || 0,
      total_points: parseInt(points.rows[0].total) || 0,
      rarity_breakdown: rarityBreakdownWithTotals,
      rarity_totals: rarityTotalsMap
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get user's chatling collection (rewards claimed)
 */
app.get('/api/user/collection', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.selected_image,
        c.rarity_tier,
        c.vibe as species_name,
        bt.body_type_name,
        ur.claimed_at,
        ur.platform
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      WHERE ur.user_id = $1
        AND c.is_active = true
      ORDER BY ur.claimed_at DESC
    `, [req.session.userId]);

    // Calculate overall score for each creature
    const creaturesWithScores = await Promise.all(result.rows.map(async (creature) => {
      const traits = await client.query(`
        SELECT score FROM creature_social_traits WHERE creature_id = $1
      `, [creature.id]);

      let overallScore = 0;
      if (traits.rows.length > 0) {
        const totalScore = traits.rows.reduce((sum, trait) => sum + trait.score, 0);
        overallScore = Math.round(totalScore / traits.rows.length);
      }

      return {
        ...creature,
        overall_score: overallScore
      };
    }));

    res.json(creaturesWithScores);

  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get all body types
 */
app.get('/api/body-types', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT id, body_type_name as display_name
      FROM dim_body_type
      ORDER BY body_type_name
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching body types:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// Get frame configuration for a specific body type
app.get('/api/body-type-frame-config/:bodyTypeName', async (req, res) => {
  const client = new Client(config);
  const { bodyTypeName } = req.params;

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        image_width_percent,
        image_max_width_px,
        image_max_height_vh,
        image_min_width_px,
        image_margin_top_px
      FROM body_type_frame_config
      WHERE body_type_name = $1
    `, [bodyTypeName]);

    // If config exists, return it; otherwise return defaults
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({
        image_width_percent: 100,
        image_max_width_px: 600,
        image_max_height_vh: 70,
        image_min_width_px: 250,
        image_margin_top_px: 0
      });
    }

  } catch (error) {
    console.error('Error fetching frame config:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get achievements with user progress
 */
app.get('/api/user/achievements', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Get all achievements
    const achievements = await client.query(`
      SELECT * FROM achievements ORDER BY points ASC
    `);

    // Get user's unlocked achievements
    const userAchievements = await client.query(`
      SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = $1
    `, [req.session.userId]);

    // Get user's current reward count
    const rewardCount = await client.query(`
      SELECT COUNT(DISTINCT creature_id) as count FROM user_rewards WHERE user_id = $1
    `, [req.session.userId]);

    const count = parseInt(rewardCount.rows[0].count) || 0;

    // Build progress object
    const userProgress = achievements.rows.map(achievement => {
      const unlocked = userAchievements.rows.find(ua => ua.achievement_id === achievement.id);

      const progress = {
        achievement_id: achievement.id,
        points: achievement.points,
        unlocked: !!unlocked,
        unlocked_at: unlocked?.unlocked_at
      };

      // Add current count for reward-based achievements
      if (achievement.requirement_type === 'reward_count') {
        progress.current_count = count;
      }

      return progress;
    });

    res.json({
      achievements: achievements.rows,
      user_progress: userProgress
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get YouTube session status (session-based, no long-term storage)
 */
app.get('/api/user/youtube-status', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // In session-based approach, we only check if user has an active YouTube token in session
  res.json({
    connected: !!req.session.youtubeAccessToken,
    session_active: !!req.session.youtubeAccessToken,
    privacy_mode: 'session-only' // No long-term storage
  });
});

/**
 * Clear YouTube session (logout)
 */
app.post('/api/user/youtube-disconnect', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Clear YouTube access token from session (privacy-first)
  delete req.session.youtubeAccessToken;

  res.json({
    success: true,
    message: 'YouTube session cleared (no data was stored)'
  });
});

/**
 * YouTube OAuth - Initiate authorization (session-based with incremental auth)
 */
app.get('/api/auth/youtube/authorize', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is already authenticated with Google OAuth (from passport)
    // This enables incremental authorization for a smoother experience
    const isGoogleAuthenticated = !!req.session.passport;

    // Generate authorization URL
    // If user logged in with Google, only request YouTube scopes (incremental)
    // Otherwise, request both login + YouTube scopes
    const authUrl = services.youtubeLikes.getAuthorizationUrl(
      req.session.id,
      !isGoogleAuthenticated // includeLoginScopes only if not authenticated with Google
    );

    res.json({
      authUrl,
      incrementalAuth: isGoogleAuthenticated // Info for UI
    });

  } catch (error) {
    console.error('Error initiating YouTube auth:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * YouTube OAuth - Callback (session-based, privacy-first)
 */
app.get('/api/auth/youtube/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization failed - no code provided');
    }

    // Find session by ID (state parameter)
    // Note: This is a simplified approach - in production, use a session store
    const sessionId = state;

    // Exchange code for access token (no refresh token - session only)
    const accessToken = await services.youtubeLikes.getTokensFromCode(code);

    // Store access token in session (temporary, no database)
    req.session.youtubeAccessToken = accessToken;
    req.session.youtubeConnectedAt = new Date();

    // Process liked videos and claim rewards immediately
    if (req.session.userId) {
      const newRewards = await services.youtubeLikes.processLikesAndClaimRewards(
        req.session.userId,
        accessToken
      );

      console.log(`User ${req.session.userId} claimed ${newRewards.length} new rewards`);

      // Clear token from session after processing (extra privacy)
      // Token is only needed once per session
      delete req.session.youtubeAccessToken;

      // Redirect back with results
      res.redirect(`/user/integrations.html?rewards_claimed=${newRewards.length}`);
    } else {
      res.redirect('/user/integrations.html?error=no_session');
    }

  } catch (error) {
    console.error('Error in YouTube callback:', error);
    res.status(500).send(`Error processing YouTube likes: ${error.message}`);
  }
});

/**
 * Get unread notifications
 */
app.get('/api/user/notifications', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.session.userId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Mark notifications as read
 */
app.post('/api/user/notifications/mark-read', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    await client.query(`
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
    `, [req.session.userId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// ============================================================================
// OAUTH AUTHENTICATION (Google, GitHub, etc.)
// ============================================================================

/**
 * Initiate Google OAuth flow
 */
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * Google OAuth callback
 * On success, redirects to user hub
 * On failure, redirects to login page
 */
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/user/login.html' }),
  async (req, res) => {
    // User authenticated successfully, userId is in session
    req.session.userId = req.user;

    // Trigger daily chatling visit (if needed)
    try {
      const needsVisit = await dailyChatlingService.needsDailyVisit(req.user);
      if (needsVisit) {
        await dailyChatlingService.assignDailyChatling(req.user);
      }
    } catch (visitError) {
      console.error('Error assigning daily chatling:', visitError);
      // Don't fail OAuth if daily visit fails
    }

    res.redirect('/user/index.html');
  }
);

// ============================================================================
// TEST LOGIN ENDPOINT - DISABLED IN PRODUCTION
// OAuth-only authentication is now used
// ============================================================================

// Commented out - use OAuth authentication instead
/*
app.post('/api/auth/login', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Find or create user
    let user = await client.query(
      'SELECT id, username, email FROM users WHERE username = $1',
      [username]
    );

    if (user.rows.length === 0) {
      // Create new user
      user = await client.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email',
        [username, `${username}@example.com`]
      );
    }

    // Set session
    req.session.userId = user.rows[0].id;
    req.session.username = user.rows[0].username;

    // Trigger daily chatling visit (if needed)
    let dailyVisit = null;
    try {
      const needsVisit = await dailyChatlingService.needsDailyVisit(user.rows[0].id);
      if (needsVisit) {
        dailyVisit = await dailyChatlingService.assignDailyChatling(user.rows[0].id);
      }
    } catch (visitError) {
      console.error('Error assigning daily chatling:', visitError);
      // Don't fail login if daily visit fails
    }

    res.json({
      success: true,
      user: user.rows[0],
      dailyVisit
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});
*/

/**
 * Logout
 */
/**
 * Get user's current chatling
 */
app.get('/api/user/current-chatling', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const currentChatling = await dailyChatlingService.getCurrentChatling(req.session.userId);

    if (!currentChatling) {
      return res.json({ currentChatling: null });
    }

    res.json({ currentChatling });

  } catch (error) {
    console.error('Error fetching current chatling:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Switch current chatling to another from user's collection
 */
app.post('/api/user/switch-chatling', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { creatureId } = req.body;

  if (!creatureId) {
    return res.status(400).json({ error: 'creatureId required' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Verify creature is in user's collection
    const collectionCheck = await client.query(
      `SELECT creature_id FROM user_rewards WHERE user_id = $1 AND creature_id = $2`,
      [req.session.userId, creatureId]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Creature not in your collection' });
    }

    // Update current creature
    await client.query(
      `UPDATE users SET current_creature_id = $1 WHERE id = $2`,
      [creatureId, req.session.userId]
    );

    // Get the new current chatling details
    const currentChatling = await dailyChatlingService.getCurrentChatling(req.session.userId);

    res.json({
      success: true,
      currentChatling
    });

  } catch (error) {
    console.error('Error switching chatling:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get user's team (all 5 members with details)
 */
app.get('/api/user/team', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Get all team member IDs
    const userResult = await client.query(
      `SELECT current_creature_id, team_member_2_id, team_member_3_id,
              team_member_4_id, team_member_5_id, email
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const team = [];

    // Team roles
    const roles = [
      { slot: 1, title: 'Prime Chatling', column: 'current_creature_id' },
      { slot: 2, title: 'Viral Catalyst', column: 'team_member_2_id' },
      { slot: 3, title: 'Community Builder', column: 'team_member_3_id' },
      { slot: 4, title: 'Engagement Maven', column: 'team_member_4_id' },
      { slot: 5, title: 'Community Ambassador', column: 'team_member_5_id' }
    ];

    // Fetch details for each team member
    for (const role of roles) {
      const creatureId = user[role.column];

      if (creatureId) {
        const creatureResult = await client.query(`
          SELECT
            c.id,
            c.creature_name,
            c.selected_image,
            c.rarity_tier,
            cp.body_type_id,
            bt.body_type_name
          FROM creatures c
          LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
          LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
          WHERE c.id = $1
        `, [creatureId]);

        if (creatureResult.rows.length > 0) {
          const creature = creatureResult.rows[0];

          // Get traits
          const traitsResult = await client.query(`
            SELECT
              cst.score,
              dstc.category_name
            FROM creature_social_traits cst
            JOIN dim_social_trait_category dstc ON cst.trait_category_id = dstc.id
            WHERE cst.creature_id = $1
          `, [creatureId]);

          team.push({
            slot: role.slot,
            role: role.title,
            creature: {
              id: creature.id,
              name: creature.creature_name,
              image: creature.selected_image,
              rarity: creature.rarity_tier,
              bodyType: creature.body_type_name
            },
            traits: traitsResult.rows
          });
        } else {
          team.push({ slot: role.slot, role: role.title, creature: null });
        }
      } else {
        team.push({ slot: role.slot, role: role.title, creature: null });
      }
    }

    res.json({
      team,
      userEmail: user.email
    });

  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Assign a creature to a team slot
 */
app.post('/api/user/team/assign', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { creatureId, slot } = req.body;

  if (!creatureId || !slot) {
    return res.status(400).json({ error: 'creatureId and slot required' });
  }

  if (slot < 1 || slot > 5) {
    return res.status(400).json({ error: 'slot must be between 1 and 5' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Verify creature is in user's collection
    const collectionCheck = await client.query(
      `SELECT creature_id FROM user_rewards WHERE user_id = $1 AND creature_id = $2`,
      [req.session.userId, creatureId]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Creature not in your collection' });
    }

    // Map slot number to column name
    const columnMap = {
      1: 'current_creature_id',
      2: 'team_member_2_id',
      3: 'team_member_3_id',
      4: 'team_member_4_id',
      5: 'team_member_5_id'
    };

    // Get current team state
    const currentTeam = await client.query(
      `SELECT current_creature_id, team_member_2_id, team_member_3_id,
              team_member_4_id, team_member_5_id
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (currentTeam.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const teamState = currentTeam.rows[0];
    const targetColumn = columnMap[slot];
    const creatureInTargetSlot = teamState[targetColumn];

    // Find if the creature being assigned is currently in another slot
    let sourceSlot = null;
    for (const [slotNum, column] of Object.entries(columnMap)) {
      if (teamState[column] === creatureId) {
        sourceSlot = parseInt(slotNum);
        break;
      }
    }

    // Implement swap logic
    if (sourceSlot !== null && sourceSlot !== slot) {
      // Creature is moving from sourceSlot to slot
      // Swap: put creature from target slot into source slot
      const sourceColumn = columnMap[sourceSlot];

      await client.query(
        `UPDATE users
         SET ${sourceColumn} = $1, ${targetColumn} = $2
         WHERE id = $3`,
        [creatureInTargetSlot, creatureId, req.session.userId]
      );
    } else {
      // Creature is not in any slot yet, just assign it
      await client.query(
        `UPDATE users SET ${targetColumn} = $1 WHERE id = $2`,
        [creatureId, req.session.userId]
      );
    }

    // Validate that Community Ambassador (slot 5) is always filled
    // Also validate no creature appears in multiple slots
    const updatedTeam = await client.query(
      `SELECT current_creature_id, team_member_2_id, team_member_3_id,
              team_member_4_id, team_member_5_id
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    const finalTeamState = updatedTeam.rows[0];

    // Check Community Ambassador is filled
    if (!finalTeamState.team_member_5_id) {
      return res.status(400).json({
        error: 'Community Ambassador role must always be filled. Please assign a creature to this role.'
      });
    }

    // Check for duplicate assignments
    const assignedCreatures = Object.values(finalTeamState).filter(id => id !== null);
    const uniqueCreatures = new Set(assignedCreatures);
    if (assignedCreatures.length !== uniqueCreatures.size) {
      return res.status(500).json({
        error: 'System error: A creature cannot be in multiple roles. Please refresh and try again.'
      });
    }

    res.json({ success: true, slot, creatureId, swapped: sourceSlot !== null && sourceSlot !== slot });

  } catch (error) {
    console.error('Error assigning to team:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Trigger daily chatling visit
 * This can be called manually or automatically when user logs in
 */
app.post('/api/user/daily-visit', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Check if user needs a daily visit
    const needsVisit = await dailyChatlingService.needsDailyVisit(req.session.userId);

    if (!needsVisit) {
      const currentChatling = await dailyChatlingService.getCurrentChatling(req.session.userId);
      return res.json({
        alreadyVisitedToday: true,
        currentChatling
      });
    }

    // Assign daily chatling
    const visit = await dailyChatlingService.assignDailyChatling(req.session.userId);

    res.json({
      success: true,
      visit
    });

  } catch (error) {
    console.error('Error assigning daily chatling:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get daily visit history
 */
app.get('/api/user/visit-history', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await dailyChatlingService.getVisitHistory(req.session.userId, limit);

    res.json({ history });

  } catch (error) {
    console.error('Error fetching visit history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // Clear Passport session
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  });
});

/**
 * Trigger social interaction between user's current chatling and another
 */
app.post('/api/user/social-interaction', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { chatlingId } = req.body;

  if (!chatlingId) {
    return res.status(400).json({ error: 'chatlingId required' });
  }

  try {
    const result = await socialInteractionService.triggerInteraction(
      req.session.userId,
      chatlingId
    );

    res.json(result);

  } catch (error) {
    console.error('Error in social interaction:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's friendship history
 */
app.get('/api/user/friendships', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        cf.id,
        cf.became_friends,
        cf.interaction_date,
        c1.creature_name as chatling_1_name,
        c1.selected_image as chatling_1_image,
        c2.creature_name as chatling_2_name,
        c2.selected_image as chatling_2_image,
        cf.interaction_story,
        cf.combined_score,
        cf.threshold_needed
      FROM creature_friendships cf
      JOIN creatures c1 ON cf.chatling_1_id = c1.id
      JOIN creatures c2 ON cf.chatling_2_id = c2.id
      WHERE cf.user_id = $1
      ORDER BY cf.interaction_date DESC
      LIMIT 50
    `, [req.session.userId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching friendships:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get creature's social trait scores
 */
app.get('/api/creature/:creatureId/traits', async (req, res) => {
  const { creatureId } = req.params;

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        cst.score,
        dstc.id as category_id,
        dstc.category_name,
        dstc.description,
        dstc.icon
      FROM creature_social_traits cst
      JOIN dim_social_trait_category dstc ON cst.trait_category_id = dstc.id
      WHERE cst.creature_id = $1
      ORDER BY dstc.id
    `, [creatureId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching creature traits:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get random creature with traits and color scheme
 */
app.get('/api/random-creature-with-traits', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get random creature with image
    const creature = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.selected_image,
        c.rarity_tier,
        cp.color_scheme_id,
        cp.body_type_id,
        bt.body_type_name
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      WHERE c.selected_image IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (creature.rows.length === 0) {
      return res.status(404).json({ error: 'No creatures found' });
    }

    const creatureData = creature.rows[0];

    // Get color scheme primary color
    let primaryColor = '#667eea'; // Default
    if (creatureData.color_scheme_id) {
      const colorScheme = await client.query(`
        SELECT scheme_name FROM dim_color_scheme WHERE id = $1
      `, [creatureData.color_scheme_id]);

      if (colorScheme.rows.length > 0) {
        // Extract color from scheme name or use predefined mapping
        primaryColor = getColorFromScheme(colorScheme.rows[0].scheme_name);
      }
    }

    // Get traits
    const traits = await client.query(`
      SELECT
        cst.score,
        dstc.id as category_id,
        dstc.category_name,
        dstc.description,
        dstc.icon
      FROM creature_social_traits cst
      JOIN dim_social_trait_category dstc ON cst.trait_category_id = dstc.id
      WHERE cst.creature_id = $1
      ORDER BY dstc.id
    `, [creatureData.id]);

    // Calculate overall score (average of all traits)
    let overallScore = 0;
    if (traits.rows.length > 0) {
      const totalScore = traits.rows.reduce((sum, trait) => sum + trait.score, 0);
      overallScore = Math.round(totalScore / traits.rows.length);
    }

    res.json({
      id: creatureData.id,
      creature_name: creatureData.creature_name,
      selected_image: creatureData.selected_image,
      rarity_tier: creatureData.rarity_tier,
      body_type_name: creatureData.body_type_name,
      primary_color: primaryColor,
      overall_score: overallScore,
      traits: traits.rows
    });

  } catch (error) {
    console.error('Error fetching random creature:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get specific creature with traits and details
 */
app.get('/api/creature/:creatureId/details', async (req, res) => {
  const { creatureId } = req.params;
  const client = new Client(config);

  try {
    await client.connect();

    // Get creature details
    const creature = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.selected_image,
        c.rarity_tier,
        cp.color_scheme_id,
        cp.body_type_id,
        bt.body_type_name
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      WHERE c.id = $1
    `, [creatureId]);

    if (creature.rows.length === 0) {
      return res.status(404).json({ error: 'Creature not found' });
    }

    const creatureData = creature.rows[0];

    // Get color scheme primary color
    let primaryColor = '#667eea'; // Default
    if (creatureData.color_scheme_id) {
      const colorScheme = await client.query(`
        SELECT scheme_name FROM dim_color_scheme WHERE id = $1
      `, [creatureData.color_scheme_id]);

      if (colorScheme.rows.length > 0) {
        primaryColor = getColorFromScheme(colorScheme.rows[0].scheme_name);
      }
    }

    // Get traits
    const traits = await client.query(`
      SELECT
        cst.score,
        dstc.id as category_id,
        dstc.category_name,
        dstc.description,
        dstc.icon
      FROM creature_social_traits cst
      JOIN dim_social_trait_category dstc ON cst.trait_category_id = dstc.id
      WHERE cst.creature_id = $1
      ORDER BY dstc.id
    `, [creatureData.id]);

    // Calculate overall score (average of all traits)
    let overallScore = 0;
    if (traits.rows.length > 0) {
      const totalScore = traits.rows.reduce((sum, trait) => sum + trait.score, 0);
      overallScore = Math.round(totalScore / traits.rows.length);
    }

    res.json({
      id: creatureData.id,
      creature_name: creatureData.creature_name,
      selected_image: creatureData.selected_image,
      rarity_tier: creatureData.rarity_tier,
      body_type_name: creatureData.body_type_name,
      primary_color: primaryColor,
      overall_score: overallScore,
      traits: traits.rows
    });

  } catch (error) {
    console.error('Error fetching creature details:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Helper: Map color scheme name to hex color
 */
function getColorFromScheme(schemeName) {
  const colorMap = {
    'Pastel Dreams': '#FFB3D9',
    'Bright & Poppy': '#FF6B9D',
    'Cool & Calm': '#A8D8EA',
    'Warm & Friendly': '#FFB84D',
    'Cozy Neutrals': '#C4B5A0',
    'Earthy Tones': '#A67C52',
    'Mint Fresh': '#9BDEAC',
    'Lavender Haze': '#C4A4D8',
    'Peachy Keen': '#FFB088',
    'Ocean Breeze': '#5DADE2',
    'Metallic Silver': '#A8B8C8',
    'Neon Tech': '#00FFFF',
    'Dark Gunmetal': '#5C636A',
    'Chrome Blue': '#4A90E2',
    'Decay Green': '#7A9B4D',
    'Rotting Purple': '#8B6F8B',
    'Zombie Gray': '#8A8A8A',
    'Flesh Tone': '#D4A5A5',
    'Deep Black': '#1C1C1C',
    'Blood Red': '#8B0000',
    'Victorian Purple': '#663399',
    'Ghostly White': '#F0F0F0'
  };

  return colorMap[schemeName] || '#667eea';
}

// ============================================================================
// Chatroom API Endpoints
// ============================================================================

/**
 * Get user's conversations (paginated)
 */
app.get('/api/chatroom/conversations', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const conversations = await chatroomService.getConversations(
      req.session.userId,
      limit,
      offset
    );

    res.json(conversations);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's runaway chatlings
 */
app.get('/api/chatroom/runaways', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const runaways = await chatroomService.getRunaways(req.session.userId);
    res.json(runaways);

  } catch (error) {
    console.error('Error fetching runaways:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Attempt to recover a runaway chatling
 */
app.post('/api/chatroom/recover/:creatureId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { creatureId } = req.params;

  try {
    const result = await chatroomService.recoverRunaway(
      req.session.userId,
      creatureId
    );

    res.json(result);

  } catch (error) {
    console.error('Error recovering runaway:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark conversation as read
 */
app.post('/api/chatroom/mark-read/:conversationId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { conversationId } = req.params;

  try {
    await chatroomService.markConversationRead(conversationId, req.session.userId);
    res.json({ success: true });

  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Force start a conversation (bypasses likelihood check - for testing)
 */
app.post('/api/chat/force-start', async (req, res) => {
  // For demo/testing: Use test user if not authenticated
  let userId = req.session.userId;

  if (!userId) {
    const { Client } = require('pg');
    const client = new Client(config);
    try {
      await client.connect();
      const testUser = await client.query(
        `SELECT id FROM users WHERE email = 'demo@chatroom.test' LIMIT 1`
      );
      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
      } else {
        return res.status(401).json({ error: 'Not authenticated and no demo user found' });
      }
    } finally {
      await client.end();
    }
  }

  try {
    // Delete any existing active conversation first
    const db = require('./services/db');
    await db.query('DELETE FROM active_conversations WHERE user_id = $1', [userId]);

    // Force start a new conversation
    const conversationEngine = require('./services/conversation-engine');
    const result = await conversationEngine.startConversation(userId);

    if (!result) {
      return res.json({
        success: false,
        message: 'Could not start conversation (need at least 2 chatlings and active topics)'
      });
    }

    res.json({
      success: true,
      message: 'Conversation started!',
      firstLine: result
    });

  } catch (error) {
    console.error('Error forcing conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manually generate conversation (for testing)
 */
app.post('/api/chatroom/generate', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const conversationId = await chatroomService.generateConversation(req.session.userId);

    if (!conversationId) {
      return res.json({
        success: false,
        message: 'Could not generate conversation (need at least 2 chatlings)'
      });
    }

    res.json({
      success: true,
      conversationId,
      message: 'Conversation generated successfully!'
    });

  } catch (error) {
    console.error('Error generating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Procedural Chat Engine API (Client Polling)
// ============================================================================

const conversationEngine = require('./services/conversation-engine');

/**
 * Client polls this endpoint for next chat line
 * Returns null if no conversation active/starting
 */
app.get('/api/chat/next-line', async (req, res) => {
  // For demo/testing: Use test user if not authenticated
  let userId = req.session.userId;

  if (!userId) {
    // Get or create test user for demo
    const { Client } = require('pg');
    const client = new Client(config);
    try {
      await client.connect();
      const testUser = await client.query(
        `SELECT id FROM users WHERE email = 'demo@chatroom.test' LIMIT 1`
      );

      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
      } else {
        return res.status(401).json({ error: 'Not authenticated and no demo user found' });
      }
    } finally {
      await client.end();
    }
  }

  try {
    const nextLine = await conversationEngine.getNextLine(userId);
    res.json(nextLine || { continues: false, noConversation: true });

  } catch (error) {
    console.error('Error getting next chat line:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's mood dashboard
 */
app.get('/api/chat/moods', async (req, res) => {
  // For demo/testing: Use test user if not authenticated
  let userId = req.session.userId;

  const client = new Client(config);

  try {
    await client.connect();

    if (!userId) {
      const testUser = await client.query(
        `SELECT id FROM users WHERE email = 'demo@chatroom.test' LIMIT 1`
      );
      if (testUser.rows.length > 0) {
        userId = testUser.rows[0].id;
      } else {
        return res.status(401).json({ error: 'Not authenticated and no demo user found' });
      }
    }

    const moods = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.selected_image,
        ur.mood_status,
        ur.unhappy_count
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      WHERE ur.user_id = $1
      ORDER BY c.creature_name
    `, [userId]);

    res.json({ moods: moods.rows });

  } catch (error) {
    console.error('Error fetching moods:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// ============================================================================
// Admin Conversation Review API Endpoints
// ============================================================================

/**
 * Get conversations from audit log for admin review
 */
app.get('/api/admin/conversations', async (req, res) => {
  const filter = req.query.filter || 'all';
  const limit = parseInt(req.query.limit) || 100;

  const client = new Client(config);

  try {
    await client.connect();

    // Build query based on filter
    let query = 'SELECT * FROM conversation_audit_log';
    const params = [];

    if (filter === 'flagged') {
      query += ' WHERE flagged_nonsense = true';
    } else if (filter === 'recent') {
      query += ' WHERE created_at > NOW() - INTERVAL \'24 hours\'';
    }

    query += ' ORDER BY created_at DESC LIMIT $1';
    params.push(limit);

    const conversations = await client.query(query, params);

    // Get statistics
    const stats = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE flagged_nonsense = true) as flagged,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last24h,
        AVG(jsonb_array_length(messages)) as avg_length
      FROM conversation_audit_log
    `);

    res.json({
      conversations: conversations.rows,
      stats: {
        total: parseInt(stats.rows[0]?.total || 0),
        flagged: parseInt(stats.rows[0]?.flagged || 0),
        last24h: parseInt(stats.rows[0]?.last24h || 0),
        avgLength: parseFloat(stats.rows[0]?.avg_length || 0).toFixed(1)
      }
    });

  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Flag/unflag a conversation as nonsense
 */
app.post('/api/admin/conversations/:id/flag', async (req, res) => {
  const { id } = req.params;
  const { flagged } = req.body;

  const client = new Client(config);

  try {
    await client.connect();

    await client.query(
      'UPDATE conversation_audit_log SET flagged_nonsense = $1 WHERE id = $2',
      [flagged, id]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error flagging conversation:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Save admin notes for a conversation
 */
app.post('/api/admin/conversations/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const client = new Client(config);

  try {
    await client.connect();

    await client.query(
      'UPDATE conversation_audit_log SET admin_notes = $1 WHERE id = $2',
      [notes, id]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('Chatlings Server');
  console.log('='.repeat(80));
  console.log(`\nAdmin Console: http://localhost:${PORT}`);
  console.log(`User Hub: http://localhost:${PORT}/user`);
  console.log('\n');

  // Start background services
  services.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  services.stop();
  process.exit(0);
});
