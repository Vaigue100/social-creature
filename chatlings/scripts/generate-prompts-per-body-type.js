/**
 * Generate prompt CSV files per body type for Perchance
 * Each CSV contains ONLY the prompt text (no headers, no other fields)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

async function generatePrompts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Generating Prompt Files Per Body Type\n' + '='.repeat(80));

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

      // Get all dimension combinations for this body type
      const prompts = await client.query(`
        SELECT DISTINCT
          bt.prompt_text as body_type,
          sc.prompt_text as size,
          sa.prompt_text as activity,
          sm.prompt_text as mood,
          cs.prompt_text as color,
          sq.prompt_text as quirk
        FROM dim_body_type bt
        CROSS JOIN dim_size_category sc
        CROSS JOIN dim_social_activity sa
        CROSS JOIN dim_social_mood sm
        CROSS JOIN dim_color_scheme cs
        CROSS JOIN dim_special_quirk sq
        WHERE bt.id = $1
          AND EXISTS (SELECT 1 FROM dim_size_category_body_types WHERE size_id = sc.id AND body_type_id = bt.id)
          AND EXISTS (SELECT 1 FROM dim_social_activity_body_types WHERE activity_id = sa.id AND body_type_id = bt.id)
          AND EXISTS (SELECT 1 FROM dim_social_mood_body_types WHERE mood_id = sm.id AND body_type_id = bt.id)
          AND EXISTS (SELECT 1 FROM dim_color_scheme_body_types WHERE color_scheme_id = cs.id AND body_type_id = bt.id)
          AND EXISTS (SELECT 1 FROM dim_special_quirk_body_types WHERE quirk_id = sq.id AND body_type_id = bt.id)
        ORDER BY size, activity, mood, color, quirk
      `, [bt.id]);

      if (prompts.rows.length === 0) {
        console.log(`  ⚠ No valid dimension combinations found - skipping`);
        continue;
      }

      // Build full prompts
      const fullPrompts = prompts.rows.map(p => {
        // Build prompt: size body_type, activity, mood mood, color colors
        let prompt = `${p.size} ${p.body_type}`;

        if (p.activity) {
          prompt += `, ${p.activity}`;
        }

        if (p.mood && p.mood !== 'no mood') {
          prompt += `, ${p.mood} mood`;
        }

        if (p.color && p.color !== 'no color') {
          prompt += `, ${p.color} colors`;
        }

        if (p.quirk && p.quirk !== 'no quirk') {
          prompt += `, ${p.quirk}`;
        }

        return prompt;
      });

      // Remove duplicates
      const uniquePrompts = [...new Set(fullPrompts)];

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
    process.exit(1);
  } finally {
    await client.end();
  }
}

generatePrompts();
