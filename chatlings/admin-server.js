/**
 * Admin Console Server for Image Selection
 * Serves the admin interface and handles image selection API
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const session = require('express-session');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const Services = require('./services');
const dailyChatlingService = require('./services/daily-chatling-service');
const SocialInteractionService = require('./services/social-interaction-service');
const ChatroomService = require('./services/chatroom-service');
const YouTubeMetadataService = require('./services/youtube-metadata-service');
const passport = require('./config/passport');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage configuration
const ARTWORK_STORAGE_MODE = process.env.ARTWORK_STORAGE_MODE || 'azure';
const AZURE_ARTWORK_BASE_URL = process.env.AZURE_ARTWORK_BASE_URL || 'https://chatlingsdevlyg7hq.blob.core.windows.net/artwork';

// Database config
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

// Initialize services
const services = new Services(config);
const socialInteractionService = new SocialInteractionService(require('./scripts/db-config'));
const chatroomService = new ChatroomService(config);
const youtubeMetadataService = new YouTubeMetadataService(
  require('./scripts/db-config'),
  process.env.YOUTUBE_API_KEY
);

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push VAPID keys configured');
} else {
  console.warn('⚠️  Web Push VAPID keys not configured. Push notifications will not work.');
}

/**
 * Helper function to send push notifications to a user
 * @param {string} userId - The user's UUID
 * @param {string} notificationType - Type of notification from database (e.g., 'achievement_unlocked', 'reward_claimed', etc.)
 * @param {object} payload - Notification payload { title, body, icon?, badge?, data? }
 */
