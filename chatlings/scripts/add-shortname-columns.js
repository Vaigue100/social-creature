/**
 * Add shortname columns to creatures table
 */

const { Client } = require('pg');

const config = { ...require('./db-config'), database: 'chatlings' };

async function addColumns() {
  const client = new Client(config);

  try {
    console.log('========================================');
    console.log('Adding Shortname Columns');
    console.log('========================================\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    console.log('Adding columns to creatures table...\n');

    // Add creature_shortname column
    try {
      await client.query(`
        ALTER TABLE creatures
        ADD COLUMN IF NOT EXISTS creature_shortname VARCHAR(50)
      `);
      console.log('✓ Added creature_shortname column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  - creature_shortname already exists');
      } else {
        throw err;
      }
    }

    // Add language_base column
    try {
      await client.query(`
        ALTER TABLE creatures
        ADD COLUMN IF NOT EXISTS language_base VARCHAR(30)
      `);
      console.log('✓ Added language_base column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  - language_base already exists');
      } else {
        throw err;
      }
    }

    // Add pronunciation column
    try {
      await client.query(`
        ALTER TABLE creatures
        ADD COLUMN IF NOT EXISTS pronunciation VARCHAR(100)
      `);
      console.log('✓ Added pronunciation column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  - pronunciation already exists');
      } else {
        throw err;
      }
    }

    // Add vibe column
    try {
      await client.query(`
        ALTER TABLE creatures
        ADD COLUMN IF NOT EXISTS vibe VARCHAR(50)
      `);
      console.log('✓ Added vibe column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  - vibe already exists');
      } else {
        throw err;
      }
    }

    // Add index on shortname for faster lookups
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_creatures_shortname
        ON creatures(creature_shortname)
      `);
      console.log('✓ Added index on creature_shortname');
    } catch (err) {
      console.log('  - Index may already exist');
    }

    console.log('\n========================================');
    console.log('Columns added successfully!');
    console.log('========================================\n');

    // Verify columns
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'creatures'
      AND column_name IN ('creature_shortname', 'language_base', 'pronunciation', 'vibe')
      ORDER BY ordinal_position
    `);

    console.log('Verified columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}${row.character_maximum_length ? '(' + row.character_maximum_length + ')' : ''})`);
    });

    console.log('\nNext: Run generate-shortnames.js to generate shortnames');

    await client.end();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

addColumns();
