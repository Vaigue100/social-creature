/**
 * Scan Artwork Folder and Populate Image Selection Queue
 *
 * This script:
 * 1. Scans the artwork folder for generated creature images
 * 2. Groups images by creature_id (format: {creature_id}_{1-4}.jpg)
 * 3. Populates the image_selection_queue table
 * 4. Only adds creatures that have 4 complete images
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

const ARTWORK_DIR = path.join(__dirname, '..', 'artwork');

async function scanArtworkFolder() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Read all files from artwork folder
    const files = fs.readdirSync(ARTWORK_DIR);

    // Filter for image files that match pattern: {creature_id}_{number}.jpg
    // Supports both UUID and numeric IDs
    const imageFiles = files.filter(f => {
      return (f.endsWith('.jpg') || f.endsWith('.png')) &&
             /^[a-f0-9\-]+_\d+\.(jpg|png)$/i.test(f);
    });

    console.log(`Found ${imageFiles.length} creature images in artwork folder\n`);

    // Group images by creature_id
    const creatureImages = {};

    for (const filename of imageFiles) {
      const match = filename.match(/^([a-f0-9\-]+)_(\d+)\.(jpg|png)$/i);
      if (match) {
        const creatureId = match[1];
        const imageNum = parseInt(match[2]);

        if (!creatureImages[creatureId]) {
          creatureImages[creatureId] = {};
        }

        creatureImages[creatureId][imageNum] = filename;
      }
    }

    console.log(`Found images for ${Object.keys(creatureImages).length} creatures\n`);

    // Filter to only creatures with all 4 images
    const completeCreatures = [];
    const incompleteCreatures = [];

    for (const [creatureId, images] of Object.entries(creatureImages)) {
      const hasAll4 = images[1] && images[2] && images[3] && images[4];

      if (hasAll4) {
        completeCreatures.push({
          creature_id: creatureId,
          image_1: images[1],
          image_2: images[2],
          image_3: images[3],
          image_4: images[4]
        });
      } else {
        incompleteCreatures.push({
          creature_id: creatureId,
          count: Object.keys(images).length,
          images: images
        });
      }
    }

    console.log(`Complete sets (4 images): ${completeCreatures.length}`);
    console.log(`Incomplete sets: ${incompleteCreatures.length}\n`);

    if (incompleteCreatures.length > 0) {
      console.log('Incomplete creatures (showing first 10):');
      incompleteCreatures.slice(0, 10).forEach(c => {
        console.log(`  Creature ${c.creature_id}: ${c.count} images - ${Object.values(c.images).join(', ')}`);
      });
      console.log();
    }

    // Clear existing queue
    await client.query('TRUNCATE image_selection_queue');
    console.log('Cleared existing queue\n');

    // Insert complete creatures into queue
    let inserted = 0;
    let skipped = 0;

    for (const creature of completeCreatures) {
      try {
        await client.query(`
          INSERT INTO image_selection_queue
            (creature_id, image_1_path, image_2_path, image_3_path, image_4_path)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (creature_id) DO NOTHING
        `, [
          creature.creature_id,
          creature.image_1,
          creature.image_2,
          creature.image_3,
          creature.image_4
        ]);
        inserted++;
      } catch (error) {
        // Creature doesn't exist in database
        skipped++;
      }
    }

    console.log(`[SUCCESS] Populated image selection queue`);
    console.log(`  Inserted: ${inserted} creatures`);
    console.log(`  Skipped: ${skipped} creatures (not in database)`);
    console.log(`\nThe admin console will now show these ${inserted} creatures for image selection.\n`);

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Scan Artwork Folder & Populate Queue');
console.log('================================================================================\n');

scanArtworkFolder();
