/**
 * Apply complete schema to Azure and restore data
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const targetConfig = {
  host: 'psql-chatlings-dev-lyg7hq.postgres.database.azure.com',
  port: 5432,
  database: 'chatlings',
  user: 'chatlings_admin',
  password: '!1Greengoblin!1',
  ssl: { rejectUnauthorized: false }
};

async function applySchema() {
  const client = new Client(targetConfig);

  try {
    console.log('================================================================================');
    console.log('Apply Schema to Azure Database');
    console.log('================================================================================\n');

    console.log('Connecting to Azure...');
    await client.connect();
    console.log('✓ Connected\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'azure-complete-schema.sql');
    console.log('Reading schema file...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`✓ Loaded (${(schema.length / 1024).toFixed(2)} KB)\n`);

    // Drop all existing tables first
    console.log('Dropping existing tables...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    console.log('✓ Clean slate\n');

    // No extensions needed - using explicit UUIDs in application code

    // Apply schema
    console.log('Creating tables, indexes, and constraints...');
    await client.query(schema);
    console.log('✓ Schema applied\n');

    // Verify
    const result = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log('================================================================================');
    console.log(`✓ Schema created successfully!`);
    console.log(`  Tables: ${result.rows[0].table_count}`);
    console.log('================================================================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

applySchema().catch(err => {
  console.error(err);
  process.exit(1);
});
