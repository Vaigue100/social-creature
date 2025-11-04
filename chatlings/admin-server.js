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

/**
 * Get next creature that needs image selection
 */
app.get('/api/next-creature', async (req, res) => {
  const client = new Client(config);

  try {
    await client.connect();

    // Get first creature without selected_image that has generated images
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
        c.selected_image
      FROM creatures c
      JOIN dim_species ds ON c.species_id = ds.id
      JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      JOIN dim_colouring dc ON c.colouring_id = dc.id
      JOIN dim_style dst ON c.style_id = dst.id
      JOIN dim_mood dm ON c.mood_id = dm.id
      JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
      JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
      JOIN dim_environment de ON c.environment_id = de.id
      WHERE c.selected_image IS NULL
      ORDER BY c.id
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ done: true, message: 'All creatures have been reviewed!' });
    }

    const creature = result.rows[0];

    // Find the 4 images for this creature
    const artworkDir = path.join(__dirname, 'artwork');
    const imagePattern = `${creature.id}_`;
    const allFiles = fs.readdirSync(artworkDir);
    const images = allFiles
      .filter(f => f.startsWith(imagePattern) && (f.endsWith('.jpg') || f.endsWith('.png')))
      .sort()
      .slice(0, 4);

    // Get progress stats
    const statsResult = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(selected_image) as completed
      FROM creatures
    `);

    const stats = statsResult.rows[0];

    res.json({
      creature,
      images,
      progress: {
        completed: parseInt(stats.completed),
        total: parseInt(stats.total),
        remaining: parseInt(stats.total) - parseInt(stats.completed)
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
 */
app.post('/api/select-image', async (req, res) => {
  const { creatureId, imageFilename } = req.body;

  if (!creatureId || !imageFilename) {
    return res.status(400).json({ error: 'Missing creatureId or imageFilename' });
  }

  const client = new Client(config);

  try {
    await client.connect();

    await client.query(
      'UPDATE creatures SET selected_image = $1 WHERE id = $2',
      [imageFilename, creatureId]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error saving selection:', error);
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

    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(selected_image) as completed,
        COUNT(CASE WHEN rarity_tier = 'Legendary' AND selected_image IS NOT NULL THEN 1 END) as legendary_done,
        COUNT(CASE WHEN rarity_tier = 'Legendary' THEN 1 END) as legendary_total,
        COUNT(CASE WHEN rarity_tier = 'Epic' AND selected_image IS NOT NULL THEN 1 END) as epic_done,
        COUNT(CASE WHEN rarity_tier = 'Epic' THEN 1 END) as epic_total
      FROM creatures
    `);

    res.json(result.rows[0]);

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
