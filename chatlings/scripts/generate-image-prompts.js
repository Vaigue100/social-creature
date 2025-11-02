/**
 * Generate detailed AI image prompts for Chatlings creatures
 * For use with Kaiber, Midjourney, Stable Diffusion, etc.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

function generateImagePrompt(creature) {
  const { subspecies_name, colouring_name, style_name, mood_name, motion_name, elemental_affinity, environment_name, rarity_tier } = creature;

  const promptParts = [];

  // Start with creature type and mood
  promptParts.push(`A ${mood_name.toLowerCase()} ${subspecies_name.toLowerCase()}`);

  // Add style description
  const styleDescriptions = {
    'Naturalistic': 'rendered in a realistic, natural style with organic textures',
    'Gothic': 'with dark gothic aesthetics, ornate details, and dramatic shadows',
    'Regal': 'with royal, majestic appearance and elegant proportions',
    'Majestic': 'grand and imposing with dignified presence',
    'Sleek': 'with smooth, streamlined forms and polished surfaces',
    'Ornate': 'decorated with intricate patterns and elaborate details',
    'Minimalist': 'with clean, simple lines and refined composition',
    'Cosmic': 'with celestial, space-themed aesthetics and starry elements',
    'Ethereal': 'translucent and otherworldly with mystical glow',
    'Cyberpunk': 'with neon-lit technological details and futuristic elements',
    'Geometric': 'composed of angular, geometric shapes and patterns',
    'Futuristic': 'with advanced technological design and sci-fi elements',
    'Mecha': 'with mechanical armor plating and robotic components'
  };
  promptParts.push(styleDescriptions[style_name] || `in ${style_name.toLowerCase()} style`);

  // Add color scheme
  const colorParts = colouring_name.toLowerCase().split('&');
  if (colorParts.length === 2) {
    promptParts.push(`featuring ${colorParts[0].trim()} and ${colorParts[1].trim()} colors`);
  } else {
    promptParts.push(`with ${colouring_name.toLowerCase()} coloring`);
  }

  // Add motion/pose
  const motionDescriptions = {
    'Roaring stance': 'in an aggressive roaring pose with mouth open',
    'Slow prowl': 'moving in a cautious stalking motion',
    'Wing beat + roar': 'with wings spread wide mid-flight, roaring',
    'Spiral drift': 'floating in a graceful spiral motion',
    'Glitch loop': 'with digital glitch effects and pixelated distortions',
    'Data pulse': 'pulsing with streams of data and code',
    'Flame dance': 'surrounded by dancing flames and fire particles',
    'Lightning dash': 'crackling with lightning energy',
    'Orbit shimmer': 'with orbital rings of light around it',
    'Phase flicker': 'partially phased between dimensions with shimmer effect',
    'Echo pulse': 'with sound wave ripples emanating outward',
    'Color shift': 'with shifting rainbow hues across its form',
    'Symbol rotation': 'with rotating mystical symbols orbiting it',
    'Fractal bloom': 'with fractal patterns blooming from its center'
  };
  const motionDesc = motionDescriptions[motion_name] || `${motion_name.toLowerCase()}`;
  promptParts.push(motionDesc);

  // Add elemental effects
  const elementEffects = {
    'Fire': 'with fire particles and ember effects',
    'Water': 'with water droplets and flowing liquid effects',
    'Shadow': 'emanating dark shadow tendrils',
    'Light': 'radiating brilliant light rays',
    'Lightning': 'crackling with electric bolts',
    'Storm': 'surrounded by storm clouds and lightning',
    'Ice': 'with frost crystals and icy mist',
    'Nature': 'with leaves and natural growth elements',
    'Code': 'with floating code snippets and binary streams',
    'Electric': 'with electric arcs and glowing circuit patterns',
    'Time': 'with clock gears and temporal distortion effects',
    'Space': 'with stars and cosmic dust particles',
    'Void': 'with dark void rifts and gravity distortion',
    'Gravity': 'with gravitational lensing and space-time warping',
    'Cosmic': 'with nebula patterns and stellar formations',
    'Magic': 'with magical runes and arcane energy',
    'Spirit': 'with ethereal wisps and spiritual energy',
    'Energy': 'pulsing with pure energy waves'
  };
  if (elementEffects[elemental_affinity]) {
    promptParts.push(elementEffects[elemental_affinity]);
  }

  // Add environment/background
  const envDescriptions = {
    'Savannah': 'set in golden savannah grasslands at sunset',
    'Cyberspace': 'in a digital cyberspace environment with neon grids',
    'Volcano': 'near an active volcano with lava flows',
    'Nebula': 'floating in a colorful space nebula',
    'Temple': 'inside an ancient mystical temple',
    'Deep sea': 'in the dark depths of the ocean with bioluminescence',
    'Sky': 'high in the clouds during golden hour',
    'Cave': 'in a dark atmospheric cave with crystal formations',
    'Ruins': 'among ancient crumbling ruins overgrown with vines',
    'Forest': 'in a dense mystical forest',
    'Mountain': 'on a dramatic mountain peak',
    'Desert': 'in an endless desert under starry skies',
    'Ocean': 'above turbulent ocean waves',
    'Jungle': 'in a lush tropical jungle',
    'Server room': 'in a dark server room with glowing racks',
    'Skyscraper': 'atop a futuristic skyscraper',
    'Terminal': 'in a high-tech command terminal',
    'Void': 'in the endless cosmic void',
    'Chronoscape': 'in a time-warped landscape',
    'Rift': 'at the edge of a dimensional rift',
    'Core': 'at the glowing energy core',
    'Prism': 'inside a prismatic crystal chamber',
    'Night sky': 'against a starlit night sky',
    'Horizon': 'at the glowing horizon'
  };
  const envDesc = envDescriptions[environment_name] || `in ${environment_name.toLowerCase()}`;
  promptParts.push(envDesc);

  // Add quality tags based on rarity
  const qualityTags = {
    'Legendary': 'masterpiece, highly detailed, 8k, dramatic cinematic lighting, epic composition, professional quality',
    'Epic': 'high quality, very detailed, dramatic lighting, dynamic composition, cinematic',
    'Rare': 'detailed, professional lighting, good composition',
    'Uncommon': 'detailed, well-lit, clear',
    'Common': 'clean, clear, good quality'
  };
  promptParts.push(qualityTags[rarity_tier] || 'high quality');

  // Combine into full prompt
  const fullPrompt = promptParts.join(', ');

  // Generate negative prompt
  const negativePrompt = "blurry, low quality, distorted, disfigured, ugly, bad anatomy, watermark, signature, text, human, person, realistic photo, deformed, mutated, extra limbs";

  // Style tags
  const styleTags = `${style_name}, ${mood_name}, ${elemental_affinity}, ${rarity_tier}`;

  return {
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    style_tags: styleTags
  };
}

async function generate() {
  const client = new Client(config);

  try {
    console.log('\n' + '='.repeat(80));
    console.log('Generating AI Image Prompts for 10 Random Creatures');
    console.log('='.repeat(80) + '\n');

    await client.connect();

    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.creature_shortname,
        c.rarity_tier,
        dss.subspecies_name,
        dc.colouring_name,
        dst.style_name,
        dm.mood_name,
        dmt.motion_name,
        dea.affinity_name as elemental_affinity,
        de.environment_name
      FROM creatures c
      JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      JOIN dim_colouring dc ON c.colouring_id = dc.id
      JOIN dim_style dst ON c.style_id = dst.id
      JOIN dim_mood dm ON c.mood_id = dm.id
      JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
      JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
      JOIN dim_environment de ON c.environment_id = de.id
      WHERE c.creature_shortname IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 10
    `);

    const creatures = result.rows;
    const results = [];

    for (let i = 0; i < creatures.length; i++) {
      const creature = creatures[i];
      const promptData = generateImagePrompt(creature);

      const resultEntry = {
        creature_id: creature.id,
        creature_name: creature.creature_name,
        creature_shortname: creature.creature_shortname,
        rarity: creature.rarity_tier,
        prompt: promptData.prompt,
        negative_prompt: promptData.negative_prompt,
        style_tags: promptData.style_tags
      };

      results.push(resultEntry);

      // Display
      console.log(`${i + 1}. ${creature.creature_name} (${creature.creature_shortname || 'unnamed'})`);
      console.log(`   Rarity: ${creature.rarity_tier}`);
      console.log(`\n   PROMPT:`);
      console.log(`   ${promptData.prompt}`);
      console.log(`\n   NEGATIVE PROMPT:`);
      console.log(`   ${promptData.negative_prompt}`);
      console.log(`\n   STYLE TAGS: ${promptData.style_tags}`);
      console.log(`\n${'-'.repeat(80)}\n`);

      // Insert into database
      await client.query(`
        INSERT INTO creature_image_prompts (creature_id, prompt_text, negative_prompt, style_tags)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (creature_id) DO UPDATE
        SET prompt_text = EXCLUDED.prompt_text,
            negative_prompt = EXCLUDED.negative_prompt,
            style_tags = EXCLUDED.style_tags,
            updated_at = CURRENT_TIMESTAMP
      `, [resultEntry.creature_id, resultEntry.prompt, resultEntry.negative_prompt, resultEntry.style_tags]);
    }

    // Save to JSON
    const outputPath = path.join(__dirname, '..', 'data', 'sample_image_prompts.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`✓ Generated prompts for ${results.length} creatures`);
    console.log(`✓ Saved to: ${outputPath}`);
    console.log(`✓ Inserted into database table: creature_image_prompts\n`);

    console.log('='.repeat(80));
    console.log('Complete!');
    console.log('='.repeat(80) + '\n');
    console.log('You can now:');
    console.log('1. Review the prompts in data/sample_image_prompts.json');
    console.log('2. Query creature_image_prompts table in pgAdmin');
    console.log('3. Test these prompts with Kaiber or your chosen AI image generator\n');

    await client.end();

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

if (require.main === module) {
  generate();
}

module.exports = generate;
