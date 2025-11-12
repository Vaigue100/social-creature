/**
 * Run Migration 14: Update Body Type Display Names
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'sql', '14_update_body_type_names.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running Migration 14: Update Body Type Display Names');
    console.log('This will update body type names to friendlier versions:\n');
    console.log('  - Long & Noodle-like → Noodles');
    console.log('  - Sleek & Smooth → Sleeks');
    console.log('  - Floofy & Round → Floofs');
    console.log('  - Bean-shaped → Beanies');
    console.log('  - Blobby & Wiggly → Blobs');
    console.log('  - Chubby & Squishy → Squishies');
    console.log('  - Athletic → Athletes');
    console.log('  - Spiky but Soft → Spikes\n');

    // Execute migration
    await client.query(sql);

    console.log('✅ Migration 14 completed successfully!\n');

    await client.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Migration 14: Update Body Type Display Names');
console.log('================================================================================\n');

runMigration();
