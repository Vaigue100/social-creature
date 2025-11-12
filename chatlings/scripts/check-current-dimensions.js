/**
 * Check current dimensions and their relationships
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkDimensions() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Current Dimensions\n' + '='.repeat(80));

    // Body Types
    const bodyTypes = await client.query('SELECT * FROM dim_body_type ORDER BY id');
    console.log(`\nBody Types (${bodyTypes.rows.length}):`);
    bodyTypes.rows.forEach(bt => {
      console.log(`  ${bt.id}. ${bt.body_type_name}`);
    });

    // Sizes
    const sizes = await client.query('SELECT * FROM dim_size_category ORDER BY id');
    console.log(`\nSize Categories (${sizes.rows.length}):`);
    sizes.rows.forEach(s => {
      console.log(`  ${s.id}. ${s.size_name}`);
    });

    // Activities
    const activities = await client.query('SELECT * FROM dim_social_activity ORDER BY id');
    console.log(`\nSocial Activities (${activities.rows.length}):`);
    activities.rows.forEach(a => {
      console.log(`  ${a.id}. ${a.activity_name}`);
    });

    // Moods
    const moods = await client.query('SELECT * FROM dim_social_mood ORDER BY id');
    console.log(`\nSocial Moods (${moods.rows.length}):`);
    moods.rows.forEach(m => {
      console.log(`  ${m.id}. ${m.mood_name}`);
    });

    // Colors
    const colors = await client.query('SELECT * FROM dim_color_scheme ORDER BY id');
    console.log(`\nColor Schemes (${colors.rows.length}):`);
    colors.rows.forEach(c => {
      console.log(`  ${c.id}. ${c.scheme_name}`);
    });

    // Quirks
    const quirks = await client.query('SELECT * FROM dim_special_quirk ORDER BY id');
    console.log(`\nSpecial Quirks (${quirks.rows.length}):`);
    quirks.rows.forEach(q => {
      console.log(`  ${q.id}. ${q.quirk_name}`);
    });

    // Check for existing junction tables
    console.log('\n' + '='.repeat(80));
    console.log('Junction Tables:\n');

    const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE '%_body_type%'
      ORDER BY tablename
    `);

    tables.rows.forEach(t => {
      console.log(`  - ${t.tablename}`);
    });

    // Check total prompts per body type
    console.log('\n' + '='.repeat(80));
    console.log('Prompts per Body Type:\n');

    const promptCounts = await client.query(`
      SELECT
        bt.body_type_name,
        COUNT(cp.id) as prompt_count
      FROM dim_body_type bt
      LEFT JOIN creature_prompts cp ON cp.body_type_id = bt.id
      GROUP BY bt.id, bt.body_type_name
      ORDER BY bt.id
    `);

    promptCounts.rows.forEach(pc => {
      console.log(`  ${pc.body_type_name}: ${pc.prompt_count} prompts`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDimensions();
