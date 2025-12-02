/**
 * Check YouTube eligibility for a specific user
 */

const { Client } = require('pg');
const dbConfig = { ...require('./db-config'), database: 'chatlings' };

async function checkUser(email) {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    console.log(`🔍 Checking eligibility for ${email}\n`);

    // Check user details
    const user = await client.query(`
      SELECT
        id,
        email,
        last_login_at,
        last_active_at,
        created_at
      FROM users
      WHERE email = $1
    `, [email]);

    if (user.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }

    const userData = user.rows[0];
    console.log('✓ User found:');
    console.log('  ID:', userData.id);
    console.log('  Email:', userData.email);
    console.log('  Last login:', userData.last_login_at || 'Never');
    console.log('  Last active:', userData.last_active_at || 'Never');
    console.log('  Created:', userData.created_at);
    console.log();

    // Check OAuth
    const oauth = await client.query(`
      SELECT
        provider,
        refresh_token IS NOT NULL as has_refresh_token,
        access_token IS NOT NULL as has_access_token,
        token_expires_at,
        last_used_at,
        created_at
      FROM oauth_accounts
      WHERE user_id = $1
    `, [userData.id]);

    if (oauth.rows.length === 0) {
      console.log('❌ No OAuth accounts connected');
    } else {
      console.log('✓ OAuth accounts:');
      oauth.rows.forEach(row => {
        console.log(`  Provider: ${row.provider}`);
        console.log(`  Has refresh token: ${row.has_refresh_token}`);
        console.log(`  Has access token: ${row.has_access_token}`);
        console.log(`  Token expires: ${row.token_expires_at || 'N/A'}`);
        console.log(`  Last used: ${row.last_used_at || 'Never'}`);
        console.log();
      });
    }

    // Check eligibility
    console.log('📊 Eligibility Check:');

    const youtubeOAuth = oauth.rows.find(r => r.provider === 'youtube');
    if (!youtubeOAuth) {
      console.log('❌ No YouTube OAuth connected');
    } else if (!youtubeOAuth.has_refresh_token) {
      console.log('❌ YouTube connected but no refresh token');
    } else {
      console.log('✓ YouTube OAuth with refresh token');
    }

    if (!userData.last_active_at) {
      console.log('❌ No last_active_at timestamp (user needs to login or claim daily box)');
    } else {
      const hoursSinceActive = (Date.now() - new Date(userData.last_active_at)) / (1000 * 60 * 60);
      console.log(`✓ Last active: ${hoursSinceActive.toFixed(1)} hours ago`);

      if (hoursSinceActive > 24) {
        console.log('❌ User not active within last 24 hours');
      } else {
        console.log('✓ User active within last 24 hours');
      }
    }

    // Final verdict
    console.log('\n🎯 Final Verdict:');
    const eligible = youtubeOAuth &&
                     youtubeOAuth.has_refresh_token &&
                     userData.last_active_at &&
                     (Date.now() - new Date(userData.last_active_at)) < (24 * 60 * 60 * 1000);

    if (eligible) {
      console.log('✅ User IS eligible for YouTube checking');
    } else {
      console.log('❌ User is NOT eligible for YouTube checking');
      console.log('\nReasons:');
      if (!youtubeOAuth) console.log('  - No YouTube OAuth');
      if (youtubeOAuth && !youtubeOAuth.has_refresh_token) console.log('  - No refresh token');
      if (!userData.last_active_at) console.log('  - No last_active_at timestamp');
      if (userData.last_active_at && (Date.now() - new Date(userData.last_active_at)) > (24 * 60 * 60 * 1000)) {
        console.log('  - Not active within last 24 hours');
      }

      console.log('\n💡 How to fix:');
      if (!youtubeOAuth || !youtubeOAuth.has_refresh_token) {
        console.log('  1. Go to http://localhost:3000/user/integrations.html');
        console.log('  2. Connect/reconnect YouTube account');
      }
      if (!userData.last_active_at || (Date.now() - new Date(userData.last_active_at)) > (24 * 60 * 60 * 1000)) {
        console.log('  1. Login to the app');
        console.log('  2. Or claim daily box at http://localhost:3000/user/daily-box.html');
      }
    }

  } finally {
    await client.end();
  }
}

const email = process.argv[2] || 'xbarneyroddis@gmail.com';
checkUser(email).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
