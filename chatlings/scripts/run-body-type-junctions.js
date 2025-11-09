const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔧 Adding body type junction tables...\n');

    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'sql', 'add_body_type_junctions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Changes applied:');
    console.log('   • Created 4 junction tables for many-to-many relationships');
    console.log('   • Migrated existing NULL traits → all cute types (1-8)');
    console.log('   • Migrated specific traits → their assigned body type');
    console.log('   • Added indexes for performance\n');

    // Show summary
    console.log('📊 Junction Table Counts:');

    const colorCount = await client.query('SELECT COUNT(*) as count FROM dim_color_scheme_body_types');
    console.log(`   • Color Schemes: ${colorCount.rows[0].count} assignments`);

    const activityCount = await client.query('SELECT COUNT(*) as count FROM dim_social_activity_body_types');
    console.log(`   • Activities: ${activityCount.rows[0].count} assignments`);

    const moodCount = await client.query('SELECT COUNT(*) as count FROM dim_social_mood_body_types');
    console.log(`   • Moods: ${moodCount.rows[0].count} assignments`);

    const quirkCount = await client.query('SELECT COUNT(*) as count FROM dim_special_quirk_body_types');
    console.log(`   • Quirks: ${quirkCount.rows[0].count} assignments`);

    console.log('\n💡 Examples of how traits are now assigned:\n');

    // Show some examples
    const colorExample = await client.query(`
      SELECT cs.scheme_name, array_agg(bt.body_type_name ORDER BY bt.id) as body_types
      FROM dim_color_scheme cs
      JOIN dim_color_scheme_body_types csbt ON cs.id = csbt.color_scheme_id
      JOIN dim_body_type bt ON csbt.body_type_id = bt.id
      GROUP BY cs.id, cs.scheme_name
      LIMIT 3
    `);

    console.log('   Color Scheme Examples:');
    colorExample.rows.forEach(row => {
      console.log(`     "${row.scheme_name}" → ${row.body_types.join(', ')}`);
    });

    console.log('\n📝 Next steps:');
    console.log('   1. You can now assign traits to multiple body types');
    console.log('   2. Use scripts/manage-trait-assignments.js to modify assignments');
    console.log('   3. Old body_type_id columns kept for backward compatibility\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

runMigration();
