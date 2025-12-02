const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = require('./db-config');

async function createCompleteBackup() {
  const pool = new Pool(dbConfig);

  try {
    console.log('Creating complete database backup...\n');

    const backup = {
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      tables: {},
      functions: [],
      views: [],
      sequences: []
    };

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`Found ${tablesResult.rows.length} tables\n`);

    // Backup each table's data
    for (const { tablename } of tablesResult.rows) {
      const data = await pool.query(`SELECT * FROM ${tablename}`);
      backup.tables[tablename] = data.rows;
      console.log(`✓ ${tablename}: ${data.rows.length} rows`);
    }

    // Get all functions with their definitions
    const functionsResult = await pool.query(`
      SELECT
        p.proname as name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname
    `);

    console.log(`\nFound ${functionsResult.rows.length} functions`);
    backup.functions = functionsResult.rows;
    functionsResult.rows.forEach(f => console.log(`✓ ${f.name}`));

    // Get all views with their definitions
    const viewsResult = await pool.query(`
      SELECT
        viewname as name,
        definition
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);

    console.log(`\nFound ${viewsResult.rows.length} views`);
    backup.views = viewsResult.rows;
    viewsResult.rows.forEach(v => console.log(`✓ ${v.name}`));

    // Get all sequences
    const sequencesResult = await pool.query(`
      SELECT
        sequence_name as name,
        start_value,
        minimum_value,
        maximum_value,
        increment
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);

    console.log(`\nFound ${sequencesResult.rows.length} sequences`);

    // Get current values for sequences
    for (const seq of sequencesResult.rows) {
      try {
        const result = await pool.query(`SELECT last_value FROM ${seq.name}`);
        seq.last_value = result.rows[0].last_value;
      } catch (e) {
        seq.last_value = seq.start_value;
      }
    }

    backup.sequences = sequencesResult.rows;
    sequencesResult.rows.forEach(s => console.log(`✓ ${s.name} (current: ${s.last_value})`));

    // Save backup
    const backupPath = path.join(__dirname, '..', 'chatlings-complete-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`\n✓ Complete backup saved to: ${backupPath}`);
    console.log(`  File size: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createCompleteBackup();
