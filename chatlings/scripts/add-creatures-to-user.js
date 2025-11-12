/**
 * Add all creatures to a specific user's collection
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addCreaturesToUser() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Show available users
    const usersResult = await client.query('SELECT id, username FROM users ORDER BY username');
    console.log('Available users:');
    usersResult.rows.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.username} (${user.id})`);
    });

    // Use Test001 as default
    const defaultUser = usersResult.rows.find(u => u.username === 'Test001');
    if (!defaultUser) {
      console.log('\nNo Test001 user found. Please specify a user ID.');
      process.exit(1);
    }

    console.log(`\nUsing user: ${defaultUser.username}\n`);
    const userId = defaultUser.id;

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
      console.log('All creatures already in collection!');
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

    console.log(`\n✅ Added ${creaturesResult.rows.length} creatures to ${defaultUser.username}'s collection!`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

addCreaturesToUser();
