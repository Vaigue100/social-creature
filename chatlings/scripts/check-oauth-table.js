/**
 * Check what's in the oauth_accounts table
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function checkOAuthTable() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    console.log('📊 OAuth Accounts Table:\n');

    // Get all oauth accounts
    const result = await client.query(`
      SELECT
        oa.id,
        oa.user_id,
        u.email,
        oa.provider,
        oa.refresh_token IS NOT NULL as has_refresh_token,
        oa.access_token IS NOT NULL as has_access_token,
        oa.token_expires_at,
        oa.last_used_at,
        oa.created_at
      FROM oauth_accounts oa
      LEFT JOIN users u ON oa.user_id = u.id
      ORDER BY oa.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No OAuth accounts found in database\n');
    } else {
      console.log(`Found ${result.rows.length} OAuth account(s):\n`);

      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Provider: ${row.provider}`);
        console.log(`   User: ${row.email || 'Unknown'}`);
        console.log(`   User ID: ${row.user_id}`);
        console.log(`   Has refresh token: ${row.has_refresh_token}`);
        console.log(`   Has access token: ${row.has_access_token}`);
        console.log(`   Token expires: ${row.token_expires_at || 'N/A'}`);
        console.log(`   Last used: ${row.last_used_at || 'Never'}`);
        console.log(`   Created: ${row.created_at}`);
        console.log();
      });
    }

    // Also check table structure
    console.log('📋 Table Structure:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'oauth_accounts'
      ORDER BY ordinal_position
    `);

    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } finally {
    await client.end();
  }
}

checkOAuthTable().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
