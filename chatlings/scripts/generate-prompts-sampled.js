/**
 * Generate prompt CSV files per body type for Perchance (sampled)
 * Uses random sampling to generate a manageable number of diverse prompts
 * Each CSV contains ONLY the prompt text (no headers, no other fields)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

const PROMPTS_PER_BODY_TYPE = 20; // Generate 20 prompts per body type

async function generatePrompts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Generating Prompt Files Per Body Type (Sampled)\n' + '='.repeat(80));

    // Ensure artwork folder exists
    const artworkFolder = path.join(__dirname, '..', 'artwork');
    if (!fs.existsSync(artworkFolder)) {
      fs.mkdirSync(artworkFolder, { recursive: true });
      console.log('Created artwork folder\n');
    }

    // Get all body types
    const bodyTypes = await client.query('SELECT * FROM dim_body_type ORDER BY body_type_name');

    for (const bt of bodyTypes.rows) {
      console.log(`\nProcessing ${bt.body_type_name}...`);

      // Get all dimensions for this body type
      const sizes = await client.query(`
        SELECT DISTINCT sc.id, sc.prompt_text
        FROM dim_size_category sc
        JOIN dim_size_category_body_types scbt ON sc.id = scbt.size_id
        WHERE scbt.body_type_id = $1
      `, [bt.id]);

      const activities = await client.query(`
        SELECT DISTINCT sa.id, sa.prompt_text
        FROM dim_social_activity sa
        JOIN dim_social_activity_body_types sabt ON sa.id = sabt.activity_id
        WHERE sabt.body_type_id = $1
      `, [bt.id]);

      const moods = await client.query(`
        SELECT DISTINCT sm.id, sm.prompt_text
        FROM dim_social_mood sm
        JOIN dim_social_mood_body_types smbt ON sm.id = smbt.mood_id
        WHERE smbt.body_type_id = $1
      `, [bt.id]);

      const colors = await client.query(`
        SELECT DISTINCT cs.id, cs.prompt_text
        FROM dim_color_scheme cs
        JOIN dim_color_scheme_body_types csbt ON cs.id = csbt.color_scheme_id
        WHERE csbt.body_type_id = $1
      `, [bt.id]);

      const quirks = await client.query(`
        SELECT DISTINCT sq.id, sq.prompt_text
        FROM dim_special_quirk sq
        JOIN dim_special_quirk_body_types sqbt ON sq.id = sqbt.quirk_id
        WHERE sqbt.body_type_id = $1
      `, [bt.id]);

      if (sizes.rows.length === 0 || activities.rows.length === 0) {
        console.log(`  ⚠ Missing required dimensions - skipping`);
        continue;
      }

      console.log(`  Found: ${sizes.rows.length} sizes, ${activities.rows.length} activities, ${moods.rows.length} moods, ${colors.rows.length} colors, ${quirks.rows.length} quirks`);

      // Generate random combinations
      const prompts = new Set();
      const maxAttempts = PROMPTS_PER_BODY_TYPE * 3; // Try 3x to account for duplicates
      let attempts = 0;

      while (prompts.size < PROMPTS_PER_BODY_TYPE && attempts < maxAttempts) {
        attempts++;

        // Randomly select one from each dimension
        const size = sizes.rows[Math.floor(Math.random() * sizes.rows.length)];
        const activity = activities.rows[Math.floor(Math.random() * activities.rows.length)];
        const mood = moods.rows.length > 0 ? moods.rows[Math.floor(Math.random() * moods.rows.length)] : null;
        const color = colors.rows.length > 0 ? colors.rows[Math.floor(Math.random() * colors.rows.length)] : null;
        const quirk = quirks.rows.length > 0 ? quirks.rows[Math.floor(Math.random() * quirks.rows.length)] : null;

        // Build prompt
        let prompt = `${size.prompt_text} ${bt.prompt_text}`;

        if (activity) {
          prompt += `, ${activity.prompt_text}`;
        }

        if (mood && mood.prompt_text !== 'no mood') {
          prompt += `, ${mood.prompt_text} mood`;
        }

        if (color && color.prompt_text !== 'no color') {
          prompt += `, ${color.prompt_text} colors`;
        }

        if (quirk && quirk.prompt_text !== 'no quirk') {
          prompt += `, ${quirk.prompt_text}`;
        }

        prompts.add(prompt);
      }

      const uniquePrompts = Array.from(prompts);

      // Write to CSV (just prompts, no headers)
      const filename = `${bt.body_type_name.toLowerCase()}_prompts.csv`;
      const filepath = path.join(artworkFolder, filename);

      fs.writeFileSync(filepath, uniquePrompts.join('\n'));

      console.log(`  ✓ Generated ${uniquePrompts.length} unique prompts`);
      console.log(`  ✓ Saved to: artwork/${filename}`);
      console.log(`  📝 Sample: "${uniquePrompts[0]}"`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ All prompt files generated!');
    console.log('\nFiles are in the artwork/ folder, ready to copy-paste into Perchance.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generatePrompts();
