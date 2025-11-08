const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔄 Running Daily Chatlings Migration...\n');

    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'sql', 'migration_daily_chatlings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Changes applied:');
    console.log('   • Added current_chatling_id to users table');
    console.log('   • Added last_daily_visit to users table');
    console.log('   • Updated notification types (daily_visit, new_discovery, achievement_unlocked, chatling_evolved)');
    console.log('   • Created creator_chatlings table');
    console.log('   • Created daily_visits table');
    console.log('   • Created assign_daily_chatling() function');
    console.log('   • Added source column to user_rewards\n');

    console.log('🎮 New Features Enabled:');
    console.log('   • Daily chatling visits (auto-added to collection)');
    console.log('   • User-chatling associations (current active chatling)');
    console.log('   • Creator chatlings (meet chatlings from video creators)');
    console.log('   • Enhanced notification system\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

runMigration();
