const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkNotificationTypes() {
  const client = new Client(config);

  try {
    await client.connect();

    // Get constraint definition
    const result = await client.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'notifications'
        AND con.conname = 'check_notification_type'
    `);

    console.log('Notification Type Constraint:');
    console.log(result.rows);

  } finally {
    await client.end();
  }
}

checkNotificationTypes();
