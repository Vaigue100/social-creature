/**
 * Update database with generated shortnames
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

async function updateShortnames() {
  const client = new Client(config);

  try {
    console.log('========================================');
    console.log('Updating Creature Shortnames');
    console.log('========================================\n');

    // Load generated shortnames
    const shortnamesPath = path.join(__dirname, '..', 'data', 'creature_shortnames.json');

    if (!fs.existsSync(shortnamesPath)) {
      console.error('✗ Shortnames file not found!');
      console.error('  Run generate-shortnames.js first\n');
      process.exit(1);
    }

    const shortnames = JSON.parse(fs.readFileSync(shortnamesPath, 'utf8'));
    console.log(`✓ Loaded ${shortnames.length} shortnames\n`);

    await client.connect();
    console.log('✓ Connected to database\n');

    console.log('Updating database...\n');

    let updated = 0;
    let failed = 0;

    for (const entry of shortnames) {
      try {
        await client.query(`
          UPDATE creatures
          SET
            creature_shortname = $1,
            language_base = $2,
            pronunciation = $3,
            vibe = $4
          WHERE id = $5
        `, [entry.shortname, entry.language, entry.pronunciation, entry.vibe, entry.id]);

        updated++;

        if (updated % 100 === 0) {
          console.log(`  Progress: ${updated}/${shortnames.length} creatures...`);
        }
      } catch (err) {
        console.error(`  ✗ Failed to update ${entry.id}:`, err.message);
        failed++;
      }
    }

    console.log(`\n✓ Updated ${updated} creatures`);
    if (failed > 0) {
      console.log(`✗ Failed to update ${failed} creatures`);
    }

    // Show some examples
    console.log('\n========================================');
    console.log('Sample Results');
    console.log('========================================\n');

    const samples = await client.query(`
      SELECT
        creature_name,
        creature_shortname,
        language_base,
        pronunciation,
        vibe,
        rarity_tier
      FROM creatures
      WHERE creature_shortname IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 15
    `);

    samples.rows.forEach(row => {
      console.log(`${row.creature_name}`);
      console.log(`  → ${row.creature_shortname} (${row.language_base})`);
      console.log(`  → [${row.pronunciation}] - ${row.vibe} - ${row.rarity_tier}\n`);
    });

    // Show statistics
    console.log('========================================');
    console.log('Statistics');
    console.log('========================================\n');

    const stats = await client.query(`
      SELECT
        language_base,
        COUNT(*) as count
      FROM creatures
      WHERE language_base IS NOT NULL
      GROUP BY language_base
      ORDER BY count DESC
    `);

    console.log('Language distribution:');
    stats.rows.forEach(row => {
      console.log(`  ${row.language_base.padEnd(15)}: ${row.count}`);
    });

    console.log('\n========================================');
    console.log('Update complete!');
    console.log('========================================\n');

    await client.end();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

updateShortnames();
