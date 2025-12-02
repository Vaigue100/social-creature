/**
 * Check YouTube integration status and rewards
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function check() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Check oauth_accounts
    const oauth = await client.query(`
      SELECT
        oa.user_id,
        u.email,
        oa.provider,
        oa.youtube_integrated_at,
        oa.created_at
      FROM oauth_accounts oa
      LEFT JOIN users u ON oa.user_id = u.id
      WHERE oa.provider = 'youtube'
    `);

    console.log('📺 YouTube OAuth Accounts:\n');
    if (oauth.rows.length === 0) {
      console.log('No YouTube connections found\n');
    } else {
      oauth.rows.forEach(row => {
        console.log(`User: ${row.email}`);
        console.log(`  youtube_integrated_at: ${row.youtube_integrated_at || 'NULL (first connection not completed)'}`);
        console.log(`  created_at: ${row.created_at}`);
        console.log();
      });
    }

    // Check how many rewards they have
    const rewards = await client.query(`
      SELECT COUNT(*) as count
      FROM user_rewards
      WHERE platform = 'YouTube'
    `);

    console.log('🎁 YouTube Rewards:');
    console.log(`  Total claimed: ${rewards.rows[0]?.count || 0}\n`);

    // Check individual user rewards
    const userRewards = await client.query(`
      SELECT
        u.email,
        COUNT(ur.id) as reward_count
      FROM users u
      LEFT JOIN user_rewards ur ON u.id = ur.user_id AND ur.platform = 'YouTube'
      GROUP BY u.email
      HAVING COUNT(ur.id) > 0
      ORDER BY COUNT(ur.id) DESC
    `);

    if (userRewards.rows.length > 0) {
      console.log('Per User Breakdown:');
      userRewards.rows.forEach(row => {
        console.log(`  ${row.email}: ${row.reward_count} chatlings`);
      });
    }

  } finally {
    await client.end();
  }
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
