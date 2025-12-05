const { Client } = require('pg');
const config = require('./db-config');

async function setDragonColor() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log('Connected to database\n');

    // First check if Dragon exists
    const check = await client.query(`SELECT * FROM body_type_frame_config WHERE body_type_name = 'Dragon'`);

    let result;
    if (check.rows.length > 0) {
      // Update existing
      result = await client.query(`
        UPDATE body_type_frame_config
        SET info_panel_bg_color = '#CC5500', updated_at = CURRENT_TIMESTAMP
        WHERE body_type_name = 'Dragon'
        RETURNING *
      `);
      console.log('Updated existing Dragon entry');
    } else {
      // Insert new
      result = await client.query(`
        INSERT INTO body_type_frame_config (body_type_name, info_panel_bg_color)
        VALUES ('Dragon', '#CC5500')
        RETURNING *
      `);
      console.log('Created new Dragon entry');
    }

    console.log('✅ Dragon color updated successfully!');
    console.log('   Body Type:', result.rows[0].body_type_name);
    console.log('   Info Panel Color:', result.rows[0].info_panel_bg_color);
    console.log('   Updated:', result.rows[0].updated_at);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

setDragonColor();
