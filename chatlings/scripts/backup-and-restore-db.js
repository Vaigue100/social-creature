/**
 * Backup local database and restore to Azure
 * This script dumps the local database schema and data, then restores to Azure
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

async function getTableSchema(client, tableName) {
  const result = await client.query(`
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getTableData(client, tableName) {
  const result = await client.query(`SELECT * FROM ${tableName}`);
  return result.rows;
}

async function getAllTables(client) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name);
}

async function getDDL(client) {
  console.log('Fetching database schema...');

  // Get all table creation statements
  const tables = await getAllTables(client);
  const ddlStatements = [];

  for (const table of tables) {
    const result = await client.query(`
      SELECT
        'CREATE TABLE ' || quote_ident(table_name) || ' (' ||
        string_agg(
          quote_ident(column_name) || ' ' ||
          data_type ||
          CASE WHEN character_maximum_length IS NOT NULL
            THEN '(' || character_maximum_length || ')'
            ELSE ''
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL
            THEN ' DEFAULT ' || column_default
            ELSE ''
          END,
          ', '
        ) || ');' as ddl
      FROM information_schema.columns
      WHERE table_name = $1
      GROUP BY table_name
    `, [table]);

    if (result.rows.length > 0) {
      ddlStatements.push(result.rows[0].ddl);
    }
  }

  return ddlStatements;
}

async function exportDatabase() {
  const sourceClient = new Client(sourceConfig);

  try {
    console.log('================================================================================');
    console.log('Database Backup and Restore');
    console.log('================================================================================\n');

    console.log('Step 1: Connecting to local database...');
    await sourceClient.connect();
    console.log('✓ Connected to local database\n');

    console.log('Step 2: Exporting schema and data...');
    const tables = await getAllTables(sourceClient);
    console.log(`Found ${tables.length} tables\n`);

    const backup = {
      tables: {},
      metadata: {
        date: new Date().toISOString(),
        source: 'localhost',
        tableCount: tables.length
      }
    };

    for (const table of tables) {
      process.stdout.write(`  Exporting ${table}... `);
      const data = await getTableData(sourceClient, table);
      backup.tables[table] = data;
      console.log(`✓ (${data.length} rows)`);
    }

    const backupPath = path.join(__dirname, '..', 'chatlings-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`\n✓ Backup saved to: ${backupPath}`);
    console.log(`  Size: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB\n`);

    return backupPath;

  } finally {
    await sourceClient.end();
  }
}

async function restoreDatabase(backupPath) {
  const targetClient = new Client(targetConfig);

  try {
    console.log('Step 3: Connecting to Azure database...');
    await targetClient.connect();
    console.log('✓ Connected to Azure database\n');

    console.log('Step 4: Loading backup...');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`  Tables: ${backup.metadata.tableCount}`);
    console.log(`  Created: ${backup.metadata.date}\n`);

    console.log('Step 5: Restoring data...');

    // Disable triggers and constraints during restore
    await targetClient.query('SET session_replication_role = replica;');

    const tables = Object.keys(backup.tables);
    for (const table of tables) {
      const data = backup.tables[table];

      if (data.length === 0) {
        console.log(`  Skipping ${table} (empty)`);
        continue;
      }

      process.stdout.write(`  Restoring ${table}... `);

      // Clear existing data
      await targetClient.query(`TRUNCATE TABLE ${table} CASCADE`);

      // Insert data in batches
      const columns = Object.keys(data[0]);
      const columnNames = columns.join(', ');

      for (const row of data) {
        const values = columns.map((col, idx) => `$${idx + 1}`).join(', ');
        const params = columns.map(col => row[col]);

        await targetClient.query(
          `INSERT INTO ${table} (${columnNames}) VALUES (${values})`,
          params
        );
      }

      console.log(`✓ (${data.length} rows)`);
    }

    // Re-enable triggers and constraints
    await targetClient.query('SET session_replication_role = DEFAULT;');

    console.log('\n================================================================================');
    console.log('✓ Database restore completed successfully!');
    console.log('================================================================================\n');

  } finally {
    await targetClient.end();
  }
}

async function main() {
  try {
    const backupPath = await exportDatabase();
    await restoreDatabase(backupPath);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
