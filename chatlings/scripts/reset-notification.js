const { Client } = require('pg');
const config = require('./db-config');

async function resetNotification() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Show recent reward_claimed notifications
    const recent = await client.query(`
      SELECT id, user_id, notification_type, message, is_read, created_at
      FROM notifications
      WHERE notification_type = 'reward_claimed'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('Recent reward_claimed notifications:');
    console.log('─'.repeat(80));
    recent.rows.forEach((notif, index) => {
      console.log(`${index + 1}. ID: ${notif.id}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Read: ${notif.is_read}`);
      console.log(`   Created: ${notif.created_at}`);
      console.log('');
    });

    // Ask which notification to reset (for now, reset the most recent one)
    if (recent.rows.length > 0) {
      const notifId = recent.rows[0].id;

      console.log(`\nResetting notification ${notifId} to unread...\n`);

      await client.query(`
        UPDATE notifications
        SET is_read = false
        WHERE id = $1
      `, [notifId]);

      console.log('✅ Notification reset successfully!');
      console.log(`\nYou can now click the notification again to test the welcome animation.`);
    } else {
      console.log('No reward_claimed notifications found.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetNotification();
