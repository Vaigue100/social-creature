/**
 * Check recently created creatures
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkCreatures() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check total creatures
    const totalResult = await client.query('SELECT COUNT(*) FROM creatures');
    console.log(`Total creatures in database: ${totalResult.rows[0].count}`);

    // Check active creatures
    const activeResult = await client.query('SELECT COUNT(*) FROM creatures WHERE is_active = true');
    console.log(`Active creatures: ${activeResult.rows[0].count}\n`);

    // Show recent creatures with details
    console.log('Recent creatures:');
    console.log('='.repeat(80));
    const recentResult = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.perchance_image_id,
        c.selected_image,
        c.is_active,
        bt.body_type_name,
        cp.prompt
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

    recentResult.rows.forEach(row => {
      console.log(`\nCreature: ${row.creature_name} (ID: ${row.id})`);
      console.log(`  Body Type: ${row.body_type_name}`);
      console.log(`  Image: ${row.selected_image}`);
      console.log(`  Active: ${row.is_active}`);
      console.log(`  Perchance ID: ${row.perchance_image_id}`);
      console.log(`  Prompt: ${row.prompt?.substring(0, 80)}...`);
    });

    // Check if any user has claimed creatures
    console.log('\n' + '='.repeat(80));
    console.log('User collections:');
    const userRewardsResult = await client.query('SELECT COUNT(*) FROM user_rewards');
    console.log(`Total claimed creatures: ${userRewardsResult.rows[0].count}`);

    // Check users
    const usersResult = await client.query('SELECT id, username FROM users LIMIT 5');
    console.log(`\nUsers in database: ${usersResult.rows.length}`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkCreatures();
