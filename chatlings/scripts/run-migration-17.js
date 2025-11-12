/**
 * Migration 17: Expand dimensions with new body types and sizes
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
    const sqlPath = path.join(__dirname, 'sql', '17_expand_dimensions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running Migration 17: Expand dimensions...\n');

    // Execute the migration
    const result = await client.query(sql);

    // Show the results (last query returns counts)
    console.log('\n' + '='.repeat(80));
    console.log('Migration Results:\n');
    if (result && result.rows) {
      result.rows.forEach(row => {
        console.log(`  ${row.table_name}: ${row.count}`);
      });
    }

    console.log('\n✅ Migration 17 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