const sendPushNotification = async (userId, notificationType, payload) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Map database notification types to preference columns
    const typeMapping = {
      'reward_claimed': 'daily_box',  // Daily mystery box rewards
      'new_chatling_found': 'new_chatling',  // Ambassador found new chatling (not repeat)
      'achievement_unlocked': 'achievement',
      'new_conversation': 'chatroom',
      'chatling_runaway': 'chatroom',
      'chatling_recovered': 'chatroom',
      'youtube_reward': 'youtube_reminder'
    };

    const preferenceColumn = typeMapping[notificationType];

    if (!preferenceColumn) {
      console.log(`Unknown notification type: ${notificationType}`);
      return;
    }

    // Check if user has push notifications enabled for this type
    const prefsResult = await client.query(`
      SELECT enabled, ${preferenceColumn}
      FROM push_notification_preferences
      WHERE user_id = $1
    `, [userId]);

    if (prefsResult.rows.length === 0 || !prefsResult.rows[0].enabled || !prefsResult.rows[0][preferenceColumn]) {
      console.log(`Push notification skipped for user ${userId}: disabled or type ${preferenceColumn} disabled`);
      return;
    }

    // Get all push subscriptions for this user
    const subsResult = await client.query(`
      SELECT endpoint, p256dh_key, auth_key
      FROM push_subscriptions
      WHERE user_id = $1
    `, [userId]);

    if (subsResult.rows.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send to all subscriptions
    const promises = subsResult.rows.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        console.log(`✅ Push sent to ${userId} (${notificationType})`);
      } catch (error) {
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing invalid subscription for user ${userId}`);
          await client.query(`
            DELETE FROM push_subscriptions
            WHERE user_id = $1 AND endpoint = $2
          `, [userId, sub.endpoint]);
        } else {
          console.error(`Error sending push to ${userId}:`, error);
        }
      }
    });

    await Promise.all(promises);

  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  } finally {
    await client.end();
  }
};

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

// Import admin authentication middleware
const { requireAuth, requireAdmin, requireWhitelistedIP } = require('./middleware/admin-auth');

// Middleware
app.use(express.json());

// Public routes (no authentication required)
app.use('/user', express.static(path.join(__dirname, 'user')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Protected routes (require authentication and admin privileges)
// Apply IP whitelist if configured in .env
app.use('/admin', requireWhitelistedIP);
app.use('/admin', requireAuth);
app.use('/admin', requireAdmin(config));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Image and animation routes (require authentication for security)
app.use('/artwork', requireAuth, express.static(path.join(__dirname, 'artwork')));
app.use('/images', requireAuth, express.static(path.join(__dirname, 'artwork', 'linked')));
app.use('/thumbs', requireAuth, express.static(path.join(__dirname, 'artwork', 'thumbs')));
app.use('/animations', requireAuth, express.static(path.join(__dirname, 'animations')));

// Handle favicon requests (just return 204 No Content to avoid 404 errors)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Debug endpoint - check your session and admin status
app.get('/debug/session', async (req, res) => {
  const session = {
    hasSession: !!req.session,
    userId: req.session?.userId || null,
    user: req.session?.user || null
  };

  if (session.userId) {
    const client = new Client(config);
    try {
      await client.connect();
      const result = await client.query('SELECT id, email, is_admin FROM users WHERE id = $1', [session.userId]);
      session.userFromDB = result.rows[0] || 'Not found';
    } catch (error) {
      session.dbError = error.message;
    } finally {
      await client.end();
    }
  }

  res.json(session);
});

// Root path - redirect to user hub (not admin!)
app.get('/', (req, res) => {
  // If user is logged in, send to user hub, otherwise to login
  if (req.session && req.session.userId) {
    res.redirect('/user/index.html');
  } else {
    res.redirect('/user/login.html');
  }
});

// ============================================================================
// ADMIN API PROTECTION
// All admin API endpoints require authentication + admin privileges
// ============================================================================

// Admin API protection middleware - applies to all /api/admin/* routes
app.use('/api/admin/*', requireAuth);
app.use('/api/admin/*', requireAdmin(config));

// Admin-only operations (not under /api/admin path but still admin-only)
const adminOnlyEndpoints = [
  '/api/trash-image',
  '/api/creatures',
  '/api/creatures-by-dimensions',
  '/api/animations/upload',
  '/api/animation-types'
];

adminOnlyEndpoints.forEach(endpoint => {
  app.use(endpoint, requireAuth);
  app.use(endpoint, requireAdmin(config));
});

// Serve PWA files from root
app.get('/service-worker.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'service-worker.js'));
});
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

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
/**
 * Get storage configuration
 */
app.get('/api/config/storage', (req, res) => {
  res.json({
    storageMode: ARTWORK_STORAGE_MODE,
    azureBaseUrl: AZURE_ARTWORK_BASE_URL,
    useAzure: ARTWORK_STORAGE_MODE === 'azure'
  });
});

app.get('/api/dimensions', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get all dimension tables with frame config
    const bodyTypes = await client.query(`
      SELECT
        bt.id,
        bt.body_type_name,
        bt.frame_filename,
        fc.frame_width_percent,
        fc.frame_height_percent
      FROM dim_body_type bt
      LEFT JOIN body_type_frame_config fc ON bt.body_type_name = fc.body_type_name
      ORDER BY bt.id
    `);
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
// Get all creatures (for admin dropdowns, etc.)
app.get('/api/creatures', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.rarity_tier,
        c.selected_image,
        c.is_active,
        cp.body_type_id
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      WHERE c.is_active = true
      ORDER BY c.creature_name ASC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching creatures:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Update creature name (unique within body type)
 */
app.put('/api/creatures/:id/name', async (req, res) => {
  const { id } = req.params;
  const { name, bodyTypeId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Check if name is unique within body type
    const checkResult = await client.query(`
      SELECT c.id
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      WHERE LOWER(c.creature_name) = LOWER($1)
        AND cp.body_type_id = $2
        AND c.id != $3
      LIMIT 1
    `, [name.trim(), bodyTypeId, id]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'A creature with this name already exists in this body type' });
    }

    // Update the name
    await client.query(`
      UPDATE creatures
      SET creature_name = $1
      WHERE id = $2
    `, [name.trim(), id]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error updating creature name:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Update creature rarity and recalculate trait score
 */
app.put('/api/creatures/:id/rarity', async (req, res) => {
  const { id } = req.params;
  const { rarity } = req.body;

  const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  if (!validRarities.includes(rarity)) {
    return res.status(400).json({ error: 'Invalid rarity tier' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Rarity score multipliers
    const rarityScores = {
      'Common': 1.0,
      'Uncommon': 1.2,
      'Rare': 1.5,
      'Epic': 2.0,
      'Legendary': 3.0,
      'Mythic': 5.0
    };

    const rarityMultiplier = rarityScores[rarity];

    // Update rarity and recalculate trait score
    // Trait score = base_trait_score * rarity_multiplier
    const result = await client.query(`
      UPDATE creatures
      SET
        rarity_tier = $1,
        trait_score = COALESCE(base_trait_score, 50) * $2
      WHERE id = $3
      RETURNING trait_score
    `, [rarity, rarityMultiplier, id]);

    const newTraitScore = result.rows[0]?.trait_score || 0;

    res.json({ success: true, newTraitScore: Math.round(newTraitScore) });

  } catch (error) {
    console.error('Error updating creature rarity:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

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
      `SELECT u.id, u.username, u.email, u.created_at, oa.provider_email
       FROM users u
       LEFT JOIN oauth_accounts oa ON u.id = oa.user_id
       WHERE u.id = $1
       ORDER BY oa.last_used_at DESC NULLS LAST
       LIMIT 1`,
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
        cp.body_type_id,
        ur.claimed_at,
        ur.platform,
        ur.found_count
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      WHERE ur.user_id = $1
        AND c.is_active = true
      ORDER BY ur.claimed_at DESC
    `, [req.session.userId]);

    // Get trait scores for each creature
    const creaturesWithScores = await Promise.all(result.rows.map(async (creature) => {
      const traits = await client.query(`
        SELECT stc.category_name, st.score
        FROM creature_social_traits st
        JOIN dim_social_trait_category stc ON st.trait_category_id = stc.id
        WHERE st.creature_id = $1
      `, [creature.id]);

      // Map 8 social traits to 4 display traits:
      // Ability = average of Curiosity + Creativity
      // Strength = average of Confidence + Energy Level
      // Affection = average of Friendliness + Empathy
      // Uniqueness = average of Playfulness + Humor

      const traitMap = {};
      traits.rows.forEach(trait => {
        traitMap[trait.category_name] = trait.score;
      });

      const ability_score = Math.round(((traitMap['Curiosity'] || 0) + (traitMap['Creativity'] || 0)) / 2);
      const strength_score = Math.round(((traitMap['Confidence'] || 0) + (traitMap['Energy Level'] || 0)) / 2);
      const affection_score = Math.round(((traitMap['Friendliness'] || 0) + (traitMap['Empathy'] || 0)) / 2);
      const uniqueness_score = Math.round(((traitMap['Playfulness'] || 0) + (traitMap['Humor'] || 0)) / 2);

      const overallScore = traits.rows.length > 0
        ? Math.round(traits.rows.reduce((sum, trait) => sum + trait.score, 0) / traits.rows.length)
        : 0;

      return {
        ...creature,
        ability_score,
        strength_score,
        affection_score,
        uniqueness_score,
        overall_score: overallScore
      };
    }));

    res.json({ creatures: creaturesWithScores });

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

