/**
 * Update database with improved shortnames (v2)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

async function updateDatabase() {
  const client = new Client(config);

  try {
    console.log('========================================');
    console.log('Updating Database with Improved Shortnames');
    console.log('========================================\n');

    // Load the v2 shortnames
    const shortnamesPath = path.join(__dirname, '..', 'data', 'creature_shortnames_v2.json');

    if (!fs.existsSync(shortnamesPath)) {
      console.error('✗ File not found:', shortnamesPath);
      console.error('  Run regenerate-better-shortnames.js first\n');
      process.exit(1);
    }

    const shortnames = JSON.parse(fs.readFileSync(shortnamesPath, 'utf8'));
    console.log(`✓ Loaded ${shortnames.length} improved shortnames\n`);

    await client.connect();
    console.log('✓ Connected to database\n');

    console.log('Updating creatures...\n');

    let updated = 0;
    let failed = 0;

    for (const entry of shortnames) {
      try {
        const result = await client.query(`
          UPDATE creatures
          SET
            creature_shortname = $1,
            language_base = $2,
            pronunciation = $3,
            vibe = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [entry.shortname, entry.language, entry.pronunciation, entry.vibe, entry.id]);

        if (result.rowCount > 0) {
          updated++;
        } else {
          failed++;
        }

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
    console.log('Sample Updated Creatures');
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
      LIMIT 20
    `);

    samples.rows.forEach(row => {
      console.log(`${row.creature_name}`);
      console.log(`  → ${row.creature_shortname} (${row.language_base})`);
      console.log(`  → [${row.pronunciation}] - ${row.vibe} - ${row.rarity_tier}\n`);
    });

    // Show statistics
    console.log('========================================');
    console.log('Language Distribution');
    console.log('========================================\n');

    const stats = await client.query(`
      SELECT
        language_base,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM creatures
      WHERE language_base IS NOT NULL
      GROUP BY language_base
      ORDER BY count DESC
    `);

    stats.rows.forEach(row => {
      const bar = '█'.repeat(Math.floor(row.percentage / 2));
      console.log(`${row.language_base.padEnd(12)}: ${row.count.toString().padStart(4)} (${row.percentage}%) ${bar}`);
    });

    console.log('\n========================================');
    console.log('Update Complete!');
    console.log('========================================\n');

    console.log('✓ All creatures now have improved shortnames');
    console.log('✓ Refresh pgAdmin to see the changes\n');

    await client.end();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

updateDatabase();
