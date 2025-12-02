/**
 * Reset YouTube Integration for Current User
 * Clears OAuth connection and all YouTube rewards
 * Allows starting fresh with only new likes counting
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function resetYouTubeIntegration(userEmail) {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Get user ID
    const userResult = await client.query(`
      SELECT id, email FROM users WHERE email = $1
    `, [userEmail]);

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${userEmail}`);
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`\n🔄 Resetting YouTube integration for: ${userEmail}`);
    console.log(`User ID: ${userId}\n`);

    // Count current YouTube rewards
    const rewardsCount = await client.query(`
      SELECT COUNT(*) as count
      FROM user_rewards
      WHERE user_id = $1 AND platform = 'YouTube'
    `, [userId]);

    console.log(`Current YouTube chatlings: ${rewardsCount.rows[0].count}`);

    // Delete YouTube OAuth connection
    const oauthDelete = await client.query(`
      DELETE FROM oauth_accounts
      WHERE user_id = $1 AND provider = 'youtube'
      RETURNING id
    `, [userId]);

    console.log(`✓ Deleted YouTube OAuth connection (${oauthDelete.rows.length} row(s))`);

    // Delete YouTube rewards
    const rewardsDelete = await client.query(`
      DELETE FROM user_rewards
      WHERE user_id = $1 AND platform = 'YouTube'
      RETURNING id
    `, [userId]);

    console.log(`✓ Deleted YouTube rewards (${rewardsDelete.rows.length} chatling(s))`);

    // Delete YouTube-related notifications
    const notifDelete = await client.query(`
      DELETE FROM notifications
      WHERE user_id = $1
        AND (notification_type = 'reward_claimed' AND message LIKE '%YouTube%'
             OR title LIKE '%YouTube%')
      RETURNING id
    `, [userId]);

    console.log(`✓ Deleted YouTube notifications (${notifDelete.rows.length} notification(s))`);

    console.log('\n✅ Reset complete!\n');
    console.log('Next steps:');
    console.log('1. Go to http://localhost:3000/user/integrations.html');
    console.log('2. Click "Connect YouTube to Find Chatlings"');
    console.log('3. Complete OAuth - historical likes will be SKIPPED');
    console.log('4. Only NEW likes from now on will give chatlings! 🎯\n');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Get email from command line or use most recent user
const email = process.argv[2];

if (!email) {
  console.log('Usage: node reset-youtube-integration.js <email>');
  console.log('Example: node reset-youtube-integration.js user@example.com');
  process.exit(1);
}

resetYouTubeIntegration(email).catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
