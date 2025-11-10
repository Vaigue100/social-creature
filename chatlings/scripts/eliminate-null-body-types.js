const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

/**
 * Eliminate NULL body_type_id values by duplicating rows
 * Each NULL row becomes 8 rows (one for each cute body type)
 */

async function eliminateNulls() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔧 Eliminating NULL body_type_id values...\n');

    // Step 1: Show current state
    console.log('📋 Current state (BEFORE):');
    const beforeStats = await getStats(client);
    displayStats(beforeStats);

    // Step 2: Run migration SQL
    console.log('\n🔄 Running migration...');
    const migrationPath = path.join(__dirname, 'sql', 'eliminate_null_body_types.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Migration complete\n');

    // Step 3: Show updated state
    console.log('📋 Updated state (AFTER):');
    const afterStats = await getStats(client);
    displayStats(afterStats);

    // Step 4: Show changes summary
    console.log('\n📊 Changes Summary:');
    console.log(`   Color Schemes: ${beforeStats.colors.total} → ${afterStats.colors.total} rows (+${afterStats.colors.total - beforeStats.colors.total})`);
    console.log(`   Social Activities: ${beforeStats.activities.total} → ${afterStats.activities.total} rows (+${afterStats.activities.total - beforeStats.activities.total})`);
    console.log(`   Social Moods: ${beforeStats.moods.total} → ${afterStats.moods.total} rows (+${afterStats.moods.total - beforeStats.moods.total})`);
    console.log(`   Special Quirks: ${beforeStats.quirks.total} → ${afterStats.quirks.total} rows (+${afterStats.quirks.total - beforeStats.quirks.total})`);

    // Step 5: Verify no NULLs remain
    console.log('\n✅ Verification:');
    const nullCheck = await checkForNulls(client);
    if (nullCheck.hasNulls) {
      console.log('   ❌ ERROR: Still found NULL values!');
      console.log(`      Color Schemes: ${nullCheck.colors} NULLs`);
      console.log(`      Social Activities: ${nullCheck.activities} NULLs`);
      console.log(`      Social Moods: ${nullCheck.moods} NULLs`);
      console.log(`      Special Quirks: ${nullCheck.quirks} NULLs`);
    } else {
      console.log('   ✅ No NULL body_type_id values found!');
      console.log('   ✅ All dimension rows now have explicit body types');
    }

    // Step 6: Show sample data
    console.log('\n📝 Sample data (showing duplicated rows):');
    await showSampleDuplicates(client);

    console.log('\n✨ Migration complete!\n');
    console.log('💡 Changes made:');
    console.log('   • All NULL body_type_id values eliminated');
    console.log('   • Universal traits duplicated for all 8 cute body types');
    console.log('   • Specific traits (Robot, Zombie, Gothic) unchanged');
    console.log('   • Added NOT NULL constraints to prevent future NULLs');
    console.log('   • Added composite unique constraints (name + body_type_id)\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

/**
 * Get statistics for all dimension tables
 */
async function getStats(client) {
  const stats = {};

  // Color schemes
  const colors = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE body_type_id IS NULL) as nulls,
      COUNT(*) FILTER (WHERE body_type_id IS NOT NULL) as with_body_type
    FROM dim_color_scheme
  `);
  stats.colors = colors.rows[0];

  // Social activities
  const activities = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE body_type_id IS NULL) as nulls,
      COUNT(*) FILTER (WHERE body_type_id IS NOT NULL) as with_body_type
    FROM dim_social_activity
  `);
  stats.activities = activities.rows[0];

  // Social moods
  const moods = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE body_type_id IS NULL) as nulls,
      COUNT(*) FILTER (WHERE body_type_id IS NOT NULL) as with_body_type
    FROM dim_social_mood
  `);
  stats.moods = moods.rows[0];

  // Special quirks
  const quirks = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE body_type_id IS NULL) as nulls,
      COUNT(*) FILTER (WHERE body_type_id IS NOT NULL) as with_body_type
    FROM dim_special_quirk
  `);
  stats.quirks = quirks.rows[0];

  return stats;
}

/**
 * Display statistics
 */
function displayStats(stats) {
  console.log('   Color Schemes:');
  console.log(`     Total: ${stats.colors.total}`);
  console.log(`     NULL body_type_id: ${stats.colors.nulls}`);
  console.log(`     With body_type_id: ${stats.colors.with_body_type}`);

  console.log('   Social Activities:');
  console.log(`     Total: ${stats.activities.total}`);
  console.log(`     NULL body_type_id: ${stats.activities.nulls}`);
  console.log(`     With body_type_id: ${stats.activities.with_body_type}`);

  console.log('   Social Moods:');
  console.log(`     Total: ${stats.moods.total}`);
  console.log(`     NULL body_type_id: ${stats.moods.nulls}`);
  console.log(`     With body_type_id: ${stats.moods.with_body_type}`);

  console.log('   Special Quirks:');
  console.log(`     Total: ${stats.quirks.total}`);
  console.log(`     NULL body_type_id: ${stats.quirks.nulls}`);
  console.log(`     With body_type_id: ${stats.quirks.with_body_type}`);
}

/**
 * Check for any remaining NULLs
 */
async function checkForNulls(client) {
  const colors = await client.query('SELECT COUNT(*) as count FROM dim_color_scheme WHERE body_type_id IS NULL');
  const activities = await client.query('SELECT COUNT(*) as count FROM dim_social_activity WHERE body_type_id IS NULL');
  const moods = await client.query('SELECT COUNT(*) as count FROM dim_social_mood WHERE body_type_id IS NULL');
  const quirks = await client.query('SELECT COUNT(*) as count FROM dim_special_quirk WHERE body_type_id IS NULL');

  const colorCount = parseInt(colors.rows[0].count);
  const activityCount = parseInt(activities.rows[0].count);
  const moodCount = parseInt(moods.rows[0].count);
  const quirkCount = parseInt(quirks.rows[0].count);

  return {
    hasNulls: colorCount > 0 || activityCount > 0 || moodCount > 0 || quirkCount > 0,
    colors: colorCount,
    activities: activityCount,
    moods: moodCount,
    quirks: quirkCount
  };
}

/**
 * Show sample duplicated rows
 */
async function showSampleDuplicates(client) {
  console.log('\n   Example: "Pastel Dreams" color scheme (now duplicated for each cute body type):');
  const colorSample = await client.query(`
    SELECT cs.scheme_name, bt.body_type_name, cs.body_type_id
    FROM dim_color_scheme cs
    JOIN dim_body_type bt ON cs.body_type_id = bt.id
    WHERE cs.scheme_name = 'Pastel Dreams'
    ORDER BY cs.body_type_id
    LIMIT 10
  `);

  if (colorSample.rows.length > 0) {
    colorSample.rows.forEach(row => {
      console.log(`     • ${row.scheme_name} (${row.body_type_name}, ID: ${row.body_type_id})`);
    });
  }

  console.log('\n   Example: "Sipping coffee" activity (now duplicated for each cute body type):');
  const activitySample = await client.query(`
    SELECT sa.activity_name, bt.body_type_name, sa.body_type_id
    FROM dim_social_activity sa
    JOIN dim_body_type bt ON sa.body_type_id = bt.id
    WHERE sa.activity_name = 'Sipping coffee'
    ORDER BY sa.body_type_id
    LIMIT 10
  `);

  if (activitySample.rows.length > 0) {
    activitySample.rows.forEach(row => {
      console.log(`     • ${row.activity_name} (${row.body_type_name}, ID: ${row.body_type_id})`);
    });
  }
}

eliminateNulls();
