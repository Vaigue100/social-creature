/**
 * Generate diverse creatures with balanced distribution
 * Uses ALL available dimensions for maximum variety
 */

const { Client } = require('pg');
const crypto = require('crypto');
const config = { ...require('./db-config'), database: 'chatlings' };

// UUID generator
const uuidv4 = () => crypto.randomUUID();

// Helper to pick random item
function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate creature name
function generateName(subspecies, color, mood) {
  const colorPart = color.split(' & ')[0]; // Just first color
  return `${mood} ${colorPart} ${subspecies}`;
}

// Get shortname (simple version)
function generateShortname(name) {
  return name.replace(/\s+/g, '').substring(0, 12).toLowerCase();
}

async function generateDiverseCreatures(targetCount = 10000) {
  const client = new Client(config);
  await client.connect();

  console.log('Loading all dimension options...\n');

  // Get ALL options from each dimension
  const subspecies = (await client.query('SELECT id, subspecies_name FROM dim_subspecies')).rows;
  const colors = (await client.query('SELECT id, colouring_name FROM dim_colouring')).rows;
  const styles = (await client.query('SELECT id, style_name FROM dim_style')).rows;
  const moods = (await client.query('SELECT id, mood_name FROM dim_mood')).rows;
  const motions = (await client.query('SELECT id, motion_name FROM dim_motion_type')).rows;
  const elements = (await client.query('SELECT id, affinity_name FROM dim_elemental_affinity')).rows;
  const environments = (await client.query('SELECT id, environment_name FROM dim_environment')).rows;
  const species = (await client.query('SELECT id FROM dim_species LIMIT 1')).rows[0];

  console.log('Available options:');
  console.log(`  Subspecies: ${subspecies.length}`);
  console.log(`  Colors: ${colors.length}`);
  console.log(`  Styles: ${styles.length}`);
  console.log(`  Moods: ${moods.length}`);
  console.log(`  Motions: ${motions.length}`);
  console.log(`  Elements: ${elements.length}`);
  console.log(`  Environments: ${environments.length}`);
  console.log();

  const rarities = ['Common', 'Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

  console.log(`Generating ${targetCount} diverse creatures...\n`);

  let created = 0;
  let batch = [];
  const batchSize = 500;

  for (let i = 0; i < targetCount; i++) {
    // Pick random from EACH dimension
    const subspeciesChoice = pick(subspecies);
    const colorChoice = pick(colors);
    const styleChoice = pick(styles);
    const moodChoice = pick(moods);
    const motionChoice = pick(motions);
    const elementChoice = pick(elements);
    const environmentChoice = pick(environments);
    const rarity = pick(rarities);

    const name = generateName(
      subspeciesChoice.subspecies_name,
      colorChoice.colouring_name,
      moodChoice.mood_name
    );

    const shortname = generateShortname(name);

    batch.push({
      id: uuidv4(),
      name,
      shortname,
      species_id: species.id,
      subspecies_id: subspeciesChoice.id,
      colouring_id: colorChoice.id,
      style_id: styleChoice.id,
      mood_id: moodChoice.id,
      motion_type_id: motionChoice.id,
      elemental_affinity_id: elementChoice.id,
      environment_id: environmentChoice.id,
      rarity_tier: rarity
    });

    // Insert in batches
    if (batch.length >= batchSize || i === targetCount - 1) {
      try {
        await client.query('BEGIN');

        for (const creature of batch) {
          await client.query(`
            INSERT INTO creatures (
              id, creature_name, creature_shortname, species_id,
              subspecies_id, colouring_id, style_id, mood_id, motion_type_id,
              elemental_affinity_id, environment_id, rarity_tier
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            creature.id, creature.name, creature.shortname,
            creature.species_id, creature.subspecies_id, creature.colouring_id,
            creature.style_id, creature.mood_id, creature.motion_type_id,
            creature.elemental_affinity_id, creature.environment_id, creature.rarity_tier
          ]);
        }

        await client.query('COMMIT');
        created += batch.length;
        console.log(`  Created ${created}/${targetCount}...`);
        batch = [];

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  Batch failed: ${error.message}`);
      }
    }
  }

  await client.end();

  console.log(`\n[SUCCESS] Created ${created} diverse creatures!`);
  return created;
}

// Run it
const targetCount = parseInt(process.argv[2]) || 10000;
generateDiverseCreatures(targetCount)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
