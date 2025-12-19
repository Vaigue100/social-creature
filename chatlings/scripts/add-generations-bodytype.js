const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addGenerationsBodyType() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔄 Adding Generations body type...\n');

    // Add to dim_body_type
    await client.query(`
      INSERT INTO dim_body_type (body_type_name, frame_filename, prompt_text)
      VALUES ('Generations', 'frame/generations.png', 'creature from different generation')
      ON CONFLICT (body_type_name) DO NOTHING;
    `);

    console.log('✅ Generations body type added to dim_body_type\n');

    // Add to body_type_frame_config with defaults
    await client.query(`
      INSERT INTO body_type_frame_config (
        body_type_name,
        image_width_percent,
        image_max_width_px,
        image_max_height_vh,
        image_min_width_px,
        image_margin_top_px,
        info_panel_bg_color,
        frame_width_percent,
        frame_height_percent,
        lore_font
      )
      VALUES (
        'Generations',
        100,
        600,
        70,
        250,
        0,
        '#FFFFFF',
        100,
        100,
        'Georgia, serif'
      )
      ON CONFLICT (body_type_name) DO NOTHING;
    `);

    console.log('✅ Generations config added to body_type_frame_config\n');

    // Show the result
    const result = await client.query(`
      SELECT bt.id, bt.body_type_name, bt.frame_filename, fc.lore_font
      FROM dim_body_type bt
      LEFT JOIN body_type_frame_config fc ON bt.body_type_name = fc.body_type_name
      WHERE bt.body_type_name = 'Generations';
    `);

    console.log('Result:');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addGenerationsBodyType();
