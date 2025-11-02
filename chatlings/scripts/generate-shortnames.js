/**
 * Generate shortnames for all creatures
 * Converts creature names to other languages and creates phonetically pleasing shortnames
 */

const { Client } = require('pg');

const config = { ...require('./db-config'), database: 'chatlings' };

// Translation dictionaries for different creature name components
const translations = {
  // Adjectives/Moods
  aggressive: {
    spanish: 'Agresivo',
    italian: 'Aggressivo',
    french: 'Agressif',
    german: 'Aggressiv',
    portuguese: 'Agressivo',
    japanese: 'Kogeki'
  },
  proud: {
    spanish: 'Orgulloso',
    italian: 'Fiero',
    french: 'Fier',
    latin: 'Superbus',
    portuguese: 'Orgulhoso',
    japanese: 'Hokori'
  },
  wise: {
    latin: 'Sapiens',
    greek: 'Sophos',
    italian: 'Saggio',
    spanish: 'Sabio',
    french: 'Sage',
    japanese: 'Kenmei'
  },
  calm: {
    latin: 'Tranquillus',
    italian: 'Calmo',
    spanish: 'Tranquilo',
    french: 'Calme',
    japanese: 'Odayaka'
  },
  fierce: {
    latin: 'Ferox',
    spanish: 'Feroz',
    italian: 'Feroce',
    french: 'Féroce',
    japanese: 'Moretsu'
  },
  noble: {
    latin: 'Nobilis',
    spanish: 'Noble',
    italian: 'Nobile',
    french: 'Noble',
    japanese: 'Koki'
  },
  watchful: {
    latin: 'Vigilans',
    spanish: 'Vigilante',
    italian: 'Vigile',
    french: 'Vigilant',
    japanese: 'Keikai'
  },
  mysterious: {
    latin: 'Mysticus',
    spanish: 'Misterioso',
    italian: 'Misterioso',
    french: 'Mystérieux',
    japanese: 'Shinpi'
  },
  dominant: {
    latin: 'Dominans',
    spanish: 'Dominante',
    italian: 'Dominante',
    french: 'Dominant',
    japanese: 'Shihai'
  },
  playful: {
    spanish: 'Juguetón',
    italian: 'Giocoso',
    french: 'Joueur',
    japanese: 'Asobi',
    dutch: 'Speels'
  },
  skittish: {
    spanish: 'Asustadizo',
    italian: 'Pauroso',
    dutch: 'Schichtig',
    japanese: 'Okubyou'
  },
  joyful: {
    latin: 'Laetus',
    spanish: 'Alegre',
    italian: 'Gioioso',
    french: 'Joyeux',
    japanese: 'Yorokobi'
  },
  focused: {
    latin: 'Intentus',
    spanish: 'Enfocado',
    italian: 'Focalizzato',
    japanese: 'Shuchuu'
  },
  curious: {
    latin: 'Curiosus',
    spanish: 'Curioso',
    italian: 'Curioso',
    french: 'Curieux',
    japanese: 'Koukishin'
  },
  clever: {
    latin: 'Callidus',
    spanish: 'Astuto',
    italian: 'Astuto',
    french: 'Malin',
    japanese: 'Kashikoi'
  },
  gentle: {
    latin: 'Mitis',
    spanish: 'Gentil',
    italian: 'Gentile',
    french: 'Doux',
    japanese: 'Yasashii'
  },
  wild: {
    latin: 'Ferus',
    spanish: 'Salvaje',
    italian: 'Selvaggio',
    french: 'Sauvage',
    japanese: 'Yasei'
  },
  stoic: {
    latin: 'Stoicus',
    greek: 'Stoikos',
    spanish: 'Estoico',
    italian: 'Stoico'
  },
  silly: {
    spanish: 'Tonto',
    italian: 'Sciocco',
    french: 'Bête',
    dutch: 'Gek',
    japanese: 'Baka'
  },
  mischievous: {
    spanish: 'Travieso',
    italian: 'Dispettoso',
    french: 'Espiègle',
    japanese: 'Itazura'
  },
  goofy: {
    spanish: 'Bobo',
    italian: 'Buffo',
    dutch: 'Dwaas',
    japanese: 'Manuke'
  },
  chatty: {
    spanish: 'Charlatán',
    italian: 'Chiacchierone',
    french: 'Bavard',
    japanese: 'Oshaberi'
  },
  neutral: {
    latin: 'Neutralis',
    spanish: 'Neutral',
    italian: 'Neutrale',
    japanese: 'Chuuritsu'
  },
  chaotic: {
    greek: 'Chaotikos',
    latin: 'Chaoticus',
    spanish: 'Caótico',
    japanese: 'Konton'
  },
  peaceful: {
    latin: 'Pacificus',
    spanish: 'Pacífico',
    italian: 'Pacifico',
    japanese: 'Heiwa'
  },
  dreamy: {
    spanish: 'Soñador',
    italian: 'Sognante',
    french: 'Rêveur',
    japanese: 'Yumemiru'
  },
  energetic: {
    latin: 'Energicus',
    spanish: 'Enérgico',
    italian: 'Energico',
    japanese: 'Genki'
  },
  shy: {
    spanish: 'Tímido',
    italian: 'Timido',
    french: 'Timide',
    japanese: 'Uchiki'
  },
  enigmatic: {
    greek: 'Ainigmatikos',
    latin: 'Aenigmaticus',
    spanish: 'Enigmático',
    japanese: 'Nazo'
  },
  angry: {
    latin: 'Iratus',
    spanish: 'Enojado',
    italian: 'Arrabbiato',
    japanese: 'Ikari'
  },
  hopeful: {
    latin: 'Sperans',
    spanish: 'Esperanzado',
    italian: 'Speranzoso',
    japanese: 'Kibou'
  },
  intense: {
    latin: 'Intensus',
    spanish: 'Intenso',
    italian: 'Intenso',
    japanese: 'Gekishii'
  },
  reflective: {
    latin: 'Reflexivus',
    spanish: 'Reflexivo',
    italian: 'Riflessivo',
    japanese: 'Hansei'
  },
  elated: {
    latin: 'Elatus',
    spanish: 'Exaltado',
    italian: 'Esaltato',
    japanese: 'Koufun'
  },
  calculating: {
    latin: 'Calans',
    spanish: 'Calculador',
    italian: 'Calcolatore',
    japanese: 'Keisan'
  },
  menacing: {
    latin: 'Minax',
    spanish: 'Amenazante',
    italian: 'Minaccioso',
    japanese: 'Kyoui'
  },
  elusive: {
    latin: 'Elusivus',
    spanish: 'Elusivo',
    italian: 'Sfuggente',
    japanese: 'Toraenikui'
  },
  excited: {
    latin: 'Excitatus',
    spanish: 'Emocionado',
    italian: 'Eccitato',
    japanese: 'Koufun'
  },
  analytical: {
    greek: 'Analytikos',
    latin: 'Analyticus',
    spanish: 'Analítico',
    japanese: 'Bunseki'
  },

  // Colors
  gold: { latin: 'Aurum', spanish: 'Oro', italian: 'Oro', japanese: 'Kin' },
  silver: { latin: 'Argentum', spanish: 'Plata', italian: 'Argento', japanese: 'Gin' },
  black: { latin: 'Niger', spanish: 'Negro', italian: 'Nero', japanese: 'Kuro' },
  white: { latin: 'Albus', spanish: 'Blanco', italian: 'Bianco', japanese: 'Shiro' },
  red: { latin: 'Ruber', spanish: 'Rojo', italian: 'Rosso', japanese: 'Aka' },
  blue: { latin: 'Caeruleus', spanish: 'Azul', italian: 'Blu', japanese: 'Ao' },
  green: { latin: 'Viridis', spanish: 'Verde', italian: 'Verde', japanese: 'Midori' },
  crimson: { latin: 'Coccineus', spanish: 'Carmesí', italian: 'Cremisi', japanese: 'Shinku' },
  bronze: { latin: 'Aes', spanish: 'Bronce', italian: 'Bronzo', japanese: 'Seidou' },

  // Creature types
  dragon: { latin: 'Draco', spanish: 'Dragón', italian: 'Drago', japanese: 'Ryuu', welsh: 'Draig' },
  lion: { latin: 'Leo', spanish: 'León', italian: 'Leone', japanese: 'Raion', swahili: 'Simba' },
  wolf: { latin: 'Lupus', spanish: 'Lobo', italian: 'Lupo', japanese: 'Ookami' },
  fox: { latin: 'Vulpes', spanish: 'Zorro', italian: 'Volpe', japanese: 'Kitsune' },
  phoenix: { latin: 'Phoenix', greek: 'Phoinix', spanish: 'Fénix', japanese: 'Fuenikkusu' },
  serpent: { latin: 'Serpens', spanish: 'Serpiente', italian: 'Serpente', japanese: 'Hebi' },
  eagle: { latin: 'Aquila', spanish: 'Águila', italian: 'Aquila', japanese: 'Washi' },
  owl: { latin: 'Strix', spanish: 'Búho', italian: 'Gufo', japanese: 'Fukurou' },
  bear: { latin: 'Ursus', spanish: 'Oso', italian: 'Orso', japanese: 'Kuma' },
  tiger: { latin: 'Tigris', spanish: 'Tigre', italian: 'Tigre', japanese: 'Tora' },

  // Generic terms
  creature: { latin: 'Creatura', spanish: 'Criatura', italian: 'Creatura', japanese: 'Seibutsu' },
  beast: { latin: 'Bestia', spanish: 'Bestia', italian: 'Bestia', japanese: 'Kemono' },
  spirit: { latin: 'Spiritus', spanish: 'Espíritu', italian: 'Spirito', japanese: 'Sei' },
  shadow: { latin: 'Umbra', spanish: 'Sombra', italian: 'Ombra', japanese: 'Kage' },
  light: { latin: 'Lux', spanish: 'Luz', italian: 'Luce', japanese: 'Hikari' },
  fire: { latin: 'Ignis', spanish: 'Fuego', italian: 'Fuoco', japanese: 'Hi' },
  water: { latin: 'Aqua', spanish: 'Agua', italian: 'Acqua', japanese: 'Mizu' },
  earth: { latin: 'Terra', spanish: 'Tierra', italian: 'Terra', japanese: 'Tsuchi' },
  glitch: { spanish: 'Falla', italian: 'Glitch', japanese: 'Guritchi' },
  pixel: { spanish: 'Píxel', italian: 'Pixel', japanese: 'Pikuseru' },
  blob: { spanish: 'Masa', italian: 'Blob', dutch: 'Slijm', japanese: 'Katamari' },
  goo: { spanish: 'Baba', italian: 'Melma', dutch: 'Slijm', japanese: 'Neba' },
  network: { spanish: 'Red', italian: 'Rete', french: 'Réseau', japanese: 'Netto' },
  neural: { spanish: 'Neuronal', italian: 'Neurale', french: 'Neural', japanese: 'Shinkei' },
  pet: { spanish: 'Mascota', italian: 'Animale', portuguese: 'Bicho', japanese: 'Petto' },
  gremlin: { spanish: 'Duende', italian: 'Folletto', french: 'Lutin', japanese: 'Guremurin' }
};

