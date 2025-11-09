const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔧 Restructuring body types and dimensions...\n');

    // Read and execute migration file
    const migrationPath = path.join(__dirname, 'sql', 'restructure_body_types.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Changes applied:');
    console.log('   • Updated existing body types (removed "cute")');
    console.log('   • Added 3 new body types: Robot, Zombie, Gothic');
    console.log('   • Added body_type_id to all dimension tables');
    console.log('   • Added Robot-specific traits (colors, activities, moods, quirks)');
    console.log('   • Added Zombie-specific traits (colors, activities, moods, quirks)');
    console.log('   • Added Gothic-specific traits (colors, activities, moods, quirks)');
    console.log('   • Dropped incorrect dim_aesthetic table');
    console.log('   • Existing traits (NULL body_type_id) apply to all cute body types\n');

    // Show summary
    const bodyTypes = await client.query('SELECT id, body_type_name FROM dim_body_type ORDER BY id');
    console.log('🎭 Body Types:');
    bodyTypes.rows.forEach(bt => {
      console.log(`   ${bt.id}. ${bt.body_type_name}`);
    });

    console.log('\n📊 Trait Distribution:');
    const colorCount = await client.query('SELECT body_type_id, COUNT(*) as count FROM dim_color_scheme GROUP BY body_type_id ORDER BY body_type_id NULLS FIRST');
    console.log('   Colors:');
    for (const row of colorCount.rows) {
      const btName = row.body_type_id ? bodyTypes.rows.find(bt => bt.id === row.body_type_id)?.body_type_name : 'All Cute Types';
      console.log(`     - ${btName}: ${row.count} options`);
    }

    const activityCount = await client.query('SELECT body_type_id, COUNT(*) as count FROM dim_social_activity GROUP BY body_type_id ORDER BY body_type_id NULLS FIRST');
    console.log('   Activities:');
    for (const row of activityCount.rows) {
      const btName = row.body_type_id ? bodyTypes.rows.find(bt => bt.id === row.body_type_id)?.body_type_name : 'All Cute Types';
      console.log(`     - ${btName}: ${row.count} options`);
    }

    const moodCount = await client.query('SELECT body_type_id, COUNT(*) as count FROM dim_social_mood GROUP BY body_type_id ORDER BY body_type_id NULLS FIRST');
    console.log('   Moods:');
    for (const row of moodCount.rows) {
      const btName = row.body_type_id ? bodyTypes.rows.find(bt => bt.id === row.body_type_id)?.body_type_name : 'All Cute Types';
      console.log(`     - ${btName}: ${row.count} options`);
    }

    const quirkCount = await client.query('SELECT body_type_id, COUNT(*) as count FROM dim_special_quirk GROUP BY body_type_id ORDER BY body_type_id NULLS FIRST');
    console.log('   Quirks:');
    for (const row of quirkCount.rows) {
      const btName = row.body_type_id ? bodyTypes.rows.find(bt => bt.id === row.body_type_id)?.body_type_name : 'All Cute Types';
      console.log(`     - ${btName}: ${row.count} options`);
    }

    console.log('\n💡 Next step: Run generate-body-type-variants.js to create CSV for Perchance\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

runMigration();
