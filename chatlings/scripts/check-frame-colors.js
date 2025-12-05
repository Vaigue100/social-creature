const { Client } = require('pg');
const config = require('./db-config');

async function checkColors() {
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT body_type_name, info_panel_bg_color FROM body_type_frame_config ORDER BY body_type_name');
    console.log('\nCurrent frame config colors:');
    console.log('─'.repeat(50));
    res.rows.forEach(r => {
      console.log(`${r.body_type_name.padEnd(20)} ${r.info_panel_bg_color || 'NULL'}`);
    });
    console.log('─'.repeat(50));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkColors();
