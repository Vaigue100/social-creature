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
    'Beat loop': 'rhythmic beating motion',
    'Blink & hover': 'blinking while hovering',
    'Bobbing motion': 'bobbing up and down',
    'Bounce loop': 'continuous bouncing',
    'Bouncing': 'energetic bouncing',
    'Branch sway': 'swaying like branches',
    'Charging rush': 'charging forward powerfully',
    'Coil & hiss': 'coiled and hissing',
    'Coil & stretch': 'coiling and stretching',
    'Color shift': 'shifting colors',
    'Dancing': 'joyful dance',
    'Dart & pause': 'darting then pausing',
    'Data pulse': 'pulsing with data streams',
    'Dive motion': 'diving downward',
    'Drift & swirl': 'drifting and swirling',
    'Echo pulse': 'pulsing with echoes',
    'Fan display': 'displaying like a fan',
    'Flame dance': 'dancing flames',
    'Floating gently': 'gently floating',
    'Fractal bloom': 'blooming fractal pattern',
    'Gallop & glow': 'galloping while glowing',
    'Glitch loop': 'glitching repeatedly',
    'Ground rumble': 'rumbling the ground',
    'Head rotation': 'rotating head',
    'Jet roar': 'jetting with roar',
    'Leaping arc': 'leaping in arc',
    'Light pulse': 'pulsing light',
    'Lightning dash': 'dashing like lightning',
    'Mane shake': 'shaking mane',
    'Orbit shimmer': 'shimmering orbit',
    'Phase flicker': 'flickering between phases',
    'Playing': 'playful pose',
    'Pop-up animation': 'popping up',
    'Pounce loop': 'pouncing repeatedly',
    'Pulse & drift': 'pulsing while drifting',
    'Reverse shimmer': 'reverse shimmering',
    'Ripple motion': 'rippling motion',
    'Rising burst': 'bursting upward',
    'Roaring stance': 'fierce roar pose',
    'Running': 'running fast',
    'Shuffle & sprout': 'shuffling and sprouting',
    'Sitting': 'sitting peacefully',
    'Sleeping': 'sleeping peacefully',
    'Slow orbit': 'slowly orbiting',
    'Slow prowl': 'prowling slowly',
    'Slow stomp': 'stomping slowly',
    'Solar burst': 'bursting with solar energy',
    'Sound ripple': 'rippling sound waves',
    'Spinning': 'spinning around',
    'Spiral drift': 'drifting in spiral',
    'Spiral float': 'floating in spiral',
    'Stalking motion': 'stalking prey',
    'Symbol rotation': 'rotating symbols',
    'Tail flick': 'flicking tail',
    'Tentacle swirl': 'swirling tentacles',
    'Territorial stance': 'territorial stance',
    'Twitchy motion': 'twitchy movements',
    'Veil drift': 'drifting veil',
    'Waving': 'friendly wave',
    'Web spin': 'spinning web',
    'Wiggle motion': 'wiggling',
    'Wing beat + roar': 'beating wings while roaring',
    'Wing flutter': 'fluttering wings',
    'Wing stretch': 'stretching wings',
    'Wing sweep': 'sweeping wings'
  },

  materials: {
    'Naturalistic': 'naturalistic creature, realistic proportions, organic details',
    'Gothic': 'gothic creature, dark ornate details, elegant living being',
    'Mecha': 'mechanical creature, robot parts, tech details',
    'Elastic': 'stretchy elastic creature, flexible body, bouncy',
    'Fluffy': 'soft fluffy creature, natural fur texture, living animal',
    'Wispy': 'wispy ethereal creature, light and airy, misty',
    'Pastel': 'pastel colored creature, soft colors, gentle tones',
    'Dreamlike': 'dreamlike creature, surreal appearance, magical',
    'Glowing': 'glowing creature, luminous body, radiant',
    'Reptilian': 'reptilian creature, scaled skin, lizard-like',
    'Translucent': 'translucent creature, see-through body, ghostly',
    'Ethereal': 'ethereal creature, spirit-like, otherworldly',
    'Noble': 'noble creature, regal bearing, dignified',
    'Soft': 'soft creature, gentle features, rounded',
    'Blocky': 'blocky creature, geometric shapes, angular',
    'Chibi': 'cute chibi creature, oversized head, small body',
    'Massive': 'massive creature, large imposing, powerful',
    'Glitch': 'glitched creature, digital artifacts, pixelated',
    'Squishy': 'squishy creature, soft malleable, pudgy',
    'Radiant': 'radiant creature, bright shining, brilliant',
    'Ancient': 'ancient creature, weathered appearance, timeless',
    'Aura-based': 'aura creature, energy field, glowing outline',
    'Whimsical': 'whimsical creature, playful design, fanciful',
    'Fluid': 'fluid creature, flowing form, liquid-like',
    'Flowing': 'flowing creature, graceful movement, smooth',
    'Futuristic': 'futuristic creature, sci-fi design, advanced tech',
    'Kawaii': 'adorable kawaii creature, super cute, big eyes',
    'Galactic': 'galactic creature, cosmic appearance, space themed',
    'Geometric': 'geometric creature, sharp angles, mathematical',
    'Retro': 'retro styled creature, vintage look, old-school',
    'Fragmented': 'fragmented creature, broken pieces, scattered',
    'Angular': 'angular creature, sharp edges, pointed',
    'Minimalist': 'minimalist creature, simple clean design, understated',
    'Delicate': 'delicate creature, fine details, fragile looking',
    'Chunky': 'chunky creature, thick stocky, solid',
    'Flickering': 'flickering creature, unstable appearance, shifting',
    'Stormy': 'stormy creature, tempestuous, turbulent',
    'Sleek': 'sleek creature, smooth streamlined, modern',
    'Regal': 'regal creature, majestic bearing, royal',
    'Vaporwave': 'vaporwave aesthetic creature, retro-futuristic, neon pastels',
    'Ornate': 'ornate creature, intricate details, decorated',
    'Crystal': 'crystalline creature, gemstone texture, faceted',
    'Cyberpunk': 'cyberpunk creature, neon accents, futuristic tech',
    'Steampunk': 'steampunk creature, brass gears, Victorian tech',
    'Rhythmic': 'rhythmic creature, musical patterns, flowing motion',
    'Rune-based': 'rune-covered creature, magical symbols, mystical markings',
    'Majestic': 'majestic creature, grand impressive, awe-inspiring',
    'Cosmic': 'cosmic creature, star-filled, universe themed'
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
    'Air': 'swirling wind, air currents, gentle breeze effects',
    'Chaos': 'chaotic energy swirls, unstable patterns',
    'Code': 'digital patterns, matrix code, tech patterns',
    'Cosmic': 'cosmic dust, star particles, nebula wisps',
    'Crystal': 'crystalline patterns, gem reflections, faceted light',
    'Dream': 'dreamy particles, soft nebula effects, ethereal mist',
    'Earth': 'rocky texture, stone fragments, earthen aura',
    'Electric': 'electrical sparks, energy bolts, crackling power',
    'Energy': 'pure energy waves, power surges, glowing essence',
    'Fire': 'subtle fire effects, warm glow, flame accents',
    'Gravity': 'floating debris, gravity distortion effects, spatial warping',
    'Ice': 'frost crystals, icy effects, cold mist',
    'Light': 'glowing aura, light rays, radiant effect',
    'Lightning': 'electric sparks, lightning details, energy crackling',
    'Magic': 'magical sparkles, mystical runes, arcane glow',
    'Nature': 'small leaves, flower details, natural elements',
    'Order': 'geometric patterns, structured energy, perfect symmetry',
    'Shadow': 'dark aura, shadow wisps, mysterious glow',
    'Sound': 'sound wave effects, musical notes, vibration lines',
    'Space': 'stars, void background, cosmic emptiness',
    'Spirit': 'ethereal glow, spiritual wisps, ghostly aura',
    'Storm': 'storm clouds, lightning flashes, turbulent energy',
    'Time': 'clock motifs, temporal distortion, time particles',
    'Void': 'void energy, dark particles, emptiness aura',
    'Water': 'water droplets, flowing water elements, blue shimmer'
  }
};

