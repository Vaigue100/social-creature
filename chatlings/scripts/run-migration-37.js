/**
 * Migration 37: Engagement Tracking and Found Counts
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 37: Engagement Tracking and Found Counts\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '37_engagement_and_found_counts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('\n✅ Migration 37 completed successfully!');
    console.log('='.repeat(80));

    // Show what was added
    const userColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'last_active_at'
    `);

    console.log('\nColumns added to users table:');
    userColumns.rows.forEach(row => console.log(`  ✓ ${row.column_name} (${row.data_type})`));

    const rewardColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_rewards'
        AND column_name = 'found_count'
    `);

    console.log('\nColumns added to user_rewards table:');
    rewardColumns.rows.forEach(row => console.log(`  ✓ ${row.column_name} (${row.data_type})`));

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'daily_claims'
    `);

    if (tables.rows.length > 0) {
      console.log('\nTables created:');
      console.log('  ✓ daily_claims');
    }

    const achievements = await client.query(`
      SELECT achievement_key, title, requirement_value, requirement_type
      FROM achievements
      WHERE requirement_type LIKE 'found_rarity_%'
      ORDER BY requirement_type, requirement_value
    `);

    console.log('\nRarity-based find achievements:');
    achievements.rows.forEach(ach => {
      const rarity = ach.requirement_type.replace('found_rarity_', '');
      console.log(`  ✓ ${ach.title} (${ach.requirement_value} ${rarity}) - ${ach.achievement_key}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 37: Engagement Tracking and Found Counts');
console.log('================================================================================\n');

runMigration();
