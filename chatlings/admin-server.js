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

/**
 * Get next creature that needs image selection
 */
app.get('/api/next-creature', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get first creature from the queue (driven by images in artwork folder)
    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.creature_shortname,
        c.rarity_tier,
        ds.species_name,
        dss.subspecies_name,
        dc.colouring_name,
        dst.style_name,
        dm.mood_name,
        dmt.motion_name,
        dea.affinity_name as elemental_affinity,
        de.environment_name,
        q.image_1_path,
        q.image_2_path,
        q.image_3_path,
        q.image_4_path
      FROM image_selection_queue q
      JOIN creatures c ON q.creature_id::uuid = c.id
      JOIN dim_species ds ON c.species_id = ds.id
      JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      JOIN dim_colouring dc ON c.colouring_id = dc.id
      JOIN dim_style dst ON c.style_id = dst.id
      JOIN dim_mood dm ON c.mood_id = dm.id
      JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
      JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
      JOIN dim_environment de ON c.environment_id = de.id
      ORDER BY q.id
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ done: true, message: 'All creatures have been reviewed!' });
    }

    const creature = result.rows[0];

    // Get images from queue table
    const images = [
      creature.image_1_path,
      creature.image_2_path,
      creature.image_3_path,
      creature.image_4_path
    ].filter(Boolean); // Remove any null values

    // Get progress stats
    const statsResult = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(selected_image_data) as completed
      FROM creatures
      WHERE id IN (SELECT creature_id::uuid FROM image_selection_queue)
    `);

    const queueSizeResult = await client.query('SELECT COUNT(*) as remaining FROM image_selection_queue');

    const stats = statsResult.rows[0];
    const remaining = parseInt(queueSizeResult.rows[0].remaining);

    res.json({
      creature,
      images,
      progress: {
        completed: parseInt(stats.completed),
        total: remaining + parseInt(stats.completed),
        remaining: remaining
      }
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
 * Get overall progress statistics
 */
app.get('/api/stats', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get stats from queue
    const queueResult = await client.query('SELECT COUNT(*) as remaining FROM image_selection_queue');

    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(selected_image_data) as completed,
        COUNT(CASE WHEN rarity_tier = 'Legendary' AND selected_image_data IS NOT NULL THEN 1 END) as legendary_done,
        COUNT(CASE WHEN rarity_tier = 'Legendary' THEN 1 END) as legendary_total,
        COUNT(CASE WHEN rarity_tier = 'Epic' AND selected_image_data IS NOT NULL THEN 1 END) as epic_done,
        COUNT(CASE WHEN rarity_tier = 'Epic' THEN 1 END) as epic_total
      FROM creatures
      WHERE id IN (SELECT creature_id::uuid FROM image_selection_queue)
         OR selected_image_data IS NOT NULL
    `);

    const stats = result.rows[0];
    stats.remaining = parseInt(queueResult.rows[0].remaining);

    res.json(stats);

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
