/**
 * Import data only (assumes database and tables already exist)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = { ...require('./db-config'), database: 'chatlings' };

const csvParse = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

async function importData() {
  const client = new Client(config);

  try {
    console.log('========================================');
    console.log('Importing Chatlings Data');
    console.log('========================================\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    const dataDir = path.join(__dirname, '..', 'data');

    // Build species map
    console.log('Loading species data...');
    const speciesResult = await client.query('SELECT id, species_name FROM dim_species');
    const speciesMap = new Map();
    speciesResult.rows.forEach(row => {
      speciesMap.set(row.species_name, row.id);
    });
    console.log(`✓ Loaded ${speciesMap.size} species\n`);

    // Import lore
    console.log('Importing lore data...');

    // Clear existing lore
    await client.query('DELETE FROM lore_game');
    await client.query('DELETE FROM lore_species');

    // Game lore
    const gameLoreData = fs.readFileSync(path.join(dataDir, 'lore_game.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());

    let gameLoreCount = 0;
    for (const line of gameLoreData) {
      if (!line.trim()) continue;
      const parts = csvParse(line);
      if (parts.length >= 4) {
        const [title, content, lore_type, sort_order] = parts;
        await client.query(
          'INSERT INTO lore_game(title, content, lore_type, sort_order) VALUES ($1, $2, $3, $4)',
          [title, content, lore_type, parseInt(sort_order) || 0]
        );
        gameLoreCount++;
      }
    }
    console.log(`  - Game lore: ${gameLoreCount} entries`);

    // Species lore
    const speciesLoreData = fs.readFileSync(path.join(dataDir, 'lore_species.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());

    let speciesLoreCount = 0;
    for (const line of speciesLoreData) {
      if (!line.trim()) continue;
      const parts = csvParse(line);
      if (parts.length >= 4) {
        const [category, species, title, content] = parts;
        const speciesId = speciesMap.get(species.trim());
        if (speciesId) {
          await client.query(
            'INSERT INTO lore_species(species_id, title, content) VALUES ($1, $2, $3)',
            [speciesId, title, content]
          );
          speciesLoreCount++;
        }
      }
    }
    console.log(`  - Species lore: ${speciesLoreCount} entries`);
    console.log('✓ Lore data imported\n');

    // Import creatures
    console.log('Importing creatures (this may take a few minutes)...');

    // Clear existing creatures
    await client.query('DELETE FROM creatures');

    const creaturesData = fs.readFileSync(path.join(dataDir, 'all_creatures.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());

    let creatureCount = 0;
    let skipped = 0;

    for (let i = 0; i < creaturesData.length; i++) {
      const line = creaturesData[i];
      const parts = csvParse(line);

      if (parts.length >= 11) {
        const [id, creature_name, category, species, subspecies, colouring, style, mood, motion_type, elemental_affinity, environment] = parts;

        try {
          const result = await client.query(`
            INSERT INTO creatures (
              creature_name, species_id, subspecies_id, colouring_id, style_id,
              mood_id, motion_type_id, elemental_affinity_id, environment_id,
              rarity_tier, is_active
            )
            SELECT
              $1,
              (SELECT id FROM dim_species WHERE species_name = $2),
              (SELECT id FROM dim_subspecies WHERE subspecies_name = $3),
              (SELECT id FROM dim_colouring WHERE colouring_name = $4),
              (SELECT id FROM dim_style WHERE style_name = $5),
              (SELECT id FROM dim_mood WHERE mood_name = $6),
              (SELECT id FROM dim_motion_type WHERE motion_name = $7),
              (SELECT id FROM dim_elemental_affinity WHERE affinity_name = $8),
              (SELECT id FROM dim_environment WHERE environment_name = $9),
              'Common',
              true
            RETURNING id
          `, [creature_name, species, subspecies, colouring, style, mood, motion_type, elemental_affinity, environment]);

          if (result.rows.length > 0) {
            creatureCount++;
          }
        } catch (err) {
          skipped++;
        }
      }

      if ((i + 1) % 500 === 0) {
        console.log(`  Progress: ${i + 1}/${creaturesData.length} creatures...`);
      }
    }

    console.log(`✓ Imported ${creatureCount} creatures (${skipped} skipped due to duplicates)\n`);

    // Update rarity scores
    console.log('Calculating rarity scores...');
    await client.query('UPDATE creatures SET rarity_score = RANDOM() * 100');
    await client.query(`
      UPDATE creatures SET rarity_tier =
        CASE
          WHEN rarity_score >= 99 THEN 'Legendary'
          WHEN rarity_score >= 95 THEN 'Epic'
          WHEN rarity_score >= 85 THEN 'Rare'
          WHEN rarity_score >= 60 THEN 'Uncommon'
          ELSE 'Common'
        END
    `);
    console.log('✓ Rarity scores calculated\n');

    // Show summary
    console.log('========================================');
    console.log('Database Summary');
    console.log('========================================\n');

    const summary = await client.query(`
      SELECT 'Total Creatures' as category, COUNT(*)::text as count FROM creatures
      UNION ALL SELECT 'Common', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Common'
      UNION ALL SELECT 'Uncommon', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Uncommon'
      UNION ALL SELECT 'Rare', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Rare'
      UNION ALL SELECT 'Epic', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Epic'
      UNION ALL SELECT 'Legendary', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Legendary'
      UNION ALL SELECT 'Game Lore', COUNT(*)::text FROM lore_game
      UNION ALL SELECT 'Species Lore', COUNT(*)::text FROM lore_species
    `);

    summary.rows.forEach(row => {
      console.log(`${row.category.padEnd(20)}: ${row.count}`);
    });

    console.log('\n========================================');
    console.log('✓ Import completed successfully!');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('1. Refresh pgAdmin (right-click server → Refresh)');
    console.log('2. You should see the "chatlings" database');
    console.log('3. Explore the tables and data!\n');

    await client.end();

  } catch (error) {
    console.error('\n✗ Import failed:', error.message);
    console.error('Error details:', error);
    await client.end();
    process.exit(1);
  }
}

importData();
