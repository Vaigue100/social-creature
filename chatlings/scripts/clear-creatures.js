/**
 * Clear all creatures to start fresh
 * Keeps prompts intact
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function clearCreatures() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Count current creatures
    const countResult = await client.query('SELECT COUNT(*) FROM creatures');
    console.log(`Current creatures: ${countResult.rows[0].count}\n`);

    console.log('Clearing all creatures...');

    // First, clear foreign key references
    await client.query('UPDATE users SET current_creature_id = NULL');

    // Clear user_rewards (collected creatures)
    await client.query('DELETE FROM user_rewards');

    // Clear creature social traits
    await client.query('DELETE FROM creature_social_traits');

    // Clear creature friendships
    await client.query('DELETE FROM creature_friendships');

    // Delete all creatures
    await client.query('DELETE FROM creatures');

    console.log('✅ All creatures cleared!\n');

    // Verify
    const verifyResult = await client.query('SELECT COUNT(*) FROM creatures');
    console.log(`Remaining creatures: ${verifyResult.rows[0].count}`);

    // Check prompts are still there
    const promptsResult = await client.query('SELECT COUNT(*) FROM creature_prompts');
    console.log(`Prompts still in database: ${promptsResult.rows[0].count}\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

clearCreatures();
