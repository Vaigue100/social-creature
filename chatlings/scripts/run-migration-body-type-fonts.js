const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addBodyTypeFonts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔄 Adding lore_font column to body_type_frame_config...\n');

    // Add lore_font column
    await client.query(`
      ALTER TABLE body_type_frame_config
      ADD COLUMN IF NOT EXISTS lore_font VARCHAR(255) DEFAULT 'Georgia, serif';
    `);

    console.log('✅ Column added\n');

    // Set knight to Fraktur
    await client.query(`
      UPDATE body_type_frame_config
      SET lore_font = 'UnifrakturMaguntia, Old English Text MT, Blackletter, serif'
      WHERE body_type_name = 'knight';
    `);

    console.log('✅ Knight set to Fraktur font\n');

    // Show sample of fonts
    const result = await client.query(`
      SELECT body_type_name, lore_font
      FROM body_type_frame_config
      ORDER BY body_type_name
      LIMIT 10;
    `);

    console.log('Sample font assignments:');
    result.rows.forEach(row => {
      console.log(`  ${row.body_type_name}: ${row.lore_font}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addBodyTypeFonts();
