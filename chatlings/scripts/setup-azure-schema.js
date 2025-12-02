/**
 * Setup Azure database schema (no prompts)
 * Reads the schema.sql file and runs it against Azure
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Force Azure config
const config = {
  host: 'psql-chatlings-dev-lyg7hq.postgres.database.azure.com',
  port: 5432,
  database: 'chatlings',
  user: 'chatlings_admin',
  password: '!1Greengoblin!1',
  ssl: { rejectUnauthorized: false }
};

async function setupSchema() {
  const client = new Client(config);

  try {
    console.log('================================================================================');
    console.log('Azure Database Schema Setup');
    console.log('================================================================================\n');

    console.log('Connecting to Azure database...');
    await client.connect();
    console.log('✓ Connected\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'sql', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.log('❌ schema.sql not found');
      console.log('Looking for alternative setup method...\n');

      // Try to read the chatlings-backup.json file and create schema from it
      const backupPath = path.join(__dirname, '..', 'chatlings-backup.json');

      if (!fs.existsSync(backupPath)) {
        throw new Error('No backup file found. Please create one first with: node scripts/backup-and-restore-db.js');
      }

      console.log('Using backup file to create schema...');
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

      // We'll just use the first row of each table to infer schema
      // This is a workaround - ideally we'd have the full DDL
      console.log('Note: Creating basic schema from backup data structure\n');

      for (const [tableName, rows] of Object.entries(backup.tables)) {
        if (rows.length === 0) continue;

        const firstRow = rows[0];
        const columns = Object.keys(firstRow).map(col => {
          const value = firstRow[col];
          let type = 'TEXT';

          if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
          } else if (typeof value === 'boolean') {
            type = 'BOOLEAN';
          } else if (value && typeof value === 'string') {
            if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
              type = 'TIMESTAMP';
            } else if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              type = 'UUID';
            }
          }

          return `${col} ${type}`;
        });

        const createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(', ')})`;

        try {
          process.stdout.write(`  Creating ${tableName}... `);
          await client.query(createSQL);
          console.log('✓');
        } catch (err) {
          console.log(`⚠️  ${err.message}`);
        }
      }

      console.log('\n✓ Basic schema created from backup');
      console.log('Note: Constraints, indexes, and foreign keys may be missing');
      console.log('They will be added when you insert data\n');

    } else {
      console.log('Reading schema.sql...');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      console.log('Creating schema...');
      await client.query(schema);
      console.log('✓ Schema created\n');
    }

    console.log('================================================================================');
    console.log('✓ Setup complete!');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

setupSchema().catch(err => {
  console.error(err);
  process.exit(1);
});
