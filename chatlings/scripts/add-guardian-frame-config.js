const { Client } = require('pg');

const config = { ...require('./db-config'), database: 'chatlings' };

async function addGuardianConfig() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database');

    // Insert Guardian configuration with default values
    const result = await client.query(`
      INSERT INTO body_type_frame_config (
        body_type_name,
        image_width_percent,
        image_max_width_px,
        image_max_height_vh,
        image_min_width_px,
        image_margin_top_px
      )
      VALUES ('Guardian', 100, 600, 70, 250, 0)
      ON CONFLICT (body_type_name) DO UPDATE SET
        image_width_percent = EXCLUDED.image_width_percent,
        image_max_width_px = EXCLUDED.image_max_width_px,
        image_max_height_vh = EXCLUDED.image_max_height_vh,
        image_min_width_px = EXCLUDED.image_min_width_px,
        image_margin_top_px = EXCLUDED.image_margin_top_px,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);

    console.log('✓ Guardian frame configuration added:');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('Error adding Guardian config:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addGuardianConfig();
