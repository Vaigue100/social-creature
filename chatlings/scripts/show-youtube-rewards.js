/**
 * Show YouTube rewards in database
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function showRewards(userEmail) {
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
    console.log(`\n📺 YouTube Rewards for: ${userEmail}\n`);

    // Get YouTube rewards with creature details
    const rewards = await client.query(`
      SELECT
        ur.id as reward_id,
        ur.creature_id,
        c.creature_name,
        c.rarity_tier,
        ur.platform,
        ur.source_video_id,
        ur.claimed_at,
        ur.found_count
      FROM user_rewards ur
      JOIN creatures c ON ur.creature_id = c.id
      WHERE ur.user_id = $1 AND ur.platform = 'YouTube'
      ORDER BY ur.claimed_at DESC
    `, [userId]);

    console.log(`Total YouTube Chatlings: ${rewards.rows.length}\n`);

    if (rewards.rows.length > 0) {
      console.log('Database Table: user_rewards');
      console.log('Columns: id, user_id, creature_id, platform, source_video_id, claimed_at, found_count\n');

      console.log('Sample Rows (first 5):\n');
      rewards.rows.slice(0, 5).forEach((row, idx) => {
        console.log(`${idx + 1}. ID: ${row.reward_id}`);
        console.log(`   Creature: ${row.creature_name} (${row.rarity_tier})`);
        console.log(`   Video ID: ${row.source_video_id || 'N/A'}`);
        console.log(`   Claimed: ${row.claimed_at}`);
        console.log(`   Found Count: ${row.found_count || 1}`);
        console.log();
      });

      if (rewards.rows.length > 5) {
        console.log(`... and ${rewards.rows.length - 5} more\n`);
      }

      // Show rarity breakdown
      console.log('Rarity Breakdown:');
      const rarityBreakdown = rewards.rows.reduce((acc, row) => {
        acc[row.rarity_tier] = (acc[row.rarity_tier] || 0) + 1;
        return acc;
      }, {});

      Object.entries(rarityBreakdown).forEach(([rarity, count]) => {
        console.log(`  ${rarity}: ${count}`);
      });
    }

  } finally {
    await client.end();
  }
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: node show-youtube-rewards.js <email>');
  process.exit(1);
}

showRewards(email).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
