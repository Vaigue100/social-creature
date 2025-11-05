/**
 * Import Perchance ZIP files
 *
 * Workflow:
 * 1. User downloads images from Perchance as ZIP
 * 2. ZIP contains pairs: {name}.json + {name}.jpg
 * 3. JSON contains the prompt used to generate the image
 * 4. Match prompt to creature_prompts table
 * 5. Find all creatures for that prompt_id (the "family")
 * 6. Assign one JPEG per creature
 * 7. Rename and move JPEGs to linked/ folder with creature_id
 *
 * Usage:
 *   node import-perchance-zip.js <path-to-artwork-folder>
 *
 * The script will scan for .zip files in the artwork folder, extract them,
 * and process the images.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = { ...require('./db-config'), database: 'chatlings' };

const ARTWORK_DIR = path.join(__dirname, '..', 'artwork');
const LINKED_DIR = path.join(ARTWORK_DIR, 'linked');
const EXTRACTED_DIR = path.join(ARTWORK_DIR, 'extracted');

async function importPerchanceZip() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Create directories if they don't exist
    if (!fs.existsSync(LINKED_DIR)) fs.mkdirSync(LINKED_DIR, { recursive: true });
    if (!fs.existsSync(EXTRACTED_DIR)) fs.mkdirSync(EXTRACTED_DIR, { recursive: true });

    // Find all ZIP files in artwork directory
    const files = fs.readdirSync(ARTWORK_DIR);
    const zipFiles = files.filter(f => f.endsWith('.zip'));

    if (zipFiles.length === 0) {
      console.log('No ZIP files found in artwork folder.');
      console.log(`Looking in: ${ARTWORK_DIR}\n`);
      await client.end();
      return;
    }

    console.log(`Found ${zipFiles.length} ZIP file(s) to process:\n`);
    zipFiles.forEach(f => console.log(`  - ${f}`));
    console.log();

    let totalProcessed = 0;
    let totalAssigned = 0;

    for (const zipFile of zipFiles) {
      const zipPath = path.join(ARTWORK_DIR, zipFile);
      const extractPath = path.join(EXTRACTED_DIR, path.basename(zipFile, '.zip'));

      console.log(`\nProcessing: ${zipFile}`);
      console.log('-'.repeat(80));

      // Extract ZIP
      if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });

      try {
        // Use PowerShell to extract (cross-platform alternative to unzip)
        execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`, {
          stdio: 'ignore'
        });
        console.log(`Extracted to: ${extractPath}`);
      } catch (error) {
        console.error(`Failed to extract ${zipFile}:`, error.message);
        continue;
      }

      // Find all JSON files in extracted folder
      const extractedFiles = fs.readdirSync(extractPath);
      const jsonFiles = extractedFiles.filter(f => f.endsWith('.json'));

      console.log(`Found ${jsonFiles.length} JSON files (image pairs)\n`);

      for (const jsonFile of jsonFiles) {
        const jsonPath = path.join(extractPath, jsonFile);
        const baseName = path.basename(jsonFile, '.json');
        const jpegFile = baseName + '.jpg';
        const jpegPath = path.join(extractPath, jpegFile);

        // Check if corresponding JPEG exists
        if (!fs.existsSync(jpegPath)) {
          console.log(`⚠️  Skipping ${jsonFile}: No matching JPEG found`);
          continue;
        }

        // Read JSON to get prompt
        let promptData;
        try {
          const jsonContent = fs.readFileSync(jsonPath, 'utf8');
          promptData = JSON.parse(jsonContent);
        } catch (error) {
          console.error(`❌ Failed to parse ${jsonFile}:`, error.message);
          continue;
        }

        // The JSON should contain the prompt - exact structure depends on Perchance
        // Assuming it has a "prompt" field
        const prompt = promptData.prompt || promptData.text || promptData.description;

        if (!prompt) {
          console.log(`⚠️  Skipping ${jsonFile}: No prompt found in JSON`);
          continue;
        }

        // Match prompt to database
        const promptResult = await client.query(
          'SELECT id FROM creature_prompts WHERE prompt = $1',
          [prompt]
        );

        if (promptResult.rows.length === 0) {
          console.log(`⚠️  Skipping ${jsonFile}: Prompt not found in database`);
          console.log(`     Prompt: ${prompt.substring(0, 80)}...`);
          continue;
        }

        const promptId = promptResult.rows[0].id;

        // Find creatures for this prompt that don't have images yet
        const creaturesResult = await client.query(`
          SELECT id, creature_name
          FROM creatures
          WHERE prompt_id = $1
            AND selected_image IS NULL
          ORDER BY id
          LIMIT 1
        `, [promptId]);

        if (creaturesResult.rows.length === 0) {
          console.log(`⚠️  Skipping ${jsonFile}: All creatures for this prompt already have images`);
          continue;
        }

        const creature = creaturesResult.rows[0];
        const creatureId = creature.id;
        const creatureName = creature.creature_name;

        // Rename JPEG to creature_id.jpg and move to linked folder
        const newFilename = `${creatureId}.jpg`;
        const newPath = path.join(LINKED_DIR, newFilename);

        fs.copyFileSync(jpegPath, newPath);

        // Update database
        await client.query(
          'UPDATE creatures SET selected_image = $1 WHERE id = $2',
          [newFilename, creatureId]
        );

        console.log(`✅ Assigned to creature: ${creatureName} (${creatureId})`);
        totalAssigned++;
      }

      totalProcessed++;
      console.log(`\nCompleted processing: ${zipFile}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Import Complete!');
    console.log('='.repeat(80));
    console.log(`ZIP files processed: ${totalProcessed}`);
    console.log(`Images assigned: ${totalAssigned}`);
    console.log(`Images saved to: ${LINKED_DIR}`);
    console.log('='.repeat(80));

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Import Perchance ZIP Files');
console.log('================================================================================\n');

importPerchanceZip();
