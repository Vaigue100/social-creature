const { Client } = require('pg');
const dbConfig = require('./db-config');

async function checkTable() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Get table structure
    const structure = await client.query(`
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_rewards'
      ORDER BY ordinal_position
    `);

    console.log('\n=== user_rewards table structure ===');
    structure.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}, default: ${row.column_default}, nullable: ${row.is_nullable}`);
    });

    // Check if there's a sequence for the id column
    const sequences = await client.query(`
      SELECT * FROM information_schema.sequences
      WHERE sequence_name LIKE 'user_rewards%'
    `);

    console.log('\n=== Sequences ===');
    console.log(sequences.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
