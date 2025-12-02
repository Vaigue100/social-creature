const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

const requestedBodyTypes = [
  'Elf', 'Dwarf', 'Human', 'Orc', 'Goblin', 'Troll', 'Giant', 'Halfling', 'Gnome',
  'Dragonkin', 'Lizardfolk', 'Minotaur', 'Centaur', 'Merfolk', 'Satyr', 'Cyclops',
  'Ogre', 'Undead', 'Shadowspawn', 'Specter', 'Phantom', 'Fairy', 'Sprite', 'Nymph',
  'Dryad', 'Elemental', 'Djinn', 'Angel', 'Demon', 'Devil', 'Fallen Angel', 'Nephilim',
  'Beastfolk', 'Kobold', 'Harpy', 'Insectoid', 'Slimefolk', 'Plantfolk', 'Construct',
  'Golem', 'Chimera', 'Hydra', 'Titan'
];

async function addBodyTypes() {
  const client = new Client(config);

  try {
    await client.connect();

    // Get existing body types
    const existing = await client.query('SELECT body_type_name FROM dim_body_type');
    const existingNames = new Set(existing.rows.map(r => r.body_type_name.toLowerCase()));

    console.log('\n=== Existing Body Types ===');
    existing.rows.forEach(r => console.log(`  ✓ ${r.body_type_name}`));

    console.log('\n=== Checking Requested Body Types ===');
    const toAdd = [];
    const alreadyExists = [];

    for (const bodyType of requestedBodyTypes) {
      if (existingNames.has(bodyType.toLowerCase())) {
        alreadyExists.push(bodyType);
        console.log(`  ⊘ ${bodyType} (already exists)`);
      } else {
        toAdd.push(bodyType);
        console.log(`  + ${bodyType} (will add)`);
      }
    }

    if (toAdd.length === 0) {
      console.log('\n✅ All requested body types already exist!');
      return;
    }

    console.log(`\n=== Adding ${toAdd.length} New Body Types ===`);

    for (const bodyType of toAdd) {
      await client.query(
        'INSERT INTO dim_body_type (body_type_name, prompt_text) VALUES ($1, $2)',
        [bodyType, '']
      );
      console.log(`  ✅ Added: ${bodyType}`);
    }

    console.log(`\n✅ Successfully added ${toAdd.length} body types!`);

    // Show final count
    const final = await client.query('SELECT COUNT(*) as count FROM dim_body_type');
    console.log(`\nTotal body types in database: ${final.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addBodyTypes();
