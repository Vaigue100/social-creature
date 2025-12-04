const { Client } = require('pg');
const config = require('./db-config');

async function checkTable() {
  const client = new Client(config);

  try {
    await client.connect();

    // Get table structure
    const columns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'idle_game_state'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 idle_game_state Table Structure:\n');
    console.log('Column Name          Type                      Nullable  Default');
    console.log('─'.repeat(75));

    columns.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(20),
        row.data_type.padEnd(25),
        row.is_nullable.padEnd(9),
        row.column_default || ''
      );
    });

    // Check if there's any data
    const count = await client.query('SELECT COUNT(*) as count FROM idle_game_state');
    console.log('\n📈 Current Records:', count.rows[0].count);

    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'idle_game_state'
    `);

    console.log('\n🔍 Indexes:');
    indexes.rows.forEach(idx => {
      console.log('  ✓', idx.indexname);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
