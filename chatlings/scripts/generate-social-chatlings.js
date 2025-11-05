/**
 * Generate Social Chatlings
 *
 * New workflow:
 * 1. Creates unique prompts in creature_prompts table
 * 2. For each prompt, creates N creature "siblings" (family)
 * 3. All siblings share same prompt but have unique IDs and names
 * 4. Speeds up Perchance generation (one prompt → multiple creatures)
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

// Configuration
const CREATURES_PER_PROMPT = 4; // How many creatures to create per prompt (siblings)
const TARGET_PROMPTS = 100; // How many unique prompts to generate

// Negative prompt (constant for all)
const NEGATIVE_PROMPT = `blurry, low quality, distorted, ugly, bad anatomy, text, watermark, realistic photo, scary, creepy, horror, human, person, people, man, woman, child, human face, human body, humanoid, anthropomorphic, human features, facial features, person in costume, cosplay, fursuit, mascot costume, suit, costume, human wearing, human skin, hands, fingers, human eyes, human nose, human mouth, nsfw, deformed, mutated, extra limbs, bad proportions, stand, pedestal, platform, base, display stand, statue base, mounted, toy stand, figurine base, cropped, cut off, partial view, close up, zoomed in, body cut off, out of frame, abstract, object, item, tool, weapon, inanimate object, not a creature, multiple creatures, two creatures, three creatures, many creatures, several creatures, crowd, group, duplicate`;

// Base prompt template
const BASE_PROMPT_SUFFIX = ', single creature only, full body visible, stylized 3D art, charming friendly, cute living creature, simple clean background, soft lighting';

// Name generation helpers
const ADJECTIVES = [
  'Happy', 'Cheerful', 'Bubbly', 'Peppy', 'Jolly', 'Merry', 'Bright', 'Sunny',
  'Cozy', 'Snuggly', 'Fluffy', 'Bouncy', 'Wiggly', 'Giggly', 'Silly', 'Quirky',
  'Friendly', 'Sweet', 'Gentle', 'Kind', 'Lovely', 'Adorable', 'Precious', 'Darling',
  'Busy', 'Active', 'Zippy', 'Speedy', 'Quick', 'Swift', 'Nimble', 'Agile',
  'Chill', 'Relaxed', 'Calm', 'Peaceful', 'Zen', 'Serene', 'Tranquil', 'Mellow',
  'Curious', 'Playful', 'Witty', 'Clever', 'Smart', 'Bright', 'Sharp', 'Keen'
];

const NOUNS = [
  'Bean', 'Blob', 'Puff', 'Floof', 'Nugget', 'Buddy', 'Pal', 'Friend',
  'Sprout', 'Pip', 'Dot', 'Spot', 'Dash', 'Bit', 'Chip', 'Spark',
  'Mochi', 'Dumpling', 'Bao', 'Bun', 'Roll', 'Puff', 'Orb', 'Sphere',
  'Sprite', 'Wisp', 'Glow', 'Shimmer', 'Gleam', 'Twinkle', 'Star', 'Moon',
  'Cloud', 'Sky', 'Sun', 'Rain', 'Snow', 'Breeze', 'Wind', 'Storm'
];

function generateCreatureName(bodyType, activity, mood) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

async function generateSocialChatlings() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Load all dimensions
    const bodyTypes = await client.query('SELECT * FROM dim_body_type');
    const activities = await client.query('SELECT * FROM dim_social_activity');
    const moods = await client.query('SELECT * FROM dim_social_mood');
    const colors = await client.query('SELECT * FROM dim_color_scheme');
    const quirks = await client.query('SELECT * FROM dim_special_quirk');
    const sizes = await client.query('SELECT * FROM dim_size_category');

    console.log('Loaded dimensions:');
    console.log(`  Body Types: ${bodyTypes.rows.length}`);
    console.log(`  Activities: ${activities.rows.length}`);
    console.log(`  Moods: ${moods.rows.length}`);
    console.log(`  Colors: ${colors.rows.length}`);
    console.log(`  Quirks: ${quirks.rows.length}`);
    console.log(`  Sizes: ${sizes.rows.length}\n`);

    // Calculate total possible combinations
    const totalCombinations = bodyTypes.rows.length * activities.rows.length *
                             moods.rows.length * colors.rows.length *
                             quirks.rows.length * sizes.rows.length;
    console.log(`Total possible combinations: ${totalCombinations.toLocaleString()}\n`);

    let promptsCreated = 0;
    let creaturesCreated = 0;
    const maxAttempts = TARGET_PROMPTS * 10; // Try up to 10x target to avoid infinite loop
    let attempts = 0;

    console.log(`Target: ${TARGET_PROMPTS} prompts, ${TARGET_PROMPTS * CREATURES_PER_PROMPT} creatures\n`);

    while (promptsCreated < TARGET_PROMPTS && attempts < maxAttempts) {
      attempts++;

      // Random combination
      const bodyType = bodyTypes.rows[Math.floor(Math.random() * bodyTypes.rows.length)];
      const activity = activities.rows[Math.floor(Math.random() * activities.rows.length)];
      const mood = moods.rows[Math.floor(Math.random() * moods.rows.length)];
      const color = colors.rows[Math.floor(Math.random() * colors.rows.length)];
      const quirk = quirks.rows[Math.floor(Math.random() * quirks.rows.length)];
      const size = sizes.rows[Math.floor(Math.random() * sizes.rows.length)];

      // Build prompt
      const prompt = `${bodyType.prompt_text}, ${color.prompt_text}, ${activity.prompt_text}, ${mood.prompt_text}, ${quirk.prompt_text}, ${size.prompt_text}${BASE_PROMPT_SUFFIX}`;

      try {
        // Insert prompt (will fail if duplicate combination due to UNIQUE constraint)
        const promptResult = await client.query(`
          INSERT INTO creature_prompts
            (body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id, prompt, negative_prompt)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id) DO NOTHING
          RETURNING id
        `, [bodyType.id, activity.id, mood.id, color.id, quirk.id, size.id, prompt, NEGATIVE_PROMPT]);

        if (promptResult.rows.length > 0) {
          const promptId = promptResult.rows[0].id;
          promptsCreated++;

          // Create N creatures for this prompt (family)
          for (let i = 0; i < CREATURES_PER_PROMPT; i++) {
            const creatureName = generateCreatureName(bodyType.body_type_name, activity.activity_name, mood.mood_name);

            await client.query(`
              INSERT INTO creatures (creature_name, prompt_id, rarity_tier)
              VALUES ($1, $2, $3)
            `, [creatureName, promptId, 'Common']); // Default to Common for now

            creaturesCreated++;
          }

          if (promptsCreated % 10 === 0) {
            console.log(`Progress: ${promptsCreated}/${TARGET_PROMPTS} prompts, ${creaturesCreated} creatures created...`);
          }
        }

      } catch (error) {
        // Ignore constraint violations, just try another combination
        if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
          console.error('Unexpected error:', error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Generation Complete!');
    console.log('='.repeat(80));
    console.log(`Prompts created: ${promptsCreated}`);
    console.log(`Creatures created: ${creaturesCreated}`);
    console.log(`Creatures per prompt: ${CREATURES_PER_PROMPT}`);
    console.log(`\nEach prompt will generate ${CREATURES_PER_PROMPT} creature variations when used in Perchance.`);
    console.log('='.repeat(80));

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Social Chatlings Generator');
console.log('================================================================================\n');

generateSocialChatlings();
