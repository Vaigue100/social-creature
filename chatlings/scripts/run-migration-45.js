/**
 * Migration 45: Hierarchical Team System
 *
 * Creates new team_positions table and migrates existing team data
 * from flat structure (team_member_X columns) to hierarchical structure
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 45: Hierarchical Team System\n');
    console.log('='.repeat(80));

    // Step 1: Run SQL migration
    console.log('\n📋 Step 1: Creating tables and constraints...');
    const sqlPath = path.join(__dirname, 'sql', '45_hierarchical_teams.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Tables created successfully');

    // Step 2: Check existing team data
    console.log('\n📋 Step 2: Analyzing existing team data...');
    const existingTeams = await client.query(`
      SELECT
        id as user_id,
        current_creature_id,
        team_member_2_id,
        team_member_3_id,
        team_member_4_id,
        team_member_5_id
      FROM users
      WHERE current_creature_id IS NOT NULL
         OR team_member_2_id IS NOT NULL
         OR team_member_3_id IS NOT NULL
         OR team_member_4_id IS NOT NULL
         OR team_member_5_id IS NOT NULL
    `);

    console.log(`Found ${existingTeams.rows.length} users with existing teams`);

    // Step 3: Migrate existing team data
    console.log('\n📋 Step 3: Migrating existing teams to hierarchical structure...');

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of existingTeams.rows) {
      try {
        await migrateUserTeam(client, user);
        migratedCount++;
      } catch (error) {
        console.error(`  ❌ Failed to migrate team for user ${user.user_id}: ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`\n✅ Migrated ${migratedCount} teams`);
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} teams due to errors`);
    }

    // Step 4: Show statistics
    console.log('\n📊 Migration Statistics:');

    const positionStats = await client.query(`
      SELECT
        position_type,
        level,
        COUNT(*) as count
      FROM team_positions
      GROUP BY position_type, level
      ORDER BY level, position_type
    `);

    console.log('\nPositions created by type:');
    positionStats.rows.forEach(row => {
      console.log(`  Level ${row.level} - ${row.position_type}: ${row.count}`);
    });

    const teamSizes = await client.query(`
      SELECT
        COUNT(*) as team_size,
        COUNT(DISTINCT user_id) as num_teams
      FROM (
        SELECT user_id, COUNT(*) as count
        FROM team_positions
        GROUP BY user_id
      ) as sizes
      GROUP BY count
      ORDER BY count DESC
    `);

    console.log('\nTeam size distribution:');
    teamSizes.rows.forEach(row => {
      console.log(`  ${row.team_size} members: ${row.num_teams} teams`);
    });

    // Step 5: Sample team
    console.log('\n📝 Sample migrated team:');
    const sampleTeam = await client.query(`
      SELECT
        tp.position_type,
        tp.level,
        c.creature_name,
        c.rarity_tier,
        bt.body_type_name,
        parent_tp.position_type as parent_position
      FROM team_positions tp
      JOIN creatures c ON tp.creature_id = c.id
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      LEFT JOIN team_positions parent_tp ON tp.parent_position_id = parent_tp.id
      WHERE tp.user_id = (
        SELECT user_id FROM team_positions LIMIT 1
      )
      ORDER BY tp.level, tp.position_type
    `);

    if (sampleTeam.rows.length > 0) {
      console.log(`\nUser's team structure:`);
      sampleTeam.rows.forEach(row => {
        const indent = '  '.repeat(row.level - 1);
        const parentInfo = row.parent_position ? ` (under ${row.parent_position})` : '';
        console.log(`${indent}Level ${row.level} - ${row.position_type}${parentInfo}: ${row.creature_name} (${row.rarity_tier}, ${row.body_type_name || 'No body type'})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration 45 completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

/**
 * Migrate a single user's team from flat to hierarchical structure
 */
async function migrateUserTeam(client, user) {
  const positions = [];

  // Map old team positions to new hierarchy
  // Old: current_creature_id (architect), team_member_2-5
  // New: architect -> prime -> [analyst, engineer, clerk] -> [assistants]

  // Level 1: Architect (was current_creature_id)
  if (user.current_creature_id) {
    positions.push({
      creature_id: user.current_creature_id,
      position_type: 'architect',
      level: 1,
      parent_id: null
    });
  }

  // Level 2: Prime Chatling (was team_member_2_id)
  if (user.team_member_2_id && user.current_creature_id) {
    positions.push({
      creature_id: user.team_member_2_id,
      position_type: 'prime',
      level: 2,
      parent_ref: 'architect' // Will be resolved to actual ID
    });
  }

  // Level 3: Department heads (was team_member_3, 4, 5)
  const level3Positions = ['analyst', 'engineer', 'clerk'];
  const level3CreatureIds = [
    user.team_member_3_id,
    user.team_member_4_id,
    user.team_member_5_id
  ].filter(id => id !== null);

  level3CreatureIds.forEach((creatureId, index) => {
    if (index < level3Positions.length && user.team_member_2_id) {
      positions.push({
        creature_id: creatureId,
        position_type: level3Positions[index],
        level: 3,
        parent_ref: 'prime'
      });
    }
  });

  // Insert positions in order
  const positionMap = {}; // Track inserted position IDs

  for (const pos of positions) {
    // Check if creature exists and is not deleted
    const creatureCheck = await client.query(
      'SELECT id FROM creatures WHERE id = $1 AND is_deleted = false',
      [pos.creature_id]
    );

    if (creatureCheck.rows.length === 0) {
      console.log(`  ⚠️  Skipping deleted/missing creature: ${pos.creature_id}`);
      continue;
    }

    // Resolve parent ID if needed
    let parentId = null;
    if (pos.parent_ref) {
      parentId = positionMap[pos.parent_ref];
      if (!parentId) {
        console.log(`  ⚠️  Parent ${pos.parent_ref} not found for ${pos.position_type}`);
        continue;
      }
    }

    // Insert position
    const result = await client.query(`
      INSERT INTO team_positions (
        user_id,
        creature_id,
        position_type,
        level,
        parent_position_id
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, position_type) DO NOTHING
      RETURNING id
    `, [user.user_id, pos.creature_id, pos.position_type, pos.level, parentId]);

    if (result.rows.length > 0) {
      positionMap[pos.position_type] = result.rows[0].id;
    }
  }

  return positions.length;
}

// Run the migration
runMigration().catch(console.error);
