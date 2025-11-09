const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

/**
 * Analyze body_type_id distribution in dimension tables
 */

async function analyzeDimensions() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔍 Analyzing dimension tables...\n');

    // Get body types
    const bodyTypes = await client.query('SELECT id, body_type_name FROM dim_body_type ORDER BY id');
    console.log('📋 Body Types:');
    bodyTypes.rows.forEach(bt => {
      console.log(`   ${bt.id}. ${bt.body_type_name}`);
    });
    console.log('');

    // Analyze each dimension table
    const tables = [
      { name: 'dim_color_scheme', idCol: 'id', nameCol: 'scheme_name' },
      { name: 'dim_social_activity', idCol: 'id', nameCol: 'activity_name' },
      { name: 'dim_social_mood', idCol: 'id', nameCol: 'mood_name' },
      { name: 'dim_special_quirk', idCol: 'id', nameCol: 'quirk_name' }
    ];

    for (const table of tables) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📊 ${table.name.toUpperCase()}`);
      console.log('='.repeat(70));

      // Count by body_type_id
      const counts = await client.query(`
        SELECT
          body_type_id,
          COUNT(*) as count
        FROM ${table.name}
        GROUP BY body_type_id
        ORDER BY body_type_id NULLS FIRST
      `);

      console.log('\nDistribution:');
      for (const row of counts.rows) {
        if (row.body_type_id === null) {
          console.log(`   NULL (all cute types): ${row.count} traits`);
        } else {
          const bt = bodyTypes.rows.find(b => b.id === parseInt(row.body_type_id));
          console.log(`   ${bt.body_type_name}: ${row.count} traits`);
        }
      }

      // Show sample NULL traits
      const nullTraits = await client.query(`
        SELECT ${table.nameCol}
        FROM ${table.name}
        WHERE body_type_id IS NULL
        LIMIT 5
      `);

      if (nullTraits.rows.length > 0) {
        console.log('\n   Sample NULL traits (apply to all cute types):');
        nullTraits.rows.forEach(t => {
          console.log(`     - ${t[table.nameCol]}`);
        });
      }

      // Show specific body type traits
      const specificTraits = await client.query(`
        SELECT ${table.nameCol}, body_type_id
        FROM ${table.name}
        WHERE body_type_id IS NOT NULL
        ORDER BY body_type_id
        LIMIT 5
      `);

      if (specificTraits.rows.length > 0) {
        console.log('\n   Sample body-type-specific traits:');
        specificTraits.rows.forEach(t => {
          const bt = bodyTypes.rows.find(b => b.id === parseInt(t.body_type_id));
          console.log(`     - ${t[table.nameCol]} (${bt.body_type_name})`);
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

analyzeDimensions();
