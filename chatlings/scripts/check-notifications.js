const { Client } = require('pg');
const dbConfig = require('./db-config');

async function checkNotifications() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Get recent notifications
    const result = await client.query(`
      SELECT *
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n=== Recent Notifications ===\n');
    result.rows.forEach(row => {
      console.log(`Type: ${row.notification_type}`);
      console.log(`Title: ${row.title}`);
      console.log(`Message: ${row.message}`);
      console.log(`Link: ${row.link || '(no link)'}`);
      console.log(`Metadata: ${JSON.stringify(row.metadata, null, 2)}`);
      console.log(`Created: ${row.created_at}`);
      console.log('---\n');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkNotifications();
