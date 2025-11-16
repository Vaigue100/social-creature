/**
 * Remove creatures from user's collection
 * Can filter by platform (Manual, YouTube, etc.)
 */

const { Client } = require('pg');
const readline = require('readline');
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

// USER EMAIL - Change this to your Google account email
const USER_EMAIL = 'xbarneyroddis@gmail.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function removeCreatures() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Find user by email
    const userResult = await client.query("SELECT id, username, email FROM users WHERE email = $1", [USER_EMAIL]);

    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${USER_EMAIL} not found!`);
      console.log('\nAvailable users:');
      const allUsers = await client.query('SELECT username, email FROM users ORDER BY username');
      allUsers.rows.forEach(u => console.log(`  - ${u.username} (${u.email})`));
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`Found user: ${userResult.rows[0].username} (${userResult.rows[0].email})\n`);

    // Get platform statistics
    const platformStats = await client.query(`
      SELECT platform, COUNT(*) as count
      FROM user_rewards
      WHERE user_id = $1
      GROUP BY platform
      ORDER BY platform
    `, [userId]);

    if (platformStats.rows.length === 0) {
      console.log('❌ No creatures in collection!');
      process.exit(0);
    }

    console.log('Current collection by platform:');
    platformStats.rows.forEach(stat => {
      console.log(`  ${stat.platform}: ${stat.count} creatures`);
    });
    console.log('');

    // Ask which platform to remove
    console.log('Select platform to remove:');
    console.log('  1. Manual (added by script)');
    console.log('  2. YouTube (claimed from likes)');
    console.log('  3. All platforms');
    console.log('  4. Cancel');
    console.log('');

    const choice = await question('Enter choice (1-4): ');

    let platformFilter = null;
    let confirmMessage = '';

    switch (choice.trim()) {
      case '1':
        platformFilter = 'Manual';
        confirmMessage = 'manually added';
        break;
      case '2':
        platformFilter = 'YouTube';
        confirmMessage = 'YouTube claimed';
        break;
      case '3':
        platformFilter = null;
        confirmMessage = 'ALL';
        break;
      case '4':
        console.log('\n✓ Cancelled');
        rl.close();
        process.exit(0);
      default:
        console.log('\n❌ Invalid choice');
        rl.close();
        process.exit(1);
    }

    // Get count of creatures to remove
    let countQuery, countParams;
    if (platformFilter) {
      countQuery = `
        SELECT COUNT(*) as count
        FROM user_rewards
        WHERE user_id = $1 AND platform = $2
      `;
      countParams = [userId, platformFilter];
    } else {
      countQuery = `
        SELECT COUNT(*) as count
        FROM user_rewards
        WHERE user_id = $1
      `;
      countParams = [userId];
    }

    const countResult = await client.query(countQuery, countParams);
    const removeCount = parseInt(countResult.rows[0].count);

    if (removeCount === 0) {
      console.log(`\n✓ No ${confirmMessage} creatures to remove!`);
      rl.close();
      process.exit(0);
    }

    // Confirm removal
    console.log(`\n⚠️  This will remove ${removeCount} ${confirmMessage} creatures from your collection!`);
    const confirm = await question('Are you sure? (yes/no): ');

    if (confirm.trim().toLowerCase() !== 'yes') {
      console.log('\n✓ Cancelled');
      rl.close();
      process.exit(0);
    }

    // Perform removal
    let deleteQuery, deleteParams;
    if (platformFilter) {
      deleteQuery = `
        DELETE FROM user_rewards
        WHERE user_id = $1 AND platform = $2
      `;
      deleteParams = [userId, platformFilter];
    } else {
      deleteQuery = `
        DELETE FROM user_rewards
        WHERE user_id = $1
      `;
      deleteParams = [userId];
    }

    const deleteResult = await client.query(deleteQuery, deleteParams);

    console.log(`\n✅ Removed ${deleteResult.rowCount} ${confirmMessage} creatures from your collection!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await client.end();
  }
}

removeCreatures();
