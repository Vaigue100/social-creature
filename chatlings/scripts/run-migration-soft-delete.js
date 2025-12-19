const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addSoftDeleteColumns() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔄 Adding soft delete columns to creatures table...\n');

    // Add is_deleted and deleted_at columns
    await client.query(`
      ALTER TABLE creatures
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    `);

    console.log('✅ Soft delete columns added successfully\n');

    // Create index for faster queries filtering out deleted creatures
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_creatures_not_deleted
      ON creatures (is_deleted)
      WHERE is_deleted = false;
    `);

    console.log('✅ Index created for soft delete queries\n');

    // Show sample of table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'creatures'
        AND column_name IN ('is_deleted', 'deleted_at', 'is_active')
      ORDER BY ordinal_position;
    `);

    console.log('Relevant creature table columns:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addSoftDeleteColumns();