/**
 * Idle Game - Get user's game state
 */
app.get('/api/idle-game/state', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT affection_points, businesses_state, last_update
      FROM idle_game_state
      WHERE user_id = $1
    `, [req.session.userId]);

    if (result.rows.length > 0) {
      res.json({ state: result.rows[0] });
    } else {
      // No saved state yet
      res.json({ state: null });
    }

  } catch (error) {
    console.error('Error fetching idle game state:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Idle Game - Save user's game state
 */
app.post('/api/idle-game/state', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { affection_points, businesses_state, last_update } = req.body;
  const client = new Client(config);

  try {
    await client.connect();

    // Upsert the game state
    await client.query(`
      INSERT INTO idle_game_state (user_id, affection_points, businesses_state, last_update)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        affection_points = $2,
        businesses_state = $3,
        last_update = $4,
        updated_at = CURRENT_TIMESTAMP
    `, [req.session.userId, affection_points, businesses_state, last_update]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error saving idle game state:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get list of welcome animations
 */
app.get('/api/animations/welcome', (req, res) => {
  try {
    const welcomeDir = path.join(__dirname, 'animations', 'welcome');

    // Check if directory exists
    if (!fs.existsSync(welcomeDir)) {
      console.error('Welcome animations directory not found:', welcomeDir);
      return res.status(404).json({ error: 'Welcome animations directory not found' });
    }

    const files = fs.readdirSync(welcomeDir);
    const videos = files.filter(file => file.endsWith('.mp4'));

    console.log(`Found ${videos.length} welcome animations:`, videos);

    res.json({ videos: videos.map(v => `/animations/welcome/${v}`) });
  } catch (error) {
    console.error('Error reading welcome animations:', error);
    res.status(500).json({ error: 'Failed to load animations' });
  }
});

/**
 * Get list of processed animations for a specific creature
 */
app.get('/api/animations/creature/:creatureId', (req, res) => {
  try {
    const { creatureId } = req.params;
    const processedDir = path.join(__dirname, 'animations', 'processed', creatureId);

    // Check if directory exists
    if (!fs.existsSync(processedDir)) {
      // No animations for this creature yet - return empty array
      return res.json({ animations: [] });
    }

    const files = fs.readdirSync(processedDir);
    const videos = files.filter(file => file.endsWith('.mp4'));

    console.log(`Found ${videos.length} animations for creature ${creatureId}`);

    res.json({ animations: videos.map(v => `/animations/processed/${creatureId}/${v}`) });
  } catch (error) {
    console.error('Error reading creature animations:', error);
    res.status(500).json({ error: 'Failed to load animations' });
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
        image_margin_top_px,
        info_panel_bg_color
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
        image_margin_top_px: 0,
        info_panel_bg_color: '#FFFFFF'
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
  const client = new Client(config);

  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization failed - no code provided');
    }

    // Exchange code for tokens (including refresh token)
    const tokens = await services.youtubeLikes.getTokensFromCode(code);

    // Store tokens in session temporarily
    req.session.youtubeAccessToken = tokens.accessToken;
    req.session.youtubeConnectedAt = new Date();

    // Process liked videos and claim rewards immediately
    if (req.session.userId) {
      await client.connect();

      // Store refresh token in oauth_accounts for automatic checking
      await client.query(`
        INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, refresh_token, access_token, token_expires_at, created_at, updated_at, last_used_at)
        VALUES ($1, 'youtube', $2, $3, $4, $5, to_timestamp($6 / 1000.0), NOW(), NOW(), NOW())
        ON CONFLICT (provider, provider_user_id)
        DO UPDATE SET
          user_id = $1,
          refresh_token = $4,
          access_token = $5,
          token_expires_at = to_timestamp($6 / 1000.0),
          updated_at = NOW(),
          last_used_at = NOW()
      `, [req.session.userId, tokens.googleUserId, tokens.email, tokens.refreshToken, tokens.accessToken, tokens.expiresAt]);

      const newRewards = await services.youtubeLikes.processLikesAndClaimRewards(
        req.session.userId,
        tokens.accessToken
      );

      console.log(`User ${req.session.userId} claimed ${newRewards.length} new rewards`);

      // Clear access token from session (refresh token is in database)
      delete req.session.youtubeAccessToken;

      // Redirect back with results
      res.redirect(`/user/integrations.html?rewards_claimed=${newRewards.length}`);
    } else {
      res.redirect('/user/integrations.html?error=no_session');
    }

  } catch (error) {
    console.error('Error in YouTube callback:', error);
    res.status(500).send(`Error processing YouTube likes: ${error.message}`);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
});

/**
 * Get YouTube access token (refresh if needed)
 */
app.get('/api/youtube/token', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Check if this user has YouTube connected
    const result = await client.query(`
      SELECT access_token, refresh_token, token_expires_at
      FROM oauth_accounts
      WHERE user_id = $1 AND provider = 'youtube'
    `, [req.session.userId]);

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    const tokenData = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(tokenData.token_expires_at);

    // Check if token is expired or will expire soon (within 5 minutes)
    if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      // Token expired, refresh it
      const newTokens = await services.youtubeLikes.refreshAccessToken(tokenData.refresh_token);

      // Update stored token
      await client.query(`
        UPDATE oauth_accounts
        SET access_token = $1,
            token_expires_at = to_timestamp($2 / 1000.0),
            updated_at = NOW()
        WHERE user_id = $3 AND provider = 'youtube'
      `, [newTokens.accessToken, newTokens.expiresAt, req.session.userId]);

      return res.json({ connected: true, accessToken: newTokens.accessToken });
    }

    // Token is still valid
    return res.json({ connected: true, accessToken: tokenData.access_token });

  } catch (error) {
    console.error('Error getting YouTube token:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Process YouTube liked videos (called by client-side auto-checker)
 */
app.post('/api/youtube/process-likes', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { likedVideos } = req.body;

  if (!Array.isArray(likedVideos)) {
    return res.status(400).json({ error: 'likedVideos must be an array' });
  }

  const client = new Client(config);
  const newRewards = [];

  try {
    await client.connect();

    // Process each video
    for (const video of likedVideos) {
      try {
        // Check if user already has this reward
        const alreadyClaimed = await client.query(`
          SELECT ur.id
          FROM user_rewards ur
          WHERE ur.user_id = $1
            AND ur.source_video_id = $2
        `, [req.session.userId, video.videoId]);

        if (alreadyClaimed.rows.length > 0) {
          continue; // Skip if already claimed
        }

        // Get or assign reward for this video
        const creature = await services.youtubeLikes.getOrAssignVideoReward(
          video.videoId,
          video.channelId,
          video.channelTitle,
          client
        );

        // Claim the reward for the user
        await client.query(`
          INSERT INTO user_rewards (user_id, creature_id, platform, source_video_id)
          VALUES ($1, $2, 'YouTube', $3)
          ON CONFLICT (user_id, creature_id) DO NOTHING
        `, [req.session.userId, creature.id, video.videoId]);

        newRewards.push({
          creature_id: creature.id,
          creature_name: creature.creature_name,
          rarity_tier: creature.rarity_tier,
          video_title: video.title
        });

        // Create notification
        await client.query(`
          INSERT INTO notifications (user_id, notification_type, title, message, metadata)
          VALUES ($1, 'reward_claimed', $2, $3, $4)
        `, [
          req.session.userId,
          'New Chatling Claimed!',
          `You got ${creature.creature_name} from liking "${video.title}"`,
          JSON.stringify({
            creature_id: creature.id,
            creature_name: creature.creature_name,
            rarity_tier: creature.rarity_tier,
            video_title: video.title
          })
        ]);

      } catch (error) {
        console.error(`Error processing video ${video.videoId}:`, error.message);
        // Continue with other videos
      }
    }

    // Update last check time
    await client.query(`
      UPDATE oauth_accounts
      SET last_used_at = NOW()
      WHERE user_id = $1 AND provider = 'youtube'
    `, [req.session.userId]);

    res.json({ newRewards: newRewards.length, rewards: newRewards });

  } catch (error) {
    console.error('Error processing YouTube likes:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// ============================================================================
// DAILY MYSTERY BOX ENDPOINTS
// ============================================================================

/**
 * Check if user can claim daily mystery box
 */
app.get('/api/daily-box/can-claim', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const canClaim = await services.dailyMysteryBox.canClaimToday(req.session.userId);
    res.json(canClaim);
  } catch (error) {
    console.error('Error checking daily box eligibility:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Claim daily mystery box
 */
app.post('/api/daily-box/claim', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await services.dailyMysteryBox.claimDailyBox(req.session.userId);
    console.log(`✨ Daily box claimed by user ${req.session.userId}`);
    res.json(result);
  } catch (error) {
    console.error('Error claiming daily box:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * Manually trigger YouTube background check (Admin only)
 */
app.post('/admin/trigger-youtube-check', async (req, res) => {
  try {
    console.log('🔧 Manual YouTube check triggered from admin hub');

    // Run the YouTube background check and get results
    const summary = await services.youtubeBackground.checkAllUsers();

    res.json({
      success: true,
      message: 'YouTube check completed successfully',
      results: summary
    });

  } catch (error) {
    console.error('Error triggering YouTube check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user profile (for authentication check)
 */
app.get('/api/user/profile', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT id, username, email, created_at, last_login_at
      FROM users
      WHERE id = $1
    `, [req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
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

    // Support showing all notifications or just unread
    const showAll = req.query.all === 'true';
    const limit = parseInt(req.query.limit) || 20;

    let query, params;
    if (showAll) {
      query = `
        SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params = [req.session.userId, limit];
    } else {
      query = `
        SELECT * FROM notifications
        WHERE user_id = $1 AND is_read = false
        ORDER BY created_at DESC
        LIMIT $2
      `;
      params = [req.session.userId, limit];
    }

    const result = await client.query(query, params);

    console.log(`GET /api/user/notifications - showAll: ${showAll}, returned ${result.rows.length} notifications`);
    if (result.rows.length > 0 && !showAll) {
      console.log('First notification is_read values:', result.rows.map(n => ({ id: n.id.substring(0, 8), is_read: n.is_read })));
    }

    res.json({ notifications: result.rows });

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

  const { notificationIds } = req.body;

  console.log('Mark as read request:', { userId: req.session.userId, notificationIds });

  if (!Array.isArray(notificationIds)) {
    return res.status(400).json({ error: 'notificationIds must be an array' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    let result;

    // If empty array, mark ALL notifications as read for this user
    if (notificationIds.length === 0) {
      result = await client.query(`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1 AND is_read = false
        RETURNING id, is_read
      `, [req.session.userId]);
      console.log('Marked ALL notifications as read, rows updated:', result.rowCount);
    } else {
      // Mark specific notifications as read
      result = await client.query(`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1 AND id = ANY($2)
        RETURNING id, is_read
      `, [req.session.userId, notificationIds]);
      console.log('Marked specific notifications as read, rows updated:', result.rowCount);
      console.log('Updated notifications:', result.rows);

      // Verify the update
      const verify = await client.query(`
        SELECT id, is_read FROM notifications
        WHERE id = ANY($1)
      `, [notificationIds]);
      console.log('Verification query result:', verify.rows);
    }

    res.json({ success: true, rowsUpdated: result.rowCount });

  } catch (error) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get VAPID public key for push subscription
 */
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

/**
 * Subscribe to push notifications
 */
app.post('/api/user/push-subscribe', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { subscription, userAgent } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    // Insert or update subscription
    await client.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, endpoint)
      DO UPDATE SET
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key,
        user_agent = EXCLUDED.user_agent,
        last_used_at = CURRENT_TIMESTAMP
    `, [
      req.session.userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent || null
    ]);

    // Create default preferences if they don't exist
    await client.query(`
      INSERT INTO push_notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [req.session.userId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Unsubscribe from push notifications
 */
app.post('/api/user/push-unsubscribe', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    await client.query(`
      DELETE FROM push_subscriptions
      WHERE user_id = $1 AND endpoint = $2
    `, [req.session.userId, endpoint]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Get push notification preferences
 */
app.get('/api/user/push-preferences', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT enabled, daily_box, new_chatling, achievement, chatroom, youtube_reminder
      FROM push_notification_preferences
      WHERE user_id = $1
    `, [req.session.userId]);

    if (result.rows.length === 0) {
      // Return defaults if no preferences exist yet
      res.json({
        enabled: true,
        daily_box: true,
        new_chatling: true,
        achievement: true,
        chatroom: false,
        youtube_reminder: false
      });
    } else {
      res.json(result.rows[0]);
    }

  } catch (error) {
    console.error('Error fetching push preferences:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Update push notification preferences
 */
app.post('/api/user/push-preferences', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { enabled, daily_box, new_chatling, achievement, chatroom, youtube_reminder } = req.body;

  const client = new Client(config);

  try {
    await client.connect();

    await client.query(`
      INSERT INTO push_notification_preferences (user_id, enabled, daily_box, new_chatling, achievement, chatroom, youtube_reminder)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        daily_box = EXCLUDED.daily_box,
        new_chatling = EXCLUDED.new_chatling,
        achievement = EXCLUDED.achievement,
        chatroom = EXCLUDED.chatroom,
        youtube_reminder = EXCLUDED.youtube_reminder,
        updated_at = CURRENT_TIMESTAMP
    `, [req.session.userId, enabled, daily_box, new_chatling, achievement, chatroom, youtube_reminder]);

    res.json({ success: true });

  } catch (error) {
    console.error('Error updating push preferences:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Create a notification for the current user
 */
app.post('/api/notifications', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { type, message, link, title } = req.body;

  if (!type || !message) {
    return res.status(400).json({ error: 'Type and message are required' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, link, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
      RETURNING *
    `, [req.session.userId, type, title || message, message, link || null]);

    res.json(result.rows[0]);

    // Also send push notification (don't await - let it happen async)
    const pushPayload = {
      title: title || message,
      body: message,
      icon: '/assets/icon-192.png',
      badge: '/assets/badge-72.png',
      data: {
        url: link || '/',
        notificationId: result.rows[0].id
      }
    };
    sendPushNotification(req.session.userId, type, pushPayload).catch(err => {
      console.error('Failed to send push notification:', err);
    });

  } catch (error) {
    console.error('Error creating notification:', error);
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
    // Check if user needs to sign up (no active account)
    if (req.user && req.user.needsSignup) {
      // Store OAuth profile in session for signup
      req.session.oauthProfile = req.user.profile;
      req.session.oauthProvider = 'google';

      return req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
        res.redirect('/user/signup.html');
      });
    }

    // User authenticated successfully, userId is in session
    req.session.userId = req.user;

    const client = new Client(config);

    try {
      await client.connect();

      // Check if user has password set and get login tracking data
      const userResult = await client.query(
        'SELECT password_hash, last_login_at, login_streak_days, last_streak_date FROM users WHERE id = $1',
        [req.user]
      );

      const hasPassword = userResult.rows.length > 0 && userResult.rows[0].password_hash;

      // Track login and update streak
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        await services.updateLoginStreak(req.user, user, client);
      }

      // Auto-transfer YouTube connection if it exists on another account
      // Get this user's Google account provider_user_id
      const googleAccount = await client.query(`
        SELECT provider_user_id
        FROM oauth_accounts
        WHERE user_id = $1 AND provider = 'google'
      `, [req.user]);

      if (googleAccount.rows.length > 0) {
        const googleUserId = googleAccount.rows[0].provider_user_id;

        // Check if this Google account has YouTube linked to a DIFFERENT chatlings account
        const youtubeOnOtherAccount = await client.query(`
          SELECT user_id
          FROM oauth_accounts
          WHERE provider_user_id = $1 AND provider = 'youtube' AND user_id != $2
        `, [googleUserId, req.user]);

        if (youtubeOnOtherAccount.rows.length > 0) {
          // Move YouTube connection to this account
          await client.query(`
            UPDATE oauth_accounts
            SET user_id = $1, updated_at = NOW()
            WHERE provider_user_id = $2 AND provider = 'youtube'
          `, [req.user, googleUserId]);

          console.log(`✓ Auto-transferred YouTube connection to user ${req.user} from abandoned account`);
        }
      }

      // Save session before redirecting
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }

        // If no password, redirect to password setup
        if (!hasPassword) {
          return res.redirect('/user/setup-password.html');
        }

        // Trigger daily chatling visit (if needed)
        dailyChatlingService.needsDailyVisit(req.user)
          .then(needsVisit => {
            if (needsVisit) {
              return dailyChatlingService.assignDailyChatling(req.user);
            }
          })
          .catch(visitError => {
            console.error('Error assigning daily chatling:', visitError);
          })
          .finally(() => {
            res.redirect('/user/index.html');
          });
      });

    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.redirect('/user/index.html'); // Fallback to main page
    } finally {
      await client.end();
    }
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
// Account Management API
// ============================================================================

/**
 * Get session info for signup page
 */
app.get('/api/user/session-info', (req, res) => {
  if (req.session.oauthProfile) {
    const email = req.session.oauthProfile.emails && req.session.oauthProfile.emails[0]
      ? req.session.oauthProfile.emails[0].value
      : null;

    return res.json({
      googleEmail: email,
      displayName: req.session.oauthProfile.displayName
    });
  }

  res.json({});
});

/**
 * Create new account after OAuth (signup flow)
 * Only allowed if no active account exists for this OAuth login
 */
app.post('/api/user/signup', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!req.session.oauthProfile) {
    return res.status(400).json({ error: 'No OAuth session found. Please sign in with Google first.' });
  }

  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // Validate username for inappropriate content with enhanced detection
  const usernameValidator = require('./services/username-validation-service');
  const usernameValidation = await usernameValidator.validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ error: usernameValidation.reason });
  }

  const client = new Client(config);

  try {
    await client.connect();
    await client.query('BEGIN');

    // Check if username already exists
    const existingUsername = await client.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (existingUsername.rows.length > 0) {
      await client.query('ROLLBACK');
      const alternatives = usernameValidator.generateAlternatives(username, 3);
      return res.status(400).json({
        error: 'Username already taken',
        suggestions: alternatives
      });
    }

    const provider = req.session.oauthProvider || 'google';
    const profile = req.session.oauthProfile;
    const providerId = profile.id;
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

    // Check if there's already an ACTIVE account for this OAuth login
    const activeCheck = await client.query(`
      SELECT u.id FROM users u
      JOIN oauth_accounts oa ON u.id = oa.user_id
      WHERE oa.provider = $1 AND oa.provider_user_id = $2
      AND u.active_account = true
    `, [provider, providerId]);

    if (activeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'An active account already exists for this Google login' });
    }

    // Validate password
    const passwordService = require('./services/password-service');
    const validation = passwordService.validatePasswordStrength(password);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validation.errors.join('. ') });
    }

    // Hash password
    const passwordHash = await passwordService.hashPassword(password);

    // Create new user with unique email
    const timestamp = Date.now();
    const uniqueEmail = email ? `${email.split('@')[0]}_${timestamp}@${email.split('@')[1]}` : `user_${timestamp}@chatlings.app`;

    const newUser = await client.query(`
      INSERT INTO users (username, email, password_hash, active_account, created_at)
      VALUES ($1, $2, $3, true, NOW())
      RETURNING id
    `, [username, uniqueEmail, passwordHash]);

    const userId = newUser.rows[0].id;

    // Link OAuth account to new user
    await client.query(`
      UPDATE oauth_accounts
      SET user_id = $1, updated_at = NOW()
      WHERE provider = $2 AND provider_user_id = $3
    `, [userId, provider, providerId]);

    // Initialize chat likelihood
    await client.query(`
      INSERT INTO user_chat_likelihood (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

    // Assign starter creature
    const oauthService = require('./services/oauth-service');
    await oauthService.assignStarterCreature(client, userId);

    await client.query('COMMIT');

    // Update session
    req.session.userId = userId;
    delete req.session.oauthProfile;
    delete req.session.oauthProvider;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }

      res.json({
        success: true,
        message: 'Account created successfully!',
        userId: userId
      });
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }

    console.error('='.repeat(80));
    console.error('ERROR CREATING ACCOUNT:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    console.error('='.repeat(80));

    try {
      res.status(500).json({ error: error.message });
    } catch (resError) {
      console.error('Failed to send error response:', resError);
    }
  } finally {
    try {
      await client.end();
    } catch (endError) {
      console.error('Error closing database connection:', endError);
    }
  }
});

/**
 * Set user password (during signup or password change)
 */
app.post('/api/user/set-password', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return res.status(400).json({ error: 'Password and confirmation required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    const passwordService = require('./services/password-service');

    // Validate password
    const validation = passwordService.validatePasswordStrength(password);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join('. ') });
    }

    // Hash password
    const passwordHash = await passwordService.hashPassword(password);

    // Update user
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, req.session.userId]
    );

    res.json({
      success: true,
      message: 'Password set successfully'
    });

  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

/**
 * Abandon current account
 * Deactivates account and logs user out
 * User must sign in again to create new account
 */
app.post('/api/user/abandon-account', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { password } = req.body;

  const client = new Client(config);

  try {
    await client.connect();

    // Get current user's password hash
    const userResult = await client.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify password if set
    if (user.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required' });
      }

      const passwordService = require('./services/password-service');
      const isValid = await passwordService.verifyPassword(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    // Deactivate current account
    await client.query(
      `UPDATE users
       SET active_account = false, abandoned_at = NOW()
       WHERE id = $1`,
      [req.session.userId]
    );

    // Destroy session (logout)
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });

    res.json({
      success: true,
      message: 'Account abandoned. You have been logged out.',
      logout: true
    });

  } catch (error) {
    console.error('Error abandoning account:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

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

// ============================================================================
// YouTube Topic Management API
// ============================================================================

// GET YouTube topics
app.get('/api/admin/youtube-topics', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(
      `SELECT * FROM trending_topics
       WHERE youtube_video_id IS NOT NULL
       ORDER BY created_at DESC`
    );

    res.json({ topics: result.rows });

  } catch (error) {
    console.error('Error fetching YouTube topics:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// POST new YouTube topic
app.post('/api/admin/youtube-topics', async (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  try {
    // Check if YouTube API key is configured
    if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
      return res.status(500).json({
        error: 'YouTube API key not configured. Add YOUTUBE_API_KEY to .env file'
      });
    }

    // Add video as topic using the YouTube metadata service
    const topic = await youtubeMetadataService.addVideoAsTopic(videoId);

    res.json({
      success: true,
      topic: topic
    });

  } catch (error) {
    console.error('Error adding YouTube topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Animation Management API
// ============================================================================

const AnimationService = require('./services/animation-service');
const animationService = new AnimationService(config);

// Set up Azure Blob Storage for animations
let blobServiceClient = null;
let animationsContainerClient = null;

// Try to load Azure SDK (may fail if dependencies aren't installed)
try {
  const { BlobServiceClient } = require('@azure/storage-blob');

  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    try {
      blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      const containerName = process.env.AZURE_STORAGE_CONTAINER_ANIMATIONS || 'animations';
      animationsContainerClient = blobServiceClient.getContainerClient(containerName);

      // Ensure container exists
      animationsContainerClient.createIfNotExists({ access: 'blob' })
        .then(() => console.log(`✓ Azure Blob Storage configured for animations (container: ${containerName})`))
        .catch(err => console.error('Error creating animations container:', err.message));
    } catch (error) {
      console.warn('⚠️  Azure Blob Storage not configured for animations:', error.message);
    }
  } else {
    console.warn('⚠️  AZURE_STORAGE_CONNECTION_STRING not set - animations will only be saved locally');
  }
} catch (error) {
  console.warn('⚠️  @azure/storage-blob module not available - animations will only be saved locally');
  console.warn('   Run: npm install @azure/storage-blob');
}

// Set up multer for file uploads
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'animations', 'processed');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate filename: creatureId_animationType_timestamp.ext
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const filename = `${req.body.creatureId}_${req.body.animationType}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Get creature animations (for display on creature pages)
app.get('/api/creatures/:creatureId/animations', async (req, res) => {
  try {
    const animations = await animationService.getCreatureAnimations(req.params.creatureId);
    res.json(animations);
  } catch (error) {
    console.error('Error fetching creature animations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific animation for display
app.get('/api/creatures/:creatureId/animations/:animationType', async (req, res) => {
  try {
    const animation = await animationService.getAnimationForDisplay(
      req.params.creatureId,
      req.params.animationType
    );

    if (animation) {
      res.json(animation);
    } else {
      res.status(404).json({ error: 'No animation found' });
    }
  } catch (error) {
    console.error('Error fetching animation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload animation (direct upload via form)
app.post('/api/animations/upload', upload.single('animation'), async (req, res) => {
  const client = new Client(config);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { creatureId, animationType, displayName } = req.body;

    if (!creatureId || !animationType) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.connect();

    // Store relative path for database
    const relativePath = `/animations/processed/${req.file.filename}`;

    // Insert into database
    const result = await client.query(`
      INSERT INTO creature_animations
      (creature_id, animation_type, file_path, file_name, display_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [creatureId, animationType, relativePath, req.file.filename, displayName || req.file.originalname]);

    const animationId = result.rows[0].id;

    console.log(`✅ Animation uploaded locally: ${animationType} for creature ${creatureId}`);
    console.log(`   File: ${req.file.filename}`);
    console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Azure Blob Storage (if configured)
    let blobUrl = null;
    if (animationsContainerClient) {
      try {
        const blobName = `processed/${req.file.filename}`;
        const blockBlobClient = animationsContainerClient.getBlockBlobClient(blobName);

        // Upload file to blob storage
        await blockBlobClient.uploadFile(req.file.path, {
          blobHTTPHeaders: {
            blobContentType: req.file.mimetype
          }
        });

        blobUrl = blockBlobClient.url;
        console.log(`✅ Animation uploaded to Azure Blob Storage: ${blobName}`);
      } catch (blobError) {
        console.error('⚠️  Failed to upload to Azure Blob Storage:', blobError.message);
        // Continue anyway - file is saved locally
      }
    }

    res.json({
      success: true,
      animationId: animationId,
      filePath: relativePath,
      fileName: req.file.filename,
      blobUrl: blobUrl
    });

  } catch (error) {
    console.error('Error uploading animation:', error);
    // Clean up file if database insert failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// Get animation types
app.get('/api/animation-types', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT type_key, display_name, description, is_random_selection, display_order
      FROM animation_types
      ORDER BY display_order
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching animation types:', error);
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
