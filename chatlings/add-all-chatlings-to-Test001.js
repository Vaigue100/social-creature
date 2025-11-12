/**
 * Add all creatures to Test001 user's collection
 * Run this after importing creatures to make them visible in the user hub
 */

const { Client } = require('pg');
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

async function addCreaturesToTest001() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Find Test001 user
    const userResult = await client.query("SELECT id, username FROM users WHERE username = 'Test001'");

    if (userResult.rows.length === 0) {
      console.log('❌ Test001 user not found!');
      console.log('\nAvailable users:');
      const allUsers = await client.query('SELECT username FROM users ORDER BY username');
      allUsers.rows.forEach(u => console.log(`  - ${u.username}`));
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`Found user: ${userResult.rows[0].username}\n`);

    // Get all unclaimed creatures
    const creaturesResult = await client.query(`
      SELECT c.id, c.creature_name, bt.body_type_name
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      WHERE c.is_active = true
        AND c.id NOT IN (SELECT creature_id FROM user_rewards WHERE user_id = $1)
      ORDER BY c.created_at DESC
    `, [userId]);

    console.log(`Found ${creaturesResult.rows.length} unclaimed creatures\n`);

    if (creaturesResult.rows.length === 0) {
      console.log('✓ All creatures already in Test001 collection!');
      process.exit(0);
    }

    // Add each creature to user's collection
    for (const creature of creaturesResult.rows) {
      await client.query(`
        INSERT INTO user_rewards (user_id, creature_id, platform, claimed_at)
        VALUES ($1, $2, 'Manual', NOW())
      `, [userId, creature.id]);

      console.log(`✓ Added ${creature.creature_name} (${creature.body_type_name})`);
    }

    console.log(`\n✅ Added ${creaturesResult.rows.length} creatures to Test001's collection!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addCreaturesToTest001();
