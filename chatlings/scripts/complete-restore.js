const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = require('./db-config');

async function restoreCompleteBackup() {
  const backupPath = path.join(__dirname, '..', 'chatlings-complete-backup.json');

  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found:', backupPath);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const pool = new Pool(dbConfig);

  try {
    console.log('Restoring complete database backup...');
    console.log(`Source: ${backup.database} (${backup.timestamp})`);
    console.log(`Target: ${dbConfig.host}/${dbConfig.database}\n`);

    // Get table dependencies to restore in correct order
    const depsResult = await pool.query(`
      WITH RECURSIVE fk_tree AS (
        -- Start with tables that have no dependencies
        SELECT
          t.tablename,
          0 as level
        FROM pg_tables t
        WHERE t.schemaname = 'public'
          AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class tc ON c.conrelid = tc.oid
            WHERE tc.relname = t.tablename
              AND c.contype = 'f'
          )

        UNION

        -- Add tables that depend on already processed tables
        SELECT
          child.tablename,
          parent.level + 1
        FROM pg_tables child
        JOIN pg_constraint c ON c.conrelid = child.tablename::regclass
        JOIN pg_class parent_class ON c.confrelid = parent_class.oid
        JOIN fk_tree parent ON parent.tablename = parent_class.relname
        WHERE child.schemaname = 'public'
      )
      SELECT DISTINCT tablename, MAX(level) as level
      FROM fk_tree
      GROUP BY tablename
      ORDER BY level, tablename
    `);

    const tableOrder = depsResult.rows.map(r => r.tablename);
    console.log(`Determined restore order for ${tableOrder.length} tables\n`);

    // Restore tables in dependency order
    console.log(`Restoring tables...\n`);

    for (const tableName of tableOrder) {
      const rows = backup.tables[tableName];

      if (!rows || rows.length === 0) {
        console.log(`⊘ ${tableName}: 0 rows (skipped)`);
        continue;
      }

      // Truncate table
      await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);

      // Insert rows
      const columns = Object.keys(rows[0]);
      const values = rows.map((row, i) => {
        const placeholders = columns.map((col, j) => `$${i * columns.length + j + 1}`).join(', ');
        return `(${placeholders})`;
      }).join(', ');

      const allValues = rows.flatMap(row => columns.map(col => row[col]));

      await pool.query(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values}`,
        allValues
      );

      console.log(`✓ ${tableName}: ${rows.length} rows restored`);
    }

    // Restore sequences
    if (backup.sequences && backup.sequences.length > 0) {
      console.log(`\nRestoring ${backup.sequences.length} sequences...\n`);

      for (const seq of backup.sequences) {
        try {
          await pool.query(`SELECT setval('${seq.name}', ${seq.last_value}, true)`);
          console.log(`✓ ${seq.name}: set to ${seq.last_value}`);
        } catch (e) {
          console.log(`⚠ ${seq.name}: ${e.message}`);
        }
      }
    }

    // Restore functions
    if (backup.functions && backup.functions.length > 0) {
      console.log(`\nRestoring ${backup.functions.length} functions...\n`);

      for (const func of backup.functions) {
        try {
          await pool.query(func.definition);
          console.log(`✓ ${func.name}`);
        } catch (e) {
          console.log(`⚠ ${func.name}: ${e.message}`);
        }
      }
    }

    // Restore views
    if (backup.views && backup.views.length > 0) {
      console.log(`\nRestoring ${backup.views.length} views...\n`);

      for (const view of backup.views) {
        try {
          await pool.query(`CREATE OR REPLACE VIEW ${view.name} AS ${view.definition}`);
          console.log(`✓ ${view.name}`);
        } catch (e) {
          console.log(`⚠ ${view.name}: ${e.message}`);
        }
      }
    }

    console.log('\n✓ Database restore complete!');

  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

restoreCompleteBackup();
