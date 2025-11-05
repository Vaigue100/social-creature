/**
 * Admin Console Server for Image Selection
 * Serves the admin interface and handles image selection API
 */

const express = require('express');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Database config
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'admin')));
app.use('/artwork', express.static(path.join(__dirname, 'artwork')));
app.use('/images', express.static(path.join(__dirname, 'artwork', 'linked')));

// Handle favicon requests (just return 204 No Content to avoid 404 errors)
app.get('/favicon.ico', (req, res) => res.status(204).end());

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
  const { body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id } = req.query;

  try {
    await client.connect();

    // Build query based on provided filters
    const filters = [];
    const params = [];
    let paramIndex = 1;

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
      ORDER BY c.id
      LIMIT 9
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

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('Chatlings Admin Console');
  console.log('Image Selection Interface');
  console.log('='.repeat(80));
  console.log(`\nServer running at: http://localhost:${PORT}`);
  console.log('\nOpen this URL in your browser to start selecting images.\n');
});
