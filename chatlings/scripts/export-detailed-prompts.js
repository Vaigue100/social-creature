/**
 * Export creature data with FULL AI PROMPTS for image generation
 * Creates detailed, varied prompts ready for Stable Diffusion
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

// Detailed prompt templates for variety
const promptTemplates = {
  poses: {
    'Roaring stance': ['roaring with mouth open', 'fierce roar pose', 'roaring stance with raised head'],
    'Sitting': ['sitting pose', 'sitting peacefully', 'seated position'],
    'Floating': ['floating in air', 'hovering gently', 'levitating'],
    'Bouncing': ['mid-bounce', 'jumping up', 'bouncing energetically'],
    'Dancing': ['dancing pose', 'rhythmic movement', 'joyful dance'],
    'Sleeping': ['sleeping peacefully', 'curled up sleeping', 'resting'],
    'Playing': ['playful pose', 'playing energetically', 'having fun'],
    'Spinning': ['spinning around', 'rotating pose', 'twirling'],
    'Running': ['running pose', 'mid-run', 'running fast'],
    'Waving': ['waving gesture', 'friendly wave', 'greeting wave']
  },

  materials: {
    'Cute Figurine': 'cute living creature, natural texture, animated style',
    'Kawaii': 'adorable living creature, expressive features, vibrant colors',
    'Chibi': 'cute living creature, chibi style proportions, big expressive eyes',
    'Crystal': 'crystalline creature, gemstone texture, translucent living being',
    'Fluffy': 'soft fluffy creature, natural fur texture, living animal',
    'Steampunk': 'steampunk creature with brass gears, Victorian mechanisms, mechanical living being',
    'Cyberpunk': 'cyberpunk creature with neon lights, cybernetic parts, futuristic living being',
    'Gothic': 'gothic creature, dark ornate details, elegant living being'
  },

  lighting: {
    'Legendary': 'dramatic studio lighting, rim light, perfect highlights, premium quality',
    'Epic': 'studio lighting, soft shadows, high quality lighting',
    'Rare': 'good lighting, soft shadows',
    'Uncommon': 'even lighting, clear visibility',
    'Common': 'simple lighting, clean look'
  },

  details: {
    'Legendary': 'masterpiece, highly detailed, 8k resolution, perfect quality, professional render',
    'Epic': 'very detailed, high quality, great textures, professional',
    'Rare': 'detailed, good quality, clean render',
    'Uncommon': 'well-made, clear details',
    'Common': 'clean, simple, cute'
  },

  elementEffects: {
    'Fire': 'subtle fire effects, warm glow, flame accents',
    'Water': 'water droplets, flowing water elements, blue shimmer',
    'Lightning': 'electric sparks, lightning details, energy crackling',
    'Ice': 'frost crystals, icy effects, cold mist',
    'Nature': 'small leaves, flower details, natural elements',
    'Shadow': 'dark aura, shadow wisps, mysterious glow',
    'Light': 'glowing aura, light rays, radiant effect',
    'Magic': 'magical sparkles, mystical runes, arcane glow',
    'Spirit': 'ethereal glow, spiritual wisps, ghostly aura',
    'Code': 'digital patterns, matrix code, tech patterns',
    'Gravity': 'floating debris, gravity distortion effects',
    'Electric': 'electrical sparks, energy bolts',
    'Crystal': 'crystalline patterns, gem reflections',
    'Sound': 'sound wave effects, musical notes',
    'Dream': 'dreamy particles, soft nebula effects',
    'Void': 'void energy, dark particles',
    'Chaos': 'chaotic energy swirls',
    'Order': 'geometric patterns, structured energy'
  }
};

function generateDetailedPrompt(creature) {
  const parts = [];

  // Base description
  const style = creature.style_name;
  const material = promptTemplates.materials[style] || 'cute living creature, natural style';
  parts.push(material);

  // Subject with mood - emphasize it's a creature
  const mood = creature.mood_name.toLowerCase();
  const subspecies = creature.subspecies_name.toLowerCase();
  parts.push(`${mood} ${subspecies} creature character`, 'full body visible', 'complete creature');

  // Colors - more descriptive
  const colors = creature.colouring_name.toLowerCase().split(' & ');
  if (colors.length === 2) {
    parts.push(`${colors[0]} and ${colors[1]} color scheme`);
  } else {
    parts.push(`${creature.colouring_name.toLowerCase()} colors`);
  }

  // Pose - varied descriptions
  const motionOptions = promptTemplates.poses[creature.motion_name] || [creature.motion_name.toLowerCase()];
  const motion = motionOptions[Math.floor(Math.random() * motionOptions.length)];
  parts.push(motion);

  // Elemental effects
  const elementEffect = promptTemplates.elementEffects[creature.elemental_affinity];
  if (elementEffect) {
    parts.push(elementEffect);
  }

  // Background/environment hint
  const env = creature.environment_name.toLowerCase();
  parts.push(`${env} background`);

  // Lighting
  const lighting = promptTemplates.lighting[creature.rarity_tier];
  if (lighting) {
    parts.push(lighting);
  }

  // Quality details
  const details = promptTemplates.details[creature.rarity_tier];
  if (details) {
    parts.push(details);
  }

  // Always add these - ensure full creature in frame
  parts.push('natural environment', 'dynamic pose', 'stylized 3D art', 'no stand', 'no base', 'no pedestal', 'full body shot', 'creature centered', 'entire creature visible');

  return parts.join(', ');
}

function generateNegativePrompt() {
  return 'blurry, low quality, distorted, ugly, bad anatomy, text, watermark, realistic photo, scary, creepy, horror, human, person, nsfw, deformed, mutated, extra limbs, bad proportions, stand, pedestal, platform, base, display stand, statue base, mounted, toy stand, figurine base, cropped, cut off, partial view, close up, zoomed in, body cut off, out of frame, abstract, object, item, tool, weapon, inanimate object, not a creature';
}

async function exportDetailedPrompts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Get all creatures
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
      ORDER BY RANDOM()
    `);

    console.log(`Found ${result.rows.length} creatures`);
    console.log('Generating detailed prompts...\n');

    // Create CSV with creature_id and full prompt
    const headers = ['creature_id', 'creature_name', 'prompt', 'negative_prompt'];
    const csvRows = [headers.join(',')];

    const negativePrompt = generateNegativePrompt();

    result.rows.forEach(row => {
      const prompt = generateDetailedPrompt(row);

      // Escape CSV values
      const escapeCsv = (val) => {
        if (val && val.includes(',')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      csvRows.push([
        row.id,
        escapeCsv(row.creature_name),
        escapeCsv(prompt),
        escapeCsv(negativePrompt)
      ].join(','));
    });

    // Write to artwork folder
    const outputPath = path.join(__dirname, '..', 'artwork', 'creature_prompts_queue.csv');
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

    console.log(`[SUCCESS] Created prompt file: ${outputPath}`);
    console.log(`  ${result.rows.length} creatures with detailed prompts`);
    console.log(`  Ready for Stable Diffusion batch generation!\n`);

    // Show sample prompts
    console.log('Sample prompts:');
    console.log('===============');
    for (let i = 0; i < Math.min(3, result.rows.length); i++) {
      const creature = result.rows[i];
      console.log(`\n${i+1}. ${creature.creature_name}:`);
      console.log(`   ${generateDetailedPrompt(creature)}`);
    }

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

exportDetailedPrompts();
