const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function generateBodyTypeVariants() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🎭 Generating body type variant prompts...\n');

    // Get all active creatures
    const creatures = await client.query(`
      SELECT id, creature_name
      FROM creatures
      WHERE is_active = TRUE
      ORDER BY creature_name
    `);

    // Get new body types (Robot, Zombie, Gothic)
    const newBodyTypes = await client.query(`
      SELECT id, body_type_name, prompt_text
      FROM dim_body_type
      WHERE body_type_name IN ('Robot', 'Zombie', 'Gothic')
      ORDER BY id
    `);

    console.log(`Found ${creatures.rows.length} creatures`);
    console.log(`Found ${newBodyTypes.rows.length} new body types\n`);

    // Generate CSV data
    const csvRows = [];
    csvRows.push('creature_name,body_type,color,activity,mood,quirk,full_prompt');

    let totalPrompts = 0;

    // For each creature, create variants for each new body type
    for (const creature of creatures.rows) {
      for (const bodyType of newBodyTypes.rows) {

        // Get traits available for this body type
        // (body_type_id = NULL means available to all cute types, specific ID means exclusive to that type)
        const colors = await client.query(`
          SELECT scheme_name, prompt_text
          FROM dim_color_scheme
          WHERE body_type_id = $1
          ORDER BY id
        `, [bodyType.id]);

        const activities = await client.query(`
          SELECT activity_name, prompt_text
          FROM dim_social_activity
          WHERE body_type_id = $1
          ORDER BY id
        `, [bodyType.id]);

        const moods = await client.query(`
          SELECT mood_name, prompt_text
          FROM dim_social_mood
          WHERE body_type_id = $1
          ORDER BY id
        `, [bodyType.id]);

        const quirks = await client.query(`
          SELECT quirk_name, prompt_text
          FROM dim_special_quirk
          WHERE body_type_id = $1
          ORDER BY id
        `, [bodyType.id]);

        // Generate one representative prompt per creature per body type
        // Using the first option from each dimension
        if (colors.rows.length > 0 && activities.rows.length > 0 &&
            moods.rows.length > 0 && quirks.rows.length > 0) {

          const color = colors.rows[0];
          const activity = activities.rows[0];
          const mood = moods.rows[0];
          const quirk = quirks.rows[0];

          // Build the full prompt
          const prompt = `A chibi character named ${creature.creature_name}, ${bodyType.prompt_text}, ${color.prompt_text}, ${activity.prompt_text}, ${mood.prompt_text}, ${quirk.prompt_text}, white background, full body, simple design, high quality digital art`;

          const row = `"${creature.creature_name}","${bodyType.body_type_name}","${color.scheme_name}","${activity.activity_name}","${mood.mood_name}","${quirk.quirk_name}","${prompt}"`;
          csvRows.push(row);
          totalPrompts++;
        }
      }
    }

    // Write CSV file
    const outputDir = path.join(__dirname, '..', 'artwork');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const csvPath = path.join(outputDir, 'body_type_variant_prompts.csv');
    fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');

    console.log('✅ CSV generated successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Total prompts: ${totalPrompts}`);
    console.log(`   • Body type variants per creature: ${newBodyTypes.rows.length}`);
    console.log(`   • Output file: ${csvPath}\n`);

    // Display sample prompts
    console.log('📝 Sample prompts (first 5):');
    for (let i = 1; i <= Math.min(6, csvRows.length); i++) {
      const parts = csvRows[i].split('","');
      const name = parts[0].replace('"', '');
      const bodyType = parts[1];
      console.log(`   ${name} (${bodyType})`);
    }

    console.log('\n🎭 Body type breakdown:');
    for (const bodyType of newBodyTypes.rows) {
      const count = creatures.rows.length;
      console.log(`   • ${bodyType.body_type_name}: ${count} creature variants`);
    }

    console.log('\n💡 Next steps:');
    console.log('   1. Upload body_type_variant_prompts.csv to Perchance');
    console.log('   2. Generate artwork for each prompt');
    console.log('   3. Download and place in artwork folder as ZIP');
    console.log('   4. Watcher will automatically process new variants\n');

  } catch (error) {
    console.error('❌ Error generating prompts:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

generateBodyTypeVariants();
