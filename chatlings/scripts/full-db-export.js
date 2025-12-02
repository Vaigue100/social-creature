/**
 * Complete database export with proper schema
 * Exports full DDL including types, constraints, indexes, and sequences
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sourceConfig = {
  host: 'localhost',
  port: 5432,
  database: 'chatlings',
  user: 'postgres',
  password: '!1Swagger!1'
};

async function exportFullSchema() {
  const client = new Client(sourceConfig);

  try {
    await client.connect();
    console.log('================================================================================');
    console.log('Complete Database Schema Export');
    console.log('================================================================================\n');

    let ddl = '';

    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tables = tablesResult.rows.map(r => r.tablename);

    console.log(`Found ${tables.length} tables\n`);

    // Export sequences
    console.log('Exporting sequences...');
    const seqResult = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    for (const row of seqResult.rows) {
      const seqName = row.sequence_name;
      ddl += `-- Sequence: ${seqName}\n`;
      ddl += `CREATE SEQUENCE IF NOT EXISTS ${seqName};\n\n`;
    }

    // Export tables with full column definitions
    console.log('Exporting table schemas...');
    for (const table of tables) {
      process.stdout.write(`  ${table}... `);

      // Get column definitions
      const colResult = await client.query(`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const columns = colResult.rows.map(col => {
        let def = `  ${col.column_name} `;

        // Build type
        if (col.data_type === 'ARRAY') {
          def += 'TEXT[]';  // Default array type
        } else if (col.data_type === 'character varying') {
          def += `VARCHAR${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`;
        } else if (col.data_type === 'numeric') {
          def += `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
        } else if (col.data_type === 'timestamp without time zone') {
          def += 'TIMESTAMP';
        } else if (col.data_type === 'USER-DEFINED') {
          def += 'UUID';
        } else {
          def += col.data_type.toUpperCase();
        }

        // Nullable
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }

        // Default
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }

        return def;
      });

      ddl += `-- Table: ${table}\n`;
      ddl += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;
      ddl += `CREATE TABLE ${table} (\n`;
      ddl += columns.join(',\n');
      ddl += '\n);\n\n';

      console.log('✓');
    }

    // Export primary keys
    console.log('\nExporting primary keys...');
    const pkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);

    const pkByTable = {};
    pkResult.rows.forEach(row => {
      if (!pkByTable[row.table_name]) {
        pkByTable[row.table_name] = [];
      }
      pkByTable[row.table_name].push(row.column_name);
    });

    for (const [table, cols] of Object.entries(pkByTable)) {
      ddl += `ALTER TABLE ${table} ADD PRIMARY KEY (${cols.join(', ')});\n`;
    }
    ddl += '\n';

    // Export indexes
    console.log('Exporting indexes...');
    const idxResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `);

    for (const row of idxResult.rows) {
      ddl += `${row.indexdef};\n`;
    }
    ddl += '\n';

    // Export foreign keys
    console.log('Exporting foreign keys...');
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    for (const row of fkResult.rows) {
      ddl += `ALTER TABLE ${row.table_name} ADD CONSTRAINT ${row.constraint_name} `;
      ddl += `FOREIGN KEY (${row.column_name}) `;
      ddl += `REFERENCES ${row.foreign_table_name}(${row.foreign_column_name});\n`;
    }

    // Save to file
    const schemaPath = path.join(__dirname, '..', 'azure-complete-schema.sql');
    fs.writeFileSync(schemaPath, ddl);

    console.log('\n================================================================================');
    console.log(`✓ Schema exported to: ${schemaPath}`);
    console.log(`  Size: ${(ddl.length / 1024).toFixed(2)} KB`);
    console.log('================================================================================\n');

  } finally {
    await client.end();
  }
}

exportFullSchema().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
