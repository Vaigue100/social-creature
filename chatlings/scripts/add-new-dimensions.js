/**
 * Add new dimension values
 * - Teaching, Presenting, Cooking activities
 * - Nothing category for activity and quirk
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addDimensions() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Add new activities
    console.log('Adding new activities...');

    await client.query(`
      INSERT INTO dim_social_activity (activity_name, prompt_text) VALUES
      ('Teaching', 'teaching with tiny pointer and whiteboard, educational pose'),
      ('Presenting', 'presenting with tiny presentation slides, confident speaker pose'),
      ('Cooking', 'cooking with tiny chef hat and utensils, culinary pose'),
      ('Doing nothing', 'relaxing peacefully, calm idle pose')
      ON CONFLICT (activity_name) DO NOTHING
    `);

    console.log('✓ Added: Teaching, Presenting, Cooking, Doing nothing\n');

    // Add "nothing" quirk
    console.log('Adding "nothing" quirk...');

    await client.query(`
      INSERT INTO dim_special_quirk (quirk_name, prompt_text) VALUES
      ('No quirk', 'simple natural appearance')
      ON CONFLICT (quirk_name) DO NOTHING
    `);

    console.log('✓ Added: No quirk\n');

    // Display all activities
    const activities = await client.query('SELECT id, activity_name FROM dim_social_activity ORDER BY id');
    console.log('All Activities:');
    activities.rows.forEach(a => console.log(`  ${a.id}. ${a.activity_name}`));
    console.log();

    // Display all quirks
    const quirks = await client.query('SELECT id, quirk_name FROM dim_special_quirk ORDER BY id');
    console.log('All Quirks:');
    quirks.rows.forEach(q => console.log(`  ${q.id}. ${q.quirk_name}`));
    console.log();

    console.log('='.repeat(80));
    console.log('✅ New dimensions added successfully!');
    console.log('='.repeat(80));

    await client.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Add New Dimensions');
console.log('================================================================================\n');

addDimensions();
