/**
 * Migration 18: Map dimensions to all body types
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
    const sqlPath = path.join(__dirname, 'sql', '18_map_dimensions_to_body_types.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running Migration 18: Map dimensions to body types...\n');

    // Execute the migration
    await client.query(sql);

    // Show the results
    const results = await client.query(`
      SELECT
        bt.body_type_name,
        (SELECT COUNT(*) FROM dim_size_category_body_types WHERE body_type_id = bt.id) as sizes,
        (SELECT COUNT(*) FROM dim_social_activity_body_types WHERE body_type_id = bt.id) as activities,
        (SELECT COUNT(*) FROM dim_social_mood_body_types WHERE body_type_id = bt.id) as moods,
        (SELECT COUNT(*) FROM dim_color_scheme_body_types WHERE body_type_id = bt.id) as colors,
        (SELECT COUNT(*) FROM dim_special_quirk_body_types WHERE body_type_id = bt.id) as quirks
      FROM dim_body_type bt
      ORDER BY bt.id
    `);

    console.log('='.repeat(80));
    console.log('Dimension Mappings Per Body Type:\n');
    results.rows.forEach(row => {
      console.log(`${row.body_type_name}:`);
      console.log(`  Sizes: ${row.sizes}, Activities: ${row.activities}, Moods: ${row.moods}, Colors: ${row.colors}, Quirks: ${row.quirks}`);
    });

    console.log('\n✅ Migration 18 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
