const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', '28_team_members.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration 28: Add team member slots...');
    await client.query(sql);

    console.log('✓ Migration 28 completed successfully!');
    console.log('\nUsers can now have a team of 5 chatlings:');
    console.log('  1. Team Leader (current_creature_id)');
    console.log('  2. Director of Influence (team_member_2_id)');
    console.log('  3. Director of Chatling Resources (team_member_3_id)');
    console.log('  4. Chief of Engagement (team_member_4_id)');
    console.log('  5. Head of Community (team_member_5_id)');

  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
