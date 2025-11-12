/**
 * Migration 19: Deduplicate dimension tables
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./db-config');

async function runMigration() {
  const client = new Client({ ...config, database: 'chatlings' });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', '19_deduplicate_dimensions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running Migration 19: Deduplicate dimensions...\n');

    // Execute the migration
    await client.query(sql);

    // Show the results
    const results = await client.query(`
      SELECT 'Activities' as table_name, COUNT(*) as count FROM dim_social_activity
      UNION ALL
      SELECT 'Moods', COUNT(*) FROM dim_social_mood
      UNION ALL
      SELECT 'Colors', COUNT(*) FROM dim_color_scheme
      UNION ALL
      SELECT 'Quirks', COUNT(*) FROM dim_special_quirk
    `);

    console.log('='.repeat(80));
    console.log('Final Dimension Counts:\n');
    results.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.count}`);
    });

    console.log('\n✅ Migration 19 completed successfully!');
    console.log('\nDim tables now contain only unique entries.');
    console.log('Junction tables have been updated and deduplicated.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
