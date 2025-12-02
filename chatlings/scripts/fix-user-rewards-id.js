const { Client } = require('pg');
const dbConfig = require('./db-config');

async function fixTable() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Try to enable pgcrypto extension (for gen_random_uuid)
    console.log('\nEnabling pgcrypto extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      console.log('✓ Extension enabled');
    } catch (err) {
      console.log('Note: pgcrypto might already be enabled or not needed');
    }

    // Alter the user_rewards table to add UUID generation as default
    console.log('\nAdding UUID generation default to user_rewards.id...');
    await client.query(`
      ALTER TABLE user_rewards
      ALTER COLUMN id SET DEFAULT gen_random_uuid()
    `);
    console.log('✓ Default value set');

    // Verify the change
    const result = await client.query(`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'user_rewards' AND column_name = 'id'
    `);

    console.log('\nVerification:');
    console.log('user_rewards.id default:', result.rows[0].column_default);

    console.log('\n✅ Fix complete! The user_rewards table will now auto-generate UUIDs.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixTable();
