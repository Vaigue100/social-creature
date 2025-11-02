/**
 * Export creature data to CSV queue for offline image generation
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function exportCreatureQueue() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Get all creatures with required info for image generation
    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.creature_shortname,
        c.rarity_tier,
        dss.subspecies_name,
        dc.colouring_name,
        dst.style_name,
        dm.mood_name,
        dmt.motion_name,
        dea.affinity_name as elemental_affinity,
        de.environment_name
      FROM creatures c
      JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      JOIN dim_colouring dc ON c.colouring_id = dc.id
      JOIN dim_style dst ON c.style_id = dst.id
      JOIN dim_mood dm ON c.mood_id = dm.id
      JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
      JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
      JOIN dim_environment de ON c.environment_id = de.id
      ORDER BY RANDOM()
    `);

    console.log(`Found ${result.rows.length} creatures`);

    // Create CSV content
    const headers = [
      'id',
      'creature_name',
      'creature_shortname',
      'rarity_tier',
      'subspecies_name',
      'colouring_name',
      'style_name',
      'mood_name',
      'motion_name',
      'elemental_affinity',
      'environment_name'
    ];

    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (value && value.toString().includes(',')) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    // Write to artwork folder
    const outputPath = path.join(__dirname, '..', 'artwork', 'creature_images_queue.csv');
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

    console.log(`\n✓ Created queue file: ${outputPath}`);
    console.log(`  ${result.rows.length} creatures in randomized order\n`);

    // Create empty tracking CSV
    const trackingPath = path.join(__dirname, '..', 'artwork', 'creature_images_created.csv');
    const trackingHeaders = 'creature_id,image_filename\n';
    fs.writeFileSync(trackingPath, trackingHeaders, 'utf8');

    console.log(`✓ Created tracking file: ${trackingPath}`);
    console.log('  Empty - ready to track completed images\n');

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

exportCreatureQueue();
