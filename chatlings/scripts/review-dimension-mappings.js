/**
 * Review all dimension-to-body-type junction table mappings
 * Shows what dimensions are currently linked to each body type
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function reviewMappings() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Dimension-to-Body-Type Mappings\n' + '='.repeat(80));

    // Get all body types
    const bodyTypes = await client.query('SELECT * FROM dim_body_type ORDER BY id');

    for (const bt of bodyTypes.rows) {
      console.log(`\n${bt.body_type_name} (ID: ${bt.id})`);
      console.log('-'.repeat(80));

      // Size Categories
      const sizes = await client.query(`
        SELECT sc.size_name
        FROM dim_size_category sc
        JOIN dim_size_category_body_types scbt ON sc.id = scbt.size_id
        WHERE scbt.body_type_id = $1
        ORDER BY sc.id
      `, [bt.id]);
      console.log(`  Sizes (${sizes.rows.length}): ${sizes.rows.map(s => s.size_name).join(', ') || 'NONE'}`);

      // Activities
      const activities = await client.query(`
        SELECT sa.activity_name
        FROM dim_social_activity sa
        JOIN dim_social_activity_body_types sabt ON sa.id = sabt.activity_id
        WHERE sabt.body_type_id = $1
        ORDER BY sa.id
        LIMIT 10
      `, [bt.id]);
      const activityCount = await client.query(`
        SELECT COUNT(*) as count
        FROM dim_social_activity_body_types
        WHERE body_type_id = $1
      `, [bt.id]);
      console.log(`  Activities (${activityCount.rows[0].count}): ${activities.rows.map(a => a.activity_name).join(', ') || 'NONE'}...`);

      // Moods
      const moods = await client.query(`
        SELECT sm.mood_name
        FROM dim_social_mood sm
        JOIN dim_social_mood_body_types smbt ON sm.id = smbt.mood_id
        WHERE smbt.body_type_id = $1
        ORDER BY sm.id
        LIMIT 10
      `, [bt.id]);
      const moodCount = await client.query(`
        SELECT COUNT(*) as count
        FROM dim_social_mood_body_types
        WHERE body_type_id = $1
      `, [bt.id]);
      console.log(`  Moods (${moodCount.rows[0].count}): ${moods.rows.map(m => m.mood_name).join(', ') || 'NONE'}...`);

      // Colors
      const colors = await client.query(`
        SELECT cs.scheme_name
        FROM dim_color_scheme cs
        JOIN dim_color_scheme_body_types csbt ON cs.id = csbt.color_scheme_id
        WHERE csbt.body_type_id = $1
        ORDER BY cs.id
        LIMIT 10
      `, [bt.id]);
      const colorCount = await client.query(`
        SELECT COUNT(*) as count
        FROM dim_color_scheme_body_types
        WHERE body_type_id = $1
      `, [bt.id]);
      console.log(`  Colors (${colorCount.rows[0].count}): ${colors.rows.map(c => c.scheme_name).join(', ') || 'NONE'}...`);

      // Quirks
      const quirks = await client.query(`
        SELECT sq.quirk_name
        FROM dim_special_quirk sq
        JOIN dim_special_quirk_body_types sqbt ON sq.id = sqbt.quirk_id
        WHERE sqbt.body_type_id = $1
        ORDER BY sq.id
        LIMIT 10
      `, [bt.id]);
      const quirkCount = await client.query(`
        SELECT COUNT(*) as count
        FROM dim_special_quirk_body_types
        WHERE body_type_id = $1
      `, [bt.id]);
      console.log(`  Quirks (${quirkCount.rows[0].count}): ${quirks.rows.map(q => q.quirk_name).join(', ') || 'NONE'}...`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\nSummary:');
    console.log('  - Body types with NO sizes mapped will not generate prompts');
    console.log('  - Body types with NO activities/moods/colors/quirks will have incomplete prompts');
    console.log('  - Review the mappings above and update as needed');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

reviewMappings();