// Language preferences for different creature types/moods
const languagePreferences = {
  // Mythical creatures -> Latin, Greek, Welsh
  mythical: ['latin', 'greek', 'welsh', 'japanese'],
  // Tech creatures -> German, Japanese
  tech: ['german', 'japanese', 'french'],
  // Cartoon creatures -> Spanish, Italian, Dutch
  cartoon: ['spanish', 'italian', 'dutch', 'french'],
  // Nature creatures -> Latin, Italian
  nature: ['latin', 'italian', 'spanish'],
  // Cosmic creatures -> Greek, Latin
  cosmic: ['greek', 'latin', 'japanese'],
  // Real animals -> Latin, Swahili, various
  real: ['latin', 'spanish', 'italian', 'japanese', 'swahili']
};

function cleanWord(word) {
  return word.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/the/g, '')
    .replace(/of/g, '');
}

function getLanguageForCreature(species, subspecies, mood) {
  // Determine best language based on creature type
  const speciesLower = species.toLowerCase();
  const subspeciesLower = subspecies.toLowerCase();

  if (speciesLower.includes('dragon') || speciesLower.includes('phoenix') || subspeciesLower.includes('dragon')) {
    return Math.random() > 0.5 ? 'latin' : 'greek';
  } else if (speciesLower.includes('ai') || speciesLower.includes('glitch') || speciesLower.includes('cyber')) {
    return Math.random() > 0.5 ? 'japanese' : 'german';
  } else if (speciesLower.includes('blob') || speciesLower.includes('cartoon') || speciesLower.includes('pixel')) {
    return Math.random() > 0.5 ? 'spanish' : 'italian';
  } else if (speciesLower.includes('cosmic') || speciesLower.includes('nebula') || speciesLower.includes('time')) {
    return Math.random() > 0.6 ? 'greek' : 'latin';
  } else if (speciesLower.includes('tree') || speciesLower.includes('nature')) {
    return Math.random() > 0.5 ? 'latin' : 'italian';
  } else {
    // Default: mix it up
    const languages = ['latin', 'spanish', 'italian', 'japanese', 'greek', 'french'];
    return languages[Math.floor(Math.random() * languages.length)];
  }
}

