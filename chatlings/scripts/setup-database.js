/**
 * Chatlings Database Setup Script
 * Node.js alternative to psql-based setup
 * Run with: node setup-database.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// PostgreSQL connection config from environment variables
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

async function createDatabase() {
  console.log('========================================');
  console.log('Chatlings Database Setup');
  console.log('========================================\n');

  // Connect to PostgreSQL (default database)
  const client = new Client({
    ...config,
    database: 'postgres' // Connect to default database first
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected to PostgreSQL\n');

    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'chatlings'"
    );

    if (checkDb.rows.length > 0) {
      console.log('Database "chatlings" already exists');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Drop and recreate? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'yes') {
        console.log('\nDropping existing database...');
        await client.query('DROP DATABASE chatlings');
        console.log('✓ Database dropped\n');
      } else {
        console.log('Keeping existing database\n');
        await client.end();
        return false;
      }
    }

    // Create database
    console.log('Creating database "chatlings"...');
    await client.query('CREATE DATABASE chatlings');
    console.log('✓ Database created\n');

    await client.end();
    return true;

  } catch (error) {
    console.error('✗ Error:', error.message);
    await client.end();
    throw error;
  }
}

async function createTables() {
  const client = new Client({
    ...config,
    database: 'chatlings'
  });

  try {
    console.log('Connecting to chatlings database...');
    await client.connect();
    console.log('✓ Connected\n');

    console.log('Creating tables...');
    const sqlFile = path.join(__dirname, 'sql', '02_create_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove the \c chatlings; line as we're already connected
    const cleanedSql = sql.replace(/\\c chatlings;/g, '');

    await client.query(cleanedSql);
    console.log('✓ Tables created\n');

    await client.end();
    return true;

  } catch (error) {
    console.error('✗ Error creating tables:', error.message);
    await client.end();
    throw error;
  }
}

async function importData() {
  const client = new Client({
    ...config,
    database: 'chatlings'
  });

  try {
    console.log('Connecting to chatlings database...');
    await client.connect();
    console.log('✓ Connected\n');

    const dataDir = path.join(__dirname, '..', 'data');

    // Import dimensions
    console.log('Importing dimension data...');

    // Colourings
    console.log('  - Colourings...');
    const colourings = fs.readFileSync(path.join(dataDir, 'dim_colourings.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());
    for (const colouring of colourings) {
      if (colouring.trim()) {
        await client.query(
          'INSERT INTO dim_colouring(colouring_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [colouring.trim()]
        );
      }
    }

    // Styles
    console.log('  - Styles...');
    const styles = fs.readFileSync(path.join(dataDir, 'dim_styles.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());
    for (const style of styles) {
      if (style.trim()) {
        await client.query(
          'INSERT INTO dim_style(style_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [style.trim()]
        );
      }
    }

    // Moods
    console.log('  - Moods...');
    const moods = fs.readFileSync(path.join(dataDir, 'dim_moods.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());
    for (const mood of moods) {
      if (mood.trim()) {
        await client.query(
          'INSERT INTO dim_mood(mood_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [mood.trim()]
        );
      }
    }

    // Motion types
    console.log('  - Motion types...');
    const motionTypes = fs.readFileSync(path.join(dataDir, 'dim_motion_types.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());
    for (const motionType of motionTypes) {
      if (motionType.trim()) {
        await client.query(
          'INSERT INTO dim_motion_type(motion_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [motionType.trim()]
        );
      }
    }

    // Elemental affinities
    console.log('  - Elemental affinities...');
    const affinities = fs.readFileSync(path.join(dataDir, 'dim_elemental_affinities.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());
    for (const affinity of affinities) {
      if (affinity.trim()) {
        await client.query(
          'INSERT INTO dim_elemental_affinity(affinity_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [affinity.trim()]
        );
      }
    }

    // Environments
    console.log('  - Environments...');
    const environments = fs.readFileSync(path.join(dataDir, 'dim_environments.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());
    for (const environment of environments) {
      if (environment.trim()) {
        await client.query(
          'INSERT INTO dim_environment(environment_name) VALUES ($1) ON CONFLICT DO NOTHING',
          [environment.trim()]
        );
      }
    }

    console.log('✓ Dimension data imported\n');

    // Import species and subspecies
    console.log('Importing species data...');
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

    const speciesData = fs.readFileSync(path.join(dataDir, 'dim_species.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());

    const speciesMap = new Map();

    for (const line of speciesData) {
      const [category, species] = csvParse(line);
      if (category && species) {
        const key = species.trim();
        if (!speciesMap.has(key)) {
          const result = await client.query(
            'INSERT INTO dim_species(species_name, category) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
            [species.trim(), category.trim()]
          );
          if (result.rows.length > 0) {
            speciesMap.set(key, result.rows[0].id);
          } else {
            const existing = await client.query(
              'SELECT id FROM dim_species WHERE species_name = $1',
              [species.trim()]
            );
            if (existing.rows.length > 0) {
              speciesMap.set(key, existing.rows[0].id);
            }
          }
        }
      }
    }
    console.log(`✓ Imported ${speciesMap.size} species\n`);

    console.log('Importing subspecies data...');
    const subspeciesData = fs.readFileSync(path.join(dataDir, 'dim_subspecies.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());

    let subspeciesCount = 0;
    for (const line of subspeciesData) {
      const [category, species, subspecies] = csvParse(line);
      if (species && subspecies) {
        const speciesId = speciesMap.get(species.trim());
        if (speciesId) {
          await client.query(
            'INSERT INTO dim_subspecies(subspecies_name, species_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [subspecies.trim(), speciesId]
          );
          subspeciesCount++;
        }
      }
    }
    console.log(`✓ Imported ${subspeciesCount} subspecies\n`);

    // Import lore
    console.log('Importing lore data...');

    // Game lore
    const gameLoreData = fs.readFileSync(path.join(dataDir, 'lore_game.csv'), 'utf8')
      .split('\n').slice(1);

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
      .split('\n').slice(1);

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

    // Import creatures (this might take a while)
    console.log('Importing creatures (this may take a few minutes)...');
    const creaturesData = fs.readFileSync(path.join(dataDir, 'all_creatures.csv'), 'utf8')
      .split('\n').slice(1).filter(line => line.trim());

    let creatureCount = 0;
    let batchSize = 100;

    for (let i = 0; i < creaturesData.length; i += batchSize) {
      const batch = creaturesData.slice(i, i + batchSize);

      for (const line of batch) {
        const parts = csvParse(line);
        if (parts.length >= 11) {
          const [id, creature_name, category, species, subspecies, colouring, style, mood, motion_type, elemental_affinity, environment] = parts;

          try {
            await client.query(`
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
              ON CONFLICT DO NOTHING
            `, [creature_name, species, subspecies, colouring, style, mood, motion_type, elemental_affinity, environment]);

            creatureCount++;
          } catch (err) {
            // Skip duplicates or errors
          }
        }
      }

      if ((i + batchSize) % 500 === 0) {
        console.log(`  Progress: ${Math.min(i + batchSize, creaturesData.length)}/${creaturesData.length} creatures...`);
      }
    }

    console.log(`✓ Imported ${creatureCount} creatures\n`);

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
    console.log('========================================');

    const summary = await client.query(`
      SELECT 'Species' as category, COUNT(*)::text as count FROM dim_species
      UNION ALL SELECT 'Subspecies', COUNT(*)::text FROM dim_subspecies
      UNION ALL SELECT 'Colourings', COUNT(*)::text FROM dim_colouring
      UNION ALL SELECT 'Styles', COUNT(*)::text FROM dim_style
      UNION ALL SELECT 'Moods', COUNT(*)::text FROM dim_mood
      UNION ALL SELECT 'Total Creatures', COUNT(*)::text FROM creatures
      UNION ALL SELECT 'Common', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Common'
      UNION ALL SELECT 'Uncommon', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Uncommon'
      UNION ALL SELECT 'Rare', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Rare'
      UNION ALL SELECT 'Epic', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Epic'
      UNION ALL SELECT 'Legendary', COUNT(*)::text FROM creatures WHERE rarity_tier = 'Legendary'
    `);

    summary.rows.forEach(row => {
      console.log(`${row.category.padEnd(20)}: ${row.count}`);
    });
    console.log('========================================\n');

    await client.end();
    return true;

  } catch (error) {
    console.error('✗ Error importing data:', error.message);
    await client.end();
    throw error;
  }
}

async function main() {
  try {
    const created = await createDatabase();
    if (created !== false) {
      await createTables();
      await importData();

      console.log('✓ Setup completed successfully!\n');
      console.log('You can now start the backend server:');
      console.log('  cd backend');
      console.log('  npm install');
      console.log('  npm run dev\n');
    }
  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Password in .env file is correct');
    console.error('3. Port 5432 is available\n');
    process.exit(1);
  }
}

main();
