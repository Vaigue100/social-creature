/**
 * Regenerate creature prompts using ONLY valid dimension combinations
 * based on junction table mappings
 *
 * This ensures:
 * - Athletes only get athletic activities
 * - Knights only get knight activities
 * - Dragons only get dragon activities
 * etc.
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

// Configuration
const PROMPTS_PER_BODY_TYPE = 50; // How many prompts per body type

// Negative prompt (constant for all)
const NEGATIVE_PROMPT = `blurry, low quality, distorted, ugly, bad anatomy, text, watermark, realistic photo, scary, creepy, horror, human, person, people, man, woman, child, human face, human body, humanoid, anthropomorphic, human features, facial features, person in costume, cosplay, fursuit, mascot costume, suit, costume, human wearing, human skin, hands, fingers, human eyes, human nose, human mouth, nsfw, deformed, mutated, extra limbs, bad proportions, stand, pedestal, platform, base, display stand, statue base, mounted, toy stand, figurine base, cropped, cut off, partial view, close up, zoomed in, body cut off, out of frame, abstract, object, item, tool, weapon, inanimate object, not a creature, multiple creatures, two creatures, three creatures, many creatures, several creatures, crowd, group, duplicate`;

// Base prompt template
const BASE_PROMPT_SUFFIX = ', single creature only, full body visible, stylized 3D art, charming friendly, cute living creature, simple clean background, soft lighting';

async function regeneratePrompts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Regenerating Prompts with Valid Dimension Mappings\n');
    console.log('='.repeat(80));

    // Step 1: Clear creatures first (they reference prompts)
    console.log('\n1. Clearing creatures...');
    const creatureCount = await client.query('SELECT COUNT(*) FROM creatures');
    console.log(`   Current creatures: ${creatureCount.rows[0].count}`);

    await client.query('UPDATE users SET current_creature_id = NULL');
    await client.query('DELETE FROM user_rewards');
    await client.query('DELETE FROM creature_social_traits');
    await client.query('DELETE FROM creature_friendships');
    await client.query('DELETE FROM creatures');
    console.log('   ✓ All creatures cleared\n');

    // Step 2: Clear old prompts
    console.log('2. Clearing old creature_prompts...');
    const oldCount = await client.query('SELECT COUNT(*) FROM creature_prompts');
    console.log(`   Current prompts: ${oldCount.rows[0].count}`);

    await client.query('DELETE FROM creature_prompts');
    console.log('   ✓ All prompts cleared\n');

    // Step 3: Get all body types
    const bodyTypes = await client.query('SELECT * FROM dim_body_type ORDER BY body_type_name');
    console.log(`3. Processing ${bodyTypes.rows.length} body types...\n`);

    let totalPromptsCreated = 0;

    // For each body type, generate prompts using valid combinations
    for (const bodyType of bodyTypes.rows) {
      console.log(`${bodyType.body_type_name}:`);

      // Get valid dimensions for this body type
      const sizes = await client.query(`
        SELECT sc.* FROM dim_size_category sc
        JOIN dim_size_category_body_types scbt ON sc.id = scbt.size_id
        WHERE scbt.body_type_id = $1
      `, [bodyType.id]);

      const activities = await client.query(`
        SELECT sa.* FROM dim_social_activity sa
        JOIN dim_social_activity_body_types sabt ON sa.id = sabt.activity_id
        WHERE sabt.body_type_id = $1
      `, [bodyType.id]);

      const moods = await client.query(`
        SELECT sm.* FROM dim_social_mood sm
        JOIN dim_social_mood_body_types smbt ON sm.id = smbt.mood_id
        WHERE smbt.body_type_id = $1
      `, [bodyType.id]);

      const colors = await client.query(`
        SELECT cs.* FROM dim_color_scheme cs
        JOIN dim_color_scheme_body_types csbt ON cs.id = csbt.color_scheme_id
        WHERE csbt.body_type_id = $1
      `, [bodyType.id]);

      const quirks = await client.query(`
        SELECT sq.* FROM dim_special_quirk sq
        JOIN dim_special_quirk_body_types sqbt ON sq.id = sqbt.quirk_id
        WHERE sqbt.body_type_id = $1
      `, [bodyType.id]);

      console.log(`   Valid dimensions: ${sizes.rows.length} sizes, ${activities.rows.length} activities, ${moods.rows.length} moods, ${colors.rows.length} colors, ${quirks.rows.length} quirks`);

      // Check if body type has all required dimensions
      if (sizes.rows.length === 0) {
        console.log(`   ⚠️  No sizes mapped - skipping\n`);
        continue;
      }
      if (activities.rows.length === 0) {
        console.log(`   ⚠️  No activities mapped - skipping\n`);
        continue;
      }
      if (moods.rows.length === 0) {
        console.log(`   ⚠️  No moods mapped - skipping\n`);
        continue;
      }
      if (colors.rows.length === 0) {
        console.log(`   ⚠️  No colors mapped - skipping\n`);
        continue;
      }
      if (quirks.rows.length === 0) {
        console.log(`   ⚠️  No quirks mapped - skipping\n`);
        continue;
      }

      // Calculate possible combinations
      const possibleCombinations = sizes.rows.length * activities.rows.length *
                                  moods.rows.length * colors.rows.length * quirks.rows.length;

      const targetPrompts = Math.min(PROMPTS_PER_BODY_TYPE, possibleCombinations);
      console.log(`   Target: ${targetPrompts} prompts (${possibleCombinations.toLocaleString()} possible)`);

      let promptsCreated = 0;
      const maxAttempts = targetPrompts * 20;
      let attempts = 0;

      while (promptsCreated < targetPrompts && attempts < maxAttempts) {
        attempts++;

        // Pick random valid dimensions for this body type
        const size = sizes.rows[Math.floor(Math.random() * sizes.rows.length)];
        const activity = activities.rows[Math.floor(Math.random() * activities.rows.length)];
        const mood = moods.rows[Math.floor(Math.random() * moods.rows.length)];
        const color = colors.rows[Math.floor(Math.random() * colors.rows.length)];
        const quirk = quirks.rows[Math.floor(Math.random() * quirks.rows.length)];

        // Build prompt
        const prompt = `${bodyType.prompt_text}, ${color.prompt_text}, ${activity.prompt_text}, ${mood.prompt_text}, ${quirk.prompt_text}, ${size.prompt_text}${BASE_PROMPT_SUFFIX}`;

        try {
          const result = await client.query(`
            INSERT INTO creature_prompts
              (body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id, prompt, negative_prompt)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id) DO NOTHING
            RETURNING id
          `, [bodyType.id, activity.id, mood.id, color.id, quirk.id, size.id, prompt, NEGATIVE_PROMPT]);

          if (result.rows.length > 0) {
            promptsCreated++;
          }

        } catch (error) {
          if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
            console.error(`   ❌ Error: ${error.message}`);
          }
        }
      }

      totalPromptsCreated += promptsCreated;
      console.log(`   ✓ Created ${promptsCreated} prompts\n`);
    }

    // Summary
    console.log('='.repeat(80));
    console.log('✅ Regeneration Complete!');
    console.log('='.repeat(80));
    console.log(`Total prompts created: ${totalPromptsCreated}`);
    console.log('\nAll prompts now use valid dimension combinations for each body type!');
    console.log('Athletes have athletic activities, Knights have knight activities, etc.\n');

    // Show sample prompts
    console.log('Sample prompts per body type:');
    console.log('-'.repeat(80));

    for (const bodyType of bodyTypes.rows) {
      const sample = await client.query(`
        SELECT cp.prompt
        FROM creature_prompts cp
        WHERE cp.body_type_id = $1
        LIMIT 1
      `, [bodyType.id]);

      if (sample.rows.length > 0) {
        const shortPrompt = sample.rows[0].prompt.substring(0, 80) + '...';
        console.log(`${bodyType.body_type_name}: ${shortPrompt}`);
      }
    }

    console.log('\n' + '='.repeat(80));

    await client.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Regenerate Prompts with Valid Dimension Mappings');
console.log('================================================================================\n');

regeneratePrompts();
