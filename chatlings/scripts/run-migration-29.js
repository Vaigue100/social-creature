/**
 * Migration 29: Track YouTube Video Sources
 *
 * Adds source_video_id to user_rewards to permanently track which
 * YouTube videos a user has already claimed rewards from.
 *
 * This prevents duplicate rewards when:
 * - Video rewards expire (24 hours)
 * - User reconnects YouTube
 * - Processing historical likes
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 29: Track YouTube Video Sources\n');
    console.log('='.repeat(80));

    // Step 1: Add source_video_id column
    console.log('\n1. Adding source_video_id column to user_rewards...');
    await client.query(`
      ALTER TABLE user_rewards
      ADD COLUMN IF NOT EXISTS source_video_id VARCHAR(255)
    `);
    console.log('  ✓ Column added');

    // Step 2: Add index for faster lookups
    console.log('\n2. Creating index on source_video_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_rewards_source_video
      ON user_rewards(user_id, source_video_id)
      WHERE source_video_id IS NOT NULL
    `);
    console.log('  ✓ Index created');

    // Step 3: Add column comment
    console.log('\n3. Adding column comment...');
    await client.query(`
      COMMENT ON COLUMN user_rewards.source_video_id IS
      'YouTube video ID if reward came from liking a video (prevents duplicate rewards)'
    `);
    console.log('  ✓ Comment added');

    // Step 4: Verify the changes
    console.log('\n4. Verifying results...');
    const result = await client.query(`
      SELECT
        COUNT(*) as total_rewards,
        COUNT(source_video_id) as youtube_rewards
      FROM user_rewards
    `);

    console.log(`  Total rewards: ${result.rows[0].total_rewards}`);
    console.log(`  YouTube rewards with source: ${result.rows[0].youtube_rewards}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration 29 completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 29: Track YouTube Video Sources');
console.log('================================================================================\n');

runMigration();
