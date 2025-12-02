const { Client } = require('pg');
const dbConfig = require('./db-config');

async function cleanDuplicateNotifications() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Delete duplicate notifications, keeping only the oldest one for each unique message
    const result = await client.query(`
      DELETE FROM notifications
      WHERE id IN (
        SELECT id
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY user_id, notification_type, message
              ORDER BY created_at ASC
            ) as rn
          FROM notifications
          WHERE notification_type = 'reward_claimed'
        ) sub
        WHERE rn > 1
      )
    `);

    console.log(`✅ Deleted ${result.rowCount} duplicate notifications`);
    console.log('   (Kept the oldest notification for each unique reward)\n');

    // Show remaining notification counts
    const totals = await client.query(`
      SELECT
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        COUNT(*) FILTER (WHERE notification_type = 'reward_claimed') as ambassador_count
      FROM notifications
    `);

    console.log('📊 Remaining notifications:');
    console.log(`   Total: ${totals.rows[0].total_notifications}`);
    console.log(`   Unread: ${totals.rows[0].unread_count}`);
    console.log(`   Ambassador: ${totals.rows[0].ambassador_count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

cleanDuplicateNotifications();
