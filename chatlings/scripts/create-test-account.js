/**
 * Create Test001 account with all chatlings assigned
 * Usage: node scripts/create-test-account.js
 */

const { Client } = require('pg');
const dbConfig = require('./db-config');

async function createTestAccount() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Create Test001 user
    console.log('\nCreating Test001 user...');
    const userResult = await client.query(`
      INSERT INTO users (username, email, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (username) DO UPDATE
      SET updated_at = CURRENT_TIMESTAMP
      RETURNING id, username
    `, ['Test001', 'test001@example.com']);

    const testUserId = userResult.rows[0].id;
    console.log(`✓ User created: ${userResult.rows[0].username} (${testUserId})`);

    // Get all active creatures
    console.log('\nFetching all active creatures...');
    const creaturesResult = await client.query(`
      SELECT id, creature_name FROM creatures WHERE is_active = TRUE
    `);

    console.log(`Found ${creaturesResult.rows.length} active creatures`);

    // Assign all creatures to Test001
    console.log('\nAssigning all creatures to Test001...');
    let assignedCount = 0;
    for (const creature of creaturesResult.rows) {
      const result = await client.query(`
        INSERT INTO user_rewards (user_id, creature_id, claimed_at, source)
        VALUES ($1, $2, CURRENT_TIMESTAMP, 'test_account')
        ON CONFLICT (user_id, creature_id) DO NOTHING
        RETURNING id
      `, [testUserId, creature.id]);

      if (result.rows.length > 0) {
        assignedCount++;
      }
    }

    console.log(`✓ Assigned ${assignedCount} creatures (${creaturesResult.rows.length - assignedCount} were already assigned)`);

    // Set a random creature as current chatling
    console.log('\nSetting random current chatling...');
    const currentChatlingResult = await client.query(`
      UPDATE users
      SET current_creature_id = (
        SELECT id FROM creatures WHERE is_active = TRUE ORDER BY RANDOM() LIMIT 1
      )
      WHERE id = $1
      RETURNING (SELECT creature_name FROM creatures WHERE id = users.current_creature_id)
    `, [testUserId]);

    console.log(`✓ Current chatling set to: ${currentChatlingResult.rows[0].creature_name}`);

    // Show final stats
    console.log('\n' + '='.repeat(60));
    console.log('Test Account Summary');
    console.log('='.repeat(60));

    const statsResult = await client.query(`
      SELECT
        u.username,
        u.email,
        c.creature_name as current_chatling,
        c.rarity_tier,
        COUNT(DISTINCT ur.creature_id) as total_chatlings,
        COUNT(DISTINCT CASE WHEN cr.rarity_tier = 'Legendary' THEN ur.creature_id END) as legendary_count,
        COUNT(DISTINCT CASE WHEN cr.rarity_tier = 'Epic' THEN ur.creature_id END) as epic_count,
        COUNT(DISTINCT CASE WHEN cr.rarity_tier = 'Rare' THEN ur.creature_id END) as rare_count,
        COUNT(DISTINCT CASE WHEN cr.rarity_tier = 'Uncommon' THEN ur.creature_id END) as uncommon_count,
        COUNT(DISTINCT CASE WHEN cr.rarity_tier = 'Common' THEN ur.creature_id END) as common_count
      FROM users u
      LEFT JOIN user_rewards ur ON u.id = ur.user_id
      LEFT JOIN creatures c ON u.current_creature_id = c.id
      LEFT JOIN creatures cr ON ur.creature_id = cr.id
      WHERE u.username = 'Test001'
      GROUP BY u.id, u.username, u.email, c.creature_name, c.rarity_tier
    `);

    const stats = statsResult.rows[0];
    console.log(`Username:         ${stats.username}`);
    console.log(`Email:            ${stats.email}`);
    console.log(`Current Chatling: ${stats.current_chatling} (${stats.rarity_tier})`);
    console.log(`\nCollection Stats:`);
    console.log(`  Total:      ${stats.total_chatlings}`);
    console.log(`  Legendary:  ${stats.legendary_count}`);
    console.log(`  Epic:       ${stats.epic_count}`);
    console.log(`  Rare:       ${stats.rare_count}`);
    console.log(`  Uncommon:   ${stats.uncommon_count}`);
    console.log(`  Common:     ${stats.common_count}`);
    console.log('='.repeat(60));

    console.log('\n✓ Test account created successfully!');
    console.log('\nYou can now login at: http://localhost:3000/user/login.html');
    console.log('Username: Test001');
    console.log('Note: This system uses username-only authentication (no password needed)');

  } catch (error) {
    console.error('Error creating test account:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
createTestAccount();
