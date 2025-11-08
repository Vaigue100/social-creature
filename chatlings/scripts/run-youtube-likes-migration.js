/**
 * Run YouTube Likes-Based Migration
 * Updates schema for privacy-first likes-based reward system
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  console.log('='.repeat(80));
  console.log('YouTube Likes-Based Reward System Migration');
  console.log('Privacy-First Design - No Long-Term User Data Storage');
  console.log('='.repeat(80));
  console.log();

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Clean up old tables from previous design
    console.log('Cleaning up old tables...');
    await client.query('DROP TABLE IF EXISTS youtube_channel_assignments CASCADE');
    await client.query('DROP TABLE IF EXISTS user_encounters CASCADE');
    console.log('✓ Old tables removed\n');

    // Remove YouTube OAuth columns from users table (privacy-first)
    console.log('Removing long-term OAuth storage...');
    try {
      await client.query(`
        ALTER TABLE users
        DROP COLUMN IF EXISTS youtube_user_id,
        DROP COLUMN IF EXISTS youtube_channel_id,
        DROP COLUMN IF EXISTS youtube_access_token,
        DROP COLUMN IF EXISTS youtube_refresh_token,
        DROP COLUMN IF EXISTS youtube_token_expires_at,
        DROP COLUMN IF EXISTS youtube_connected_at
      `);
      console.log('✓ OAuth columns removed\n');
    } catch (err) {
      console.log('  (columns may not exist yet, continuing...)\n');
    }

    // Run new migration
    const sqlFile = path.join(__dirname, 'sql', 'migration_youtube_likes.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const cleanedSql = sql.replace(/\\c chatlings;/g, '');

    await client.query(cleanedSql);
    console.log('✓ Migration completed successfully!\n');

    // Show summary
    console.log('New tables created:');
    console.log('  - video_rewards (24hr TTL, no user data)');
    console.log('  - user_rewards (permanent collection)');
    console.log('  - notifications (reward claims & achievements)');
    console.log('  - achievements (reward-based goals)');
    console.log('  - user_achievements (progress tracking)');
    console.log();
    console.log('Privacy Features:');
    console.log('  ✓ No OAuth tokens stored in database');
    console.log('  ✓ No user identity linked to videos');
    console.log('  ✓ Video-reward mappings auto-expire after 24 hours');
    console.log('  ✓ Rewards decoupled from platform once claimed');
    console.log();

    await client.end();

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

runMigration();
