/**
 * Fix schema issues with column sizes
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function fixSchema() {
  const client = new Client(config);

  try {
    console.log('Connecting to chatlings database...');
    await client.connect();
    console.log('✓ Connected\n');

    console.log('Fixing column sizes...');

    // Increase size of lore_type column
    await client.query(`
      ALTER TABLE lore_game
      ALTER COLUMN lore_type TYPE VARCHAR(100)
    `);
    console.log('✓ Fixed lore_game.lore_type column size');

    // Increase size of platform column in user_encounters
    await client.query(`
      ALTER TABLE user_encounters
      ALTER COLUMN platform TYPE VARCHAR(100)
    `);
    console.log('✓ Fixed user_encounters.platform column size');

    console.log('\n✓ Schema fixed!\n');

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

fixSchema();
