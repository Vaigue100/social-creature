/**
 * Migration 44: Add Rizz & Glow Stats
 *
 * Adds two new stats to user_rewards table:
 * - Rizz: Auto-calculated from found_count, increases with duplicate finds
 * - Glow: Manually adjusted stat for future game mechanics
 *
 * Both stats range from -10 to +10 and affect social interaction trait rolls
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 44: Add Rizz & Glow Stats\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '44_add_rizz_glow_stats.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('\n✅ Migration 44 completed successfully!');
    console.log('='.repeat(80));

    // Show what was added
    const columns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_rewards'
        AND column_name IN ('rizz', 'glow')
      ORDER BY column_name
    `);

    console.log('\nColumns added to user_rewards table:');
    columns.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type}, default: ${row.column_default})`);
    });

    // Show index
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'user_rewards'
        AND indexname = 'idx_user_rewards_stats'
    `);

    console.log('\nIndexes created:');
    indexes.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });

    // Show stats
    const stats = await client.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE rizz > 0) as records_with_rizz,
        MAX(rizz) as max_rizz,
        AVG(rizz) as avg_rizz,
        SUM(found_count) as total_finds
      FROM user_rewards
    `);

    console.log('\nBackfill Statistics:');
    const stat = stats.rows[0];
    console.log(`  Total user_rewards records: ${stat.total_records}`);
    console.log(`  Records with Rizz > 0: ${stat.records_with_rizz}`);
    console.log(`  Max Rizz value: ${stat.max_rizz || 0}`);
    console.log(`  Average Rizz: ${parseFloat(stat.avg_rizz || 0).toFixed(2)}`);
    console.log(`  Total creature finds: ${stat.total_finds || 0}`);

    // Sample records
    const samples = await client.query(`
      SELECT
        user_id,
        creature_id,
        found_count,
        rizz,
        glow
      FROM user_rewards
      WHERE found_count > 1
      ORDER BY rizz DESC
      LIMIT 5
    `);

    if (samples.rows.length > 0) {
      console.log('\nSample records with Rizz (top 5):');
      samples.rows.forEach(row => {
        console.log(`  User ${row.user_id.substring(0, 8)}...: found_count=${row.found_count}, rizz=${row.rizz}, glow=${row.glow}`);
      });
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration().catch(console.error);
