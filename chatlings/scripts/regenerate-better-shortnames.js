/**
 * Improved Shortname Generator
 * Creates blended names like: Crifallagra, Reseneurfi, Duenjosalt
 * NOT like: AggressivAurumA, KogekiKinBat
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

// Translation dictionary
const translations = {
  // Moods
  aggressive: { es: 'agresivo', it: 'aggressivo', fr: 'agressif', la: 'ferox' },
  proud: { es: 'orgulloso', it: 'fiero', fr: 'fier', la: 'superbus' },
  wise: { la: 'sapiens', el: 'sophos', it: 'saggio', es: 'sabio' },
  calm: { la: 'tranquillus', it: 'calmo', es: 'tranquilo' },
  fierce: { la: 'ferox', es: 'feroz', it: 'feroce' },
  noble: { la: 'nobilis', es: 'noble', it: 'nobile' },
  watchful: { la: 'vigilans', es: 'vigilante', it: 'vigile' },
  mysterious: { la: 'mysticus', es: 'misterioso', it: 'misterioso' },
  playful: { es: 'jugueton', it: 'giocoso', fr: 'joueur', nl: 'speels' },
  wild: { la: 'ferus', es: 'salvaje', it: 'selvaggio' },
  gentle: { la: 'mitis', es: 'gentil', it: 'gentile', fr: 'doux' },

  // Colors
  gold: { la: 'aur', es: 'oro', it: 'oro' },
  silver: { la: 'arg', es: 'plat', it: 'argent' },
  black: { la: 'nig', es: 'negr', it: 'nero' },
  white: { la: 'alb', es: 'blanc', it: 'bianc' },
  red: { la: 'rub', es: 'roj', it: 'ross' },
  crimson: { la: 'coccin', es: 'carmesi', it: 'cremis' },
  bronze: { la: 'aes', es: 'bronc', it: 'bronz' },

  // Creature types
  dragon: { la: 'drac', es: 'dragon', it: 'drag', cy: 'draig' },
  glitch: { es: 'fall', it: 'glitch', fr: 'anomal' },
  creature: { la: 'creat', es: 'criat', it: 'creat' },
  neural: { es: 'neur', it: 'neural', fr: 'neur' },
  network: { es: 'red', it: 'ret', fr: 'rese' },
  pixel: { es: 'pix', it: 'pixel', pt: 'pix' },
  pet: { es: 'mascot', pt: 'bich', it: 'anim' },
  blob: { es: 'mas', nl: 'slim', it: 'blob' },
  goo: { es: 'bab', nl: 'slim', it: 'melm' },
  gremlin: { es: 'duend', it: 'follett', fr: 'lutin' },
  googly: { es: 'salton', it: 'sporgent', pt: 'arregal' },
  eyed: { es: 'ojo', it: 'occhi', pt: 'olho' },
  lion: { la: 'leo', es: 'leon', it: 'leon', sw: 'simb' },
  wolf: { la: 'lup', es: 'lob', it: 'lup' },
  fox: { la: 'vulp', es: 'zorr', it: 'volp' },
  bear: { la: 'urs', es: 'os', it: 'ors' },
};

function cleanWord(word) {
  return word.toLowerCase().replace(/[^a-z]/g, '');
}

function chooseLanguage(species, subspecies, mood) {
  const spec = (species + subspecies).toLowerCase();

  // Tech/Digital -> Spanish, French, Italian
  if (/glitch|ai|cyber|digital|code|neural|network/.test(spec)) {
    return ['es', 'fr', 'it'][Math.floor(Math.random() * 3)];
  }
  // Mythical -> Latin or Greek
  else if (/dragon|phoenix|chimera|basilisk|griffin/.test(spec)) {
    return Math.random() > 0.5 ? 'la' : 'el';
  }
  // Cartoon/Playful -> Spanish, Italian, Dutch
  else if (/blob|goo|pixel|gremlin|cube|pet/.test(spec)) {
    return ['es', 'it', 'nl', 'pt'][Math.floor(Math.random() * 4)];
  }
  // Cosmic -> Greek or Latin
  else if (/cosmic|nebula|time|space|gravity/.test(spec)) {
    return Math.random() > 0.5 ? 'el' : 'la';
  }
  // Default
  else {
    return ['la', 'es', 'it', 'fr'][Math.floor(Math.random() * 4)];
  }
}

function translateWord(word, lang) {
  const clean = cleanWord(word);
  if (translations[clean] && translations[clean][lang]) {
    return translations[clean][lang];
  }
  return clean;
}

function blendSyllables(parts, maxLength = 12) {
  if (parts.length === 0) return 'unnamed';
  if (parts.length === 1) return parts[0].substring(0, maxLength);

  let result = '';

  // Take meaningful chunks from each part
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0) {
      // First word: take 3-5 chars
      result += part.substring(0, Math.min(5, part.length));
    } else if (i === parts.length - 1) {
      // Last word: take last 3-4 chars
      result += part.substring(Math.max(0, part.length - 4));
    } else {
      // Middle words: take 2-3 chars
      result += part.substring(0, Math.min(3, part.length));
    }
  }

  // Trim to max length
  result = result.substring(0, maxLength);

  // Clean up difficult consonant clusters
  result = result.replace(/([bcdfghjklmnpqrstvwxyz]){4,}/g, match => match.substring(0, 3));

  return result;
}

function generateShortname(creatureName, species, subspecies, mood) {
  // Parse name
  let words = creatureName.toLowerCase().split(/\s+/);
  words = words.filter(w => !['the', 'of', 'a', 'an'].includes(w));

  // Choose language
  const lang = chooseLanguage(species, subspecies, mood);

  // Translate words
  const translated = words.map(w => translateWord(w, lang)).filter(t => t);

  if (translated.length === 0) {
    translated.push(...words.map(cleanWord));
  }

  // Blend them
  let shortname = blendSyllables(translated, 12);

  // Capitalize first letter only
  shortname = shortname.charAt(0).toUpperCase() + shortname.slice(1).toLowerCase();

  // Map language codes
  const langMap = {
    es: 'Spanish',
    it: 'Italian',
    fr: 'French',
    la: 'Latin',
    el: 'Greek',
    de: 'German',
    nl: 'Dutch',
    pt: 'Portuguese',
    cy: 'Welsh',
    sw: 'Swahili'
  };

  return { shortname, language: langMap[lang] || lang };
}

function generatePronunciation(shortname) {
  const lower = shortname.toLowerCase();
  const syllables = [];
  let current = '';
  const vowels = 'aeiou';

  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    current += char;

    // Break on vowel followed by consonant
    if (vowels.includes(char) && i < lower.length - 1 && !vowels.includes(lower[i + 1])) {
      if (current.length >= 2) {
        syllables.push(current);
        current = '';
      }
    }
  }

  if (current) syllables.push(current);
  if (syllables.length === 0) syllables.push(lower);

  // Capitalize stressed syllable
  if (syllables.length > 1) {
    const stressIdx = syllables.length === 2 ? 0 : 1;
    syllables[stressIdx] = syllables[stressIdx].toUpperCase();
  }

  return syllables.join('-');
}

function generateVibe(mood, species) {
  const vibeMap = {
    aggressive: ['Fierce', 'Brutal', 'Combative', 'Hostile'],
    proud: ['Regal', 'Majestic', 'Noble', 'Stately'],
    wise: ['Sage', 'Ancient', 'Enlightened', 'Scholarly'],
    calm: ['Serene', 'Tranquil', 'Peaceful', 'Zen'],
    fierce: ['Savage', 'Wild', 'Ferocious', 'Primal'],
    playful: ['Whimsical', 'Fun', 'Bouncy', 'Cheerful'],
    mysterious: ['Cryptic', 'Enigmatic', 'Shadowy', 'Arcane'],
  };

  const moodLower = mood.toLowerCase();
  const options = vibeMap[moodLower] || ['Unique', 'Mysterious', 'Peculiar'];
  let vibe = options[Math.floor(Math.random() * options.length)];

  // Add prefix for digital creatures
  if (/glitch|ai|cyber|digital/.test(species.toLowerCase())) {
    vibe = `Digital-${vibe.toLowerCase()}`;
  }

  return vibe;
}

async function generateAll() {
  const client = new Client(config);

  try {
    console.log('========================================');
    console.log('Generating Improved Shortnames');
    console.log('========================================\n');

    await client.connect();
    console.log('✓ Connected\n');

    const result = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.rarity_tier,
        ds.species_name,
        dss.subspecies_name,
        dm.mood_name
      FROM creatures c
      JOIN dim_species ds ON c.species_id = ds.id
      JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      JOIN dim_mood dm ON c.mood_id = dm.id
      ORDER BY c.creature_name
    `);

    console.log(`Found ${result.rows.length} creatures\n`);

    const updates = [];
    for (let i = 0; i < result.rows.length; i++) {
      const { id, creature_name, species_name, subspecies_name, mood_name, rarity_tier } = result.rows[i];

      const { shortname, language } = generateShortname(creature_name, species_name, subspecies_name, mood_name);
      const pronunciation = generatePronunciation(shortname);
      const vibe = generateVibe(mood_name, species_name);

      updates.push({ id, shortname, language, pronunciation, vibe });

      // Show first 20
      if (i < 20) {
        console.log(`${creature_name}`);
        console.log(`  → ${shortname} (${language})`);
        console.log(`  → [${pronunciation}] - ${vibe}\n`);
      }

      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${result.rows.length}...`);
      }
    }

    // Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'creature_shortnames_v2.json');
    fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2));

    console.log(`\n✓ Generated ${updates.length} shortnames`);
    console.log(`✓ Saved to: ${outputPath}\n`);

    // Preview
    console.log('========================================');
    console.log('Sample Shortnames:');
    console.log('========================================\n');

    updates.slice(0, 30).forEach(u => {
      console.log(`${u.shortname.padEnd(18)} | ${u.language.padEnd(10)} | ${u.pronunciation.padEnd(20)} | ${u.vibe}`);
    });

    console.log('\n========================================');
    console.log('Complete!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Review the shortnames above');
    console.log('2. If satisfied, update database with these names\n');

    await client.end();
    return updates;

  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    throw error;
  }
}

if (require.main === module) {
  generateAll().catch(console.error);
}

module.exports = { generateAll };