function translateWord(word, preferredLanguage) {
  const cleanedWord = cleanWord(word);

  if (translations[cleanedWord]) {
    if (translations[cleanedWord][preferredLanguage]) {
      return translations[cleanedWord][preferredLanguage];
    }
    // Fallback to first available translation
    const availableLanguages = Object.keys(translations[cleanedWord]);
    return translations[cleanedWord][availableLanguages[0]];
  }

  // If no translation, try to make it sound foreign
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function generateShortname(creatureName, species, subspecies, mood) {
  const language = getLanguageForCreature(species, subspecies, mood);

  // Parse the creature name
  const words = creatureName.split(' ')
    .filter(w => w.toLowerCase() !== 'the' && w.toLowerCase() !== 'of')
    .map(w => w.toLowerCase());

  // Translate each significant word
  const translatedWords = words.map(word => translateWord(word, language));

  // Combine and shorten
  let combined = translatedWords.join('');

  // Remove accents and special characters
  combined = combined.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Shorten if too long (keep it under 15 characters)
  if (combined.length > 15) {
    // Try to keep meaningful parts
    combined = combined.substring(0, 15);
  }

  // Ensure it starts with capital
  combined = combined.charAt(0).toUpperCase() + combined.slice(1);

  return { shortname: combined, language };
}

function generatePronunciation(shortname, language) {
  // Generate phonetic pronunciation based on language rules
  let pronunciation = shortname.toLowerCase();

  if (language === 'latin' || language === 'italian') {
    // Each vowel is pronounced
    pronunciation = pronunciation.replace(/ae/g, 'AY');
    pronunciation = pronunciation.replace(/oe/g, 'OY');
  } else if (language === 'spanish' || language === 'portuguese') {
    pronunciation = pronunciation.replace(/ll/g, 'Y');
    pronunciation = pronunciation.replace(/ñ/g, 'NY');
  } else if (language === 'french') {
    pronunciation = pronunciation.replace(/eau/g, 'OH');
    pronunciation = pronunciation.replace(/eu/g, 'UH');
  } else if (language === 'japanese') {
    // Syllable-based
    pronunciation = pronunciation.match(/.{1,2}/g).join('-');
  }

  // Add stress markers (capital for stressed syllable)
  const parts = pronunciation.match(/.{1,4}/g) || [pronunciation];
  if (parts.length > 1) {
    // Stress usually on first or second syllable
    const stressIndex = Math.random() > 0.6 ? 0 : Math.min(1, parts.length - 1);
    parts[stressIndex] = parts[stressIndex].toUpperCase();
  }

  return parts.join('-');
}

function generateVibe(mood, species, rarity) {
  const vibes = {
    aggressive: ['Fierce', 'Intense', 'Combative', 'Hostile', 'Brutal'],
    proud: ['Regal', 'Majestic', 'Dignified', 'Noble', 'Stately'],
    wise: ['Sage', 'Enlightened', 'Knowing', 'Ancient', 'Scholarly'],
    calm: ['Serene', 'Tranquil', 'Peaceful', 'Composed', 'Zen'],
    fierce: ['Savage', 'Wild', 'Ferocious', 'Untamed', 'Primal'],
    playful: ['Whimsical', 'Fun', 'Bouncy', 'Cheerful', 'Jovial'],
    mysterious: ['Cryptic', 'Enigmatic', 'Shadowy', 'Arcane', 'Veiled'],
    silly: ['Goofy', 'Absurd', 'Wacky', 'Ridiculous', 'Comical'],
    chaotic: ['Unpredictable', 'Turbulent', 'Erratic', 'Volatile', 'Anarchic'],
    energetic: ['Dynamic', 'Vibrant', 'Electric', 'Spirited', 'Lively']
  };

  const moodLower = mood.toLowerCase();
  const vibeOptions = vibes[moodLower] || ['Mysterious', 'Unique', 'Peculiar', 'Distinct'];

  let vibe = vibeOptions[Math.floor(Math.random() * vibeOptions.length)];

  // Add tech/synthetic modifier
  if (species.toLowerCase().includes('glitch') || species.toLowerCase().includes('ai') || species.toLowerCase().includes('cyber')) {
    vibe = 'Digital-' + vibe.toLowerCase();
  }

  // Add cosmic modifier
  if (species.toLowerCase().includes('cosmic') || species.toLowerCase().includes('nebula')) {
    vibe = 'Cosmic-' + vibe.toLowerCase();
  }

  return vibe;
}

async function generateAllShortnames() {
  const client = new Client(config);

  try {
    console.log('========================================');
    console.log('Generating Creature Shortnames');
    console.log('========================================\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    // Get all creatures
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
    console.log('Generating shortnames...\n');

    let processed = 0;
    const updates = [];

    for (const creature of result.rows) {
      const { id, creature_name, species_name, subspecies_name, mood_name, rarity_tier } = creature;

      const { shortname, language } = generateShortname(
        creature_name,
        species_name,
        subspecies_name,
        mood_name
      );

      const pronunciation = generatePronunciation(shortname, language);
      const vibe = generateVibe(mood_name, species_name, rarity_tier);

      updates.push({
        id,
        shortname,
        language,
        pronunciation,
        vibe
      });

      processed++;
      if (processed % 100 === 0) {
        console.log(`  Progress: ${processed}/${result.rows.length} creatures...`);
      }

      // Show first 10 as examples
      if (processed <= 10) {
        console.log(`  ${creature_name}`);
        console.log(`    → ${shortname} (${language}) [${pronunciation}] - ${vibe}\n`);
      }
    }

    console.log(`\n✓ Generated ${updates.length} shortnames\n`);

    // Save to file for review
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'data', 'creature_shortnames.json');
    fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2));
    console.log(`✓ Saved to: ${outputPath}\n`);

    console.log('Preview of generated shortnames:');
    console.log('========================================\n');
    updates.slice(0, 20).forEach(u => {
      console.log(`${u.shortname.padEnd(20)} | ${u.language.padEnd(12)} | ${u.pronunciation.padEnd(25)} | ${u.vibe}`);
    });

    console.log('\n========================================');
    console.log('Generation complete!');
    console.log('========================================\n');
    console.log('Next: Review the data, then run update-shortnames.js to add to database');

    await client.end();
    return updates;

  } catch (error) {
    console.error('Error:', error);
    await client.end();
    throw error;
  }
}

if (require.main === module) {
  generateAllShortnames().catch(console.error);
}

module.exports = { generateAllShortnames };
