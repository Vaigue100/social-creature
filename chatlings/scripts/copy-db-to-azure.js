/**
 * Copy local database schema and data to Azure
 * Step 1: Use pg_dump style schema export
 * Step 2: Restore data
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Source database (local)
const sourceConfig = {
  host: 'localhost',
  port: 5432,
  database: 'chatlings',
  user: 'postgres',
  password: '!1Swagger!1'
};

// Target database (Azure)
const targetConfig = {
  host: 'psql-chatlings-dev-lyg7hq.postgres.database.azure.com',
  port: 5432,
  database: 'chatlings',
  user: 'chatlings_admin',
  password: '!1Greengoblin!1',
  ssl: { rejectUnauthorized: false }
};

async function main() {
  const sourceClient = new Client(sourceConfig);
  const targetClient = new Client(targetConfig);

  try {
    console.log('================================================================================');
    console.log('Copy Database from Local to Azure');
    console.log('================================================================================\n');

    console.log('Step 1: Connecting to local database...');
    await sourceClient.connect();
    console.log('✓ Connected\n');

    console.log('Step 2: Connecting to Azure database...');
    await targetClient.connect();
    console.log('✓ Connected\n');

    console.log('Step 3: Getting list of tables...');
    const tablesResult = await sourceClient.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tables = tablesResult.rows.map(r => r.tablename);
    console.log(`Found ${tables.length} tables\n`);

    console.log('Step 4: Copying schema...');
    for (const table of tables) {
      process.stdout.write(`  Creating ${table}... `);

      // Get CREATE TABLE statement
      const createResult = await sourceClient.query(`
        SELECT
          'CREATE TABLE IF NOT EXISTS ' || quote_ident($1) || ' (' ||
          string_agg(
            quote_ident(column_name) || ' ' ||
            CASE
              WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
              WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE
              WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
              ELSE ''
            END,
            ', '
          ) || ');' as ddl
        FROM information_schema.columns
        WHERE table_name = $1
        GROUP BY table_name
      `, [table]);

      if (createResult.rows.length > 0) {
        await targetClient.query(createResult.rows[0].ddl);
        console.log('✓');
      } else {
        console.log('skipped');
      }
    }

    console.log('\nStep 5: Copying data...');
    // Disable constraints during copy
    await targetClient.query('SET session_replication_role = replica;');

    for (const table of tables) {
      // Get data
      const dataResult = await sourceClient.query(`SELECT * FROM ${table}`);

      if (dataResult.rows.length === 0) {
        console.log(`  Skipping ${table} (empty)`);
        continue;
      }

      process.stdout.write(`  Copying ${table}... `);

      // Clear target table
      try {
        await targetClient.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (e) {
        // Table might not exist yet, that's ok
      }

      // Insert data
      const columns = Object.keys(dataResult.rows[0]);
      const columnNames = columns.join(', ');

      for (const row of dataResult.rows) {
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = columns.map(col => row[col]);

        await targetClient.query(
          `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }

      console.log(`✓ (${dataResult.rows.length} rows)`);
    }

    // Re-enable constraints
    await targetClient.query('SET session_replication_role = DEFAULT;');

    console.log('\n================================================================================');
    console.log('✓ Database copy completed successfully!');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
