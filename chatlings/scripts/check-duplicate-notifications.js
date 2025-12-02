const { Client } = require('pg');
const dbConfig = require('./db-config');

async function checkDuplicateNotifications() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Find notifications with the same message for the same user
    const duplicates = await client.query(`
      SELECT
        user_id,
        notification_type,
        message,
        COUNT(*) as count,
        ARRAY_AGG(id) as ids,
        ARRAY_AGG(is_read) as read_status,
        ARRAY_AGG(created_at ORDER BY created_at) as created_dates
      FROM notifications
      WHERE notification_type = 'reward_claimed'
      GROUP BY user_id, notification_type, message
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('\n=== DUPLICATE NOTIFICATIONS ===');
    console.log(`Found ${duplicates.rows.length} sets of duplicate notifications\n`);

    duplicates.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Message: "${row.message}"`);
      console.log(`   Count: ${row.count} duplicates`);
      console.log(`   Type: ${row.notification_type}`);
      console.log(`   IDs: ${row.ids.join(', ')}`);
      console.log(`   Read status: ${row.read_status.join(', ')}`);
      console.log(`   Created at: ${row.created_dates.map(d => new Date(d).toLocaleString()).join(', ')}`);
    });

    // Count total notifications per user
    const totals = await client.query(`
      SELECT
        user_id,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        COUNT(*) FILTER (WHERE notification_type = 'reward_claimed') as ambassador_count
      FROM notifications
      GROUP BY user_id
    `);

    console.log('\n\n=== NOTIFICATION TOTALS PER USER ===');
    totals.rows.forEach(row => {
      console.log(`User ${row.user_id.substring(0, 8)}: ${row.total_notifications} total, ${row.unread_count} unread, ${row.ambassador_count} ambassador`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkDuplicateNotifications();
