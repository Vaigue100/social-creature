const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function splitGenerationsBodyTypes() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔄 Splitting Generations into separate body types...\n');

    // Remove Generations body type
    await client.query(`DELETE FROM body_type_frame_config WHERE body_type_name = 'Generations'`);
    await client.query(`DELETE FROM dim_body_type WHERE body_type_name = 'Generations'`);
    console.log('✅ Removed Generations body type\n');

    // Define the new generation body types
    const generations = [
      { name: 'Gen Z', frame: 'frame/gen-z.png', prompt: 'Gen Z creature with modern style' },
      { name: 'Gen Millennial', frame: 'frame/gen-millennial.png', prompt: 'Millennial hipster creature' },
      { name: 'Gen X', frame: 'frame/gen-x.png', prompt: 'Gen X grunge creature' },
      { name: 'Gen Baby Boomer', frame: 'frame/gen-baby-boomer.png', prompt: 'Baby Boomer hippie creature' },
      { name: 'Gen 60s', frame: 'frame/gen-60s.png', prompt: '1960s mod creature' },
      { name: 'Gen 70s', frame: 'frame/gen-70s.png', prompt: '1970s disco creature' },
      { name: 'Gen 80s', frame: 'frame/gen-80s.png', prompt: '1980s rad creature' },
      { name: 'Gen 90s', frame: 'frame/gen-90s.png', prompt: '1990s grunge creature' },
      { name: 'Gen 20s', frame: 'frame/gen-20s.png', prompt: '1920s flapper creature' }
    ];

    // Add each generation as a body type
    for (const gen of generations) {
      // Add to dim_body_type
      await client.query(`
        INSERT INTO dim_body_type (body_type_name, frame_filename, prompt_text)
        VALUES ($1, $2, $3)
        ON CONFLICT (body_type_name) DO NOTHING;
      `, [gen.name, gen.frame, gen.prompt]);

      // Add to body_type_frame_config
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
        VALUES ($1, 100, 600, 70, 250, 0, '#FFFFFF', 100, 100, 'Georgia, serif')
        ON CONFLICT (body_type_name) DO NOTHING;
      `, [gen.name]);

      console.log(`✅ Added ${gen.name}`);
    }

    console.log('\n📊 Summary of new body types:');
    const result = await client.query(`
      SELECT bt.id, bt.body_type_name, bt.frame_filename
      FROM dim_body_type bt
      WHERE bt.body_type_name LIKE 'Gen %'
      ORDER BY bt.id;
    `);

    result.rows.forEach(row => {
      console.log(`  [${row.id}] ${row.body_type_name} - ${row.frame_filename}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

splitGenerationsBodyTypes();
