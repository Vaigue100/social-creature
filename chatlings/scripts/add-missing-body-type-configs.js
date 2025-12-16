const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addMissingBodyTypeConfigs() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔄 Adding missing body types to frame config...\n');

    // Insert all body types that don't have config entries
    const result = await client.query(`
      INSERT INTO body_type_frame_config (
        body_type_name,
        image_width_percent,
        image_max_width_px,
        image_max_height_vh,
        image_min_width_px,
        image_margin_top_px,
        info_panel_bg_color,
        frame_width_percent,
        frame_height_percent
      )
      SELECT
        body_type_name,
        100,  -- image_width_percent
        600,  -- image_max_width_px
        70,   -- image_max_height_vh
        250,  -- image_min_width_px
        0,    -- image_margin_top_px
        '#FFFFFF', -- info_panel_bg_color
        100,  -- frame_width_percent
        100   -- frame_height_percent
      FROM dim_body_type
      WHERE body_type_name NOT IN (
        SELECT body_type_name FROM body_type_frame_config
      )
    `);

    console.log(`✅ Added ${result.rowCount} new body type configs\n`);

    // Show total count
    const count = await client.query('SELECT COUNT(*) FROM body_type_frame_config');
    console.log(`📊 Total body types in config: ${count.rows[0].count}\n`);

    // Show sample entries
    const sample = await client.query(`
      SELECT body_type_name, frame_width_percent, frame_height_percent
      FROM body_type_frame_config
      ORDER BY body_type_name
      LIMIT 10
    `);

    console.log('Sample entries:');
    sample.rows.forEach(row => {
      console.log(`  ${row.body_type_name}: ${row.frame_width_percent}% x ${row.frame_height_percent}%`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addMissingBodyTypeConfigs();
