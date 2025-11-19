/**
 * Export 25 random prompts per body type to CSV
 * Marks prompts as exported so they won't be repeated next time
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

const PROMPTS_PER_BODY_TYPE = 25;

async function exportSampledPrompts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Exporting Sampled Prompts to CSV\n');
    console.log('='.repeat(80));

    // Step 1: Add exported_to_csv column if it doesn't exist
    console.log('\n1. Checking for exported_to_csv column...');
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'creature_prompts'
        AND column_name = 'exported_to_csv'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('   Adding exported_to_csv column...');
      await client.query(`
        ALTER TABLE creature_prompts
        ADD COLUMN exported_to_csv BOOLEAN DEFAULT FALSE
      `);
      console.log('   ✓ Column added\n');
    } else {
      console.log('   ✓ Column exists\n');
    }

    // Step 2: Get all body types
    const bodyTypes = await client.query('SELECT * FROM dim_body_type ORDER BY body_type_name');
    console.log(`2. Processing ${bodyTypes.rows.length} body types...\n`);

    // Ensure artwork folder exists
    const artworkFolder = path.join(__dirname, '..', 'artwork');
    if (!fs.existsSync(artworkFolder)) {
      fs.mkdirSync(artworkFolder, { recursive: true });
    }

    let totalExported = 0;

    // Step 3: For each body type, export 25 random prompts
    for (const bodyType of bodyTypes.rows) {
      console.log(`${bodyType.body_type_name}:`);

      // Count available (not yet exported) prompts
      const availableCount = await client.query(`
        SELECT COUNT(*) as count
        FROM creature_prompts
        WHERE body_type_id = $1
          AND (exported_to_csv = FALSE OR exported_to_csv IS NULL)
      `, [bodyType.id]);

      const available = parseInt(availableCount.rows[0].count);
      const toExport = Math.min(PROMPTS_PER_BODY_TYPE, available);

      if (toExport === 0) {
        console.log('   ⚠️  No unexported prompts available - skipping\n');
        continue;
      }

      console.log(`   Available: ${available}, Exporting: ${toExport}`);

      // Select random prompts that haven't been exported
      const prompts = await client.query(`
        SELECT id, prompt
        FROM creature_prompts
        WHERE body_type_id = $1
          AND (exported_to_csv = FALSE OR exported_to_csv IS NULL)
        ORDER BY RANDOM()
        LIMIT $2
      `, [bodyType.id, toExport]);

      if (prompts.rows.length === 0) {
        console.log('   ⚠️  No prompts found - skipping\n');
        continue;
      }

      // Mark these prompts as exported
      const promptIds = prompts.rows.map(p => p.id);
      await client.query(`
        UPDATE creature_prompts
        SET exported_to_csv = TRUE
        WHERE id = ANY($1::int[])
      `, [promptIds]);

      // Write to CSV (just prompts, no headers)
      const filename = `${bodyType.body_type_name.toLowerCase()}_prompts.csv`;
      const filepath = path.join(artworkFolder, filename);
      const promptTexts = prompts.rows.map(p => p.prompt);

      fs.writeFileSync(filepath, promptTexts.join('\n'));

      totalExported += prompts.rows.length;
      console.log(`   ✓ Exported ${prompts.rows.length} prompts to ${filename}`);
      console.log(`   📝 Sample: "${promptTexts[0].substring(0, 80)}..."\n`);
    }

    // Summary
    console.log('='.repeat(80));
    console.log('✅ Export Complete!');
    console.log('='.repeat(80));
    console.log(`Total prompts exported: ${totalExported}`);
    console.log(`Files created: ${bodyTypes.rows.length} CSV files in artwork/ folder`);
    console.log('\nAll exported prompts are marked and won\'t be repeated next time.');
    console.log('Run this script again to export 25 more unique prompts per body type.\n');

    await client.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Export Sampled Prompts to CSV');
console.log('================================================================================\n');

exportSampledPrompts();
