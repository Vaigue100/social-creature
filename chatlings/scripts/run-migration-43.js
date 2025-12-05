const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dbConfig = require('./db-config');

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', '43_add_info_panel_color.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 43: Add info panel background color to frame config...');

    await client.query(sql);

    console.log('✅ Migration 43 completed successfully!');
    console.log('✓ Added info_panel_bg_color column to body_type_frame_config');
    console.log('✓ Set Dragon info panel color to burnt orange (#CC5500)');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