function generateDetailedPrompt(creature) {
  const parts = [];

  // Base description
  const style = creature.style_name;
  const material = promptTemplates.materials[style] || 'cute living creature, natural style';
  parts.push(material);

  // Subject with mood - use description if available
  const mood = creature.mood_name.toLowerCase();
  const subspecies = creature.subspecies_name.toLowerCase();

  if (creature.subspecies_description) {
    // Use detailed description
    parts.push(`${mood} ${creature.subspecies_description}`, 'single creature only', 'one creature');
  } else {
    // Fallback to subspecies name
    parts.push(`${mood} ${subspecies} creature character`, 'single creature only', 'one creature');
  }

  parts.push('full body visible', 'complete creature');

  // Colors - more descriptive
  const colors = creature.colouring_name.toLowerCase().split(' & ');
  if (colors.length === 2) {
    parts.push(`${colors[0]} and ${colors[1]} color scheme`);
  } else {
    parts.push(`${creature.colouring_name.toLowerCase()} colors`);
  }

  // Pose/Motion
  const motion = promptTemplates.poses[creature.motion_name] || creature.motion_name.toLowerCase();
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

  // Always add these - ensure full creature in frame, NOT HUMAN but CUTE
  parts.push('cute creature', 'adorable', 'friendly', 'charming', 'animal creature', 'non-human', 'natural environment', 'dynamic pose', 'stylized 3D art', 'no stand', 'no base', 'no pedestal', 'full body shot', 'creature centered', 'entire creature visible');

  return parts.join(', ');
}

function generateNegativePrompt() {
  return 'blurry, low quality, distorted, ugly, bad anatomy, text, watermark, realistic photo, scary, creepy, horror, human, person, people, man, woman, child, human face, human body, humanoid, anthropomorphic, human features, facial features, person in costume, cosplay, fursuit, mascot costume, suit, costume, human wearing, human skin, hands, fingers, human eyes, human nose, human mouth, nsfw, deformed, mutated, extra limbs, bad proportions, stand, pedestal, platform, base, display stand, statue base, mounted, toy stand, figurine base, cropped, cut off, partial view, close up, zoomed in, body cut off, out of frame, abstract, object, item, tool, weapon, inanimate object, not a creature, multiple creatures, two creatures, three creatures, many creatures, several creatures, crowd, group, duplicate';
}

async function exportDetailedPrompts() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Get all creatures with subspecies descriptions
    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.creature_shortname,
        c.rarity_tier,
        dss.subspecies_name,
        dss.description as subspecies_description,
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
