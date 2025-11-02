/**
 * Verify Chatlings Database
 * Checks if database exists and shows detailed status
 */

const { Client } = require('pg');
const config = require('./db-config');

async function verifyDatabase() {
  console.log('========================================');
  console.log('Chatlings Database Verification');
  console.log('========================================\n');

  // Connect to postgres default database
  const client = new Client({
    ...config,
    database: 'postgres'
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected to PostgreSQL\n');

    // Check if chatlings database exists
    console.log('Checking for chatlings database...');
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'chatlings'"
    );

    if (dbCheck.rows.length === 0) {
      console.log('✗ Database "chatlings" NOT FOUND\n');
      console.log('The database was not created. Possible reasons:');
      console.log('1. Setup script encountered an error');
      console.log('2. PostgreSQL connection failed');
      console.log('3. Insufficient permissions\n');
      console.log('Try running setup again with:');
      console.log('  cd chatlings\\scripts');
      console.log('  node setup-database.js\n');
      await client.end();
      return;
    }

    console.log('✓ Database "chatlings" exists\n');
    await client.end();

    // Connect to chatlings database
    const chatlingsClient = new Client({
      ...config,
      database: 'chatlings'
    });

    await chatlingsClient.connect();
    console.log('✓ Connected to chatlings database\n');

    // Check tables
    console.log('Checking tables...');
    const tableCheck = await chatlingsClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`Found ${tableCheck.rows.length} tables:\n`);
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    if (tableCheck.rows.length === 0) {
      console.log('\n✗ No tables found! The database is empty.\n');
      console.log('Run setup again to create tables and import data.\n');
      await chatlingsClient.end();
      return;
    }

    // Check data counts
    console.log('\n========================================');
    console.log('Data Summary');
    console.log('========================================\n');

    const tables = [
      'dim_species',
      'dim_subspecies',
      'dim_colouring',
      'dim_style',
      'dim_mood',
      'dim_motion_type',
      'dim_elemental_affinity',
      'dim_environment',
      'creatures',
      'lore_game',
      'lore_species'
    ];

    for (const table of tables) {
      try {
        const result = await chatlingsClient.query(`SELECT COUNT(*) FROM ${table}`);
        const count = result.rows[0].count;
        console.log(`${table.padEnd(30)}: ${count}`);
      } catch (err) {
        console.log(`${table.padEnd(30)}: Error - ${err.message}`);
      }
    }

    // Check rarity distribution
    console.log('\n========================================');
    console.log('Creature Rarity Distribution');
    console.log('========================================\n');

    try {
      const rarityCheck = await chatlingsClient.query(`
        SELECT rarity_tier, COUNT(*) as count
        FROM creatures
        GROUP BY rarity_tier
        ORDER BY
          CASE rarity_tier
            WHEN 'Legendary' THEN 1
            WHEN 'Epic' THEN 2
            WHEN 'Rare' THEN 3
            WHEN 'Uncommon' THEN 4
            WHEN 'Common' THEN 5
          END
      `);

      if (rarityCheck.rows.length > 0) {
        rarityCheck.rows.forEach(row => {
          console.log(`${row.rarity_tier.padEnd(15)}: ${row.count}`);
        });
      } else {
        console.log('No creatures found');
      }
    } catch (err) {
      console.log('Error checking rarity:', err.message);
    }

    console.log('\n========================================');
    console.log('✓ Database verification complete!');
    console.log('========================================\n');

    // pgAdmin instructions
    console.log('To view in pgAdmin:');
    console.log('1. Refresh your server connection (right-click → Refresh)');
    console.log('2. Expand: Servers → PostgreSQL → Databases');
    console.log('3. You should see "chatlings"');
    console.log('4. Right-click "chatlings" → Refresh if not visible\n');

    await chatlingsClient.end();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Password in .env file is correct');
    console.error('3. Port 5432 is available');
    console.error('4. User "postgres" has sufficient permissions\n');

    try {
      await client.end();
    } catch (e) {
      // Ignore
    }
  }
}

verifyDatabase();
