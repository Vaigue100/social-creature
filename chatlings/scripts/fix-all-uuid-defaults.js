const { Client } = require('pg');
const dbConfig = require('./db-config');

async function fixAllTables() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Enable pgcrypto extension
    console.log('\nEnabling pgcrypto extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      console.log('✓ Extension enabled');
    } catch (err) {
      console.log('Note: pgcrypto might already be enabled');
    }

    // Find all UUID columns without defaults
    const result = await client.query(`
      SELECT
        table_name,
        column_name,
        column_default
      FROM information_schema.columns
      WHERE
        data_type = 'uuid'
        AND column_name = 'id'
        AND is_nullable = 'NO'
        AND (column_default IS NULL OR column_default = 'null')
      ORDER BY table_name
    `);

    console.log(`\nFound ${result.rows.length} tables with UUID id columns missing defaults:\n`);

    for (const row of result.rows) {
      console.log(`Fixing ${row.table_name}.${row.column_name}...`);

      await client.query(`
        ALTER TABLE ${row.table_name}
        ALTER COLUMN ${row.column_name} SET DEFAULT gen_random_uuid()
      `);

      console.log(`  ✓ ${row.table_name}.${row.column_name} now has default gen_random_uuid()`);
    }

    // Verify all changes
    console.log('\n=== Verification ===');
    const verify = await client.query(`
      SELECT
        table_name,
        column_name,
        column_default
      FROM information_schema.columns
      WHERE
        data_type = 'uuid'
        AND column_name = 'id'
        AND column_default LIKE '%gen_random_uuid%'
      ORDER BY table_name
    `);

    console.log(`\n${verify.rows.length} tables now have UUID generation:\n`);
    verify.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}.id`);
    });

    console.log('\n✅ All UUID defaults fixed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAllTables();
