/**
 * Migration 33: Login Tracking and Daily Login Achievements
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 33: Login Tracking and Daily Login Achievements\n');
    console.log('='.repeat(80));

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'sql', '33_login_tracking_achievements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('\n✅ Migration 33 completed successfully!');
    console.log('='.repeat(80));

    // Show what was added
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('last_login_at', 'login_streak_days', 'last_streak_date')
      ORDER BY column_name
    `);

    console.log('\nColumns added to users table:');
    columns.rows.forEach(row => console.log(`  ✓ ${row.column_name} (${row.data_type})`));

    const achievements = await client.query(`
      SELECT achievement_key, title, requirement_value
      FROM achievements
      WHERE requirement_type = 'login_streak'
      ORDER BY requirement_value
    `);

    console.log('\nLogin streak achievements:');
    achievements.rows.forEach(ach => {
      console.log(`  ✓ ${ach.title} (${ach.requirement_value} days) - ${ach.achievement_key}`);
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
console.log('Migration 33: Login Tracking and Daily Login Achievements');
console.log('================================================================================\n');

runMigration();
