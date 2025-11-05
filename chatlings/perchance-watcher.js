/**
 * Perchance ZIP File Watcher Service
 *
 * Automatically watches the artwork folder for new Perchance ZIP files
 * and creates creature records when images are processed.
 *
 * Features:
 * - Auto-detects new ZIP files in artwork folder
 * - Recursively searches for images in subfolders (e.g., galleries/general)
 * - Creates new creature records with unique names and dimension info
 * - Assigns creature to correct prompt family
 * - Moves processed ZIPs to archive folder
 * - Logs all activity
 *
 * Workflow:
 * 1. ZIP file appears in artwork folder
 * 2. Extract and find all JSON/JPG pairs
 * 3. Match prompt to database prompt family
 * 4. Generate unique name from curated list
 * 5. Create new creature record with all dimension info
 * 6. Copy image to linked folder with creature ID
 * 7. Archive ZIP to processed_zips folder
 *
 * Usage:
 *   node perchance-watcher.js
 *
 * Then just download Perchance ZIPs to the artwork folder and they'll
 * be processed automatically!
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

const ARTWORK_DIR = path.join(__dirname, 'artwork');
const LINKED_DIR = path.join(ARTWORK_DIR, 'linked');
const EXTRACTED_DIR = path.join(ARTWORK_DIR, 'extracted');
const PROCESSED_DIR = path.join(ARTWORK_DIR, 'processed_zips');

// Track files being processed to avoid duplicates
const processing = new Set();

// Curated list of easy-to-pronounce names from various languages
const CHATLING_NAMES = [
  // English/European
  'Luna', 'Leo', 'Milo', 'Zoe', 'Max', 'Ruby', 'Felix', 'Lily', 'Oscar', 'Maya',
  'Finn', 'Cleo', 'Hugo', 'Nora', 'Theo', 'Zara', 'Kai', 'Mia', 'Nico', 'Aria',
  'Eli', 'Ivy', 'Owen', 'Emma', 'Rio', 'Ella', 'Axel', 'Nova', 'Cole', 'Stella',
  // Japanese
  'Hana', 'Kimi', 'Sora', 'Momo', 'Yuki', 'Koko', 'Niko', 'Mika', 'Tomo', 'Aki',
  'Hoshi', 'Nami', 'Riko', 'Hiro', 'Suki', 'Kiko', 'Yori', 'Mai', 'Ren', 'Kai',
  // Spanish/Italian
  'Luca', 'Rosa', 'Marco', 'Nina', 'Diego', 'Sofia', 'Enzo', 'Bella', 'Carlo', 'Lucia',
  'Dante', 'Luna', 'Pablo', 'Elena', 'Rico', 'Mila', 'Nico', 'Alma', 'Paulo', 'Gia',
  // French
  'Luc', 'Coco', 'Remy', 'Mimi', 'Jules', 'Amelie', 'Pierre', 'Belle', 'Louis', 'Chloe',
  // German/Nordic
  'Lars', 'Freya', 'Erik', 'Astrid', 'Klaus', 'Greta', 'Otto', 'Inga', 'Hans', 'Elsa',
  'Thor', 'Sven', 'Olaf', 'Liv', 'Bo', 'Nils', 'Asa', 'Kari', 'Leif', 'Maja',
  // Greek/Latin
  'Atlas', 'Athena', 'Apollo', 'Iris', 'Orion', 'Venus', 'Zeus', 'Diana', 'Nike', 'Echo',
  // Various easy names
  'Momo', 'Coco', 'Kiki', 'Pipo', 'Nono', 'Dodo', 'Mimi', 'Zuzu', 'Bobo', 'Lolo',
  'Titi', 'Fifi', 'Gigi', 'Pepe', 'Bibi', 'Pipi', 'Nana', 'Papa', 'Toto', 'Sisi',
  // More from various languages
  'Ari', 'Bea', 'Chi', 'Dee', 'Emi', 'Flo', 'Gia', 'Ida', 'Jo', 'Kit',
  'Lee', 'Mel', 'Nia', 'Ora', 'Pip', 'Qui', 'Rae', 'Sam', 'Tai', 'Uma',
  'Val', 'Wes', 'Xia', 'Yara', 'Zen', 'Ali', 'Blu', 'Cruz', 'Dax', 'Era',
  // Cute duplicates
  'Koko', 'Lilo', 'Momo', 'Nana', 'Riri', 'Sisi', 'Toto', 'Yoyo', 'Zizi', 'Bobo',
  // More single syllables
  'Ace', 'Bay', 'Sky', 'Jay', 'Ray', 'Mae', 'Rue', 'Sage', 'Star', 'Wren',
  'Ash', 'Briar', 'Cedar', 'Dawn', 'Fern', 'Glen', 'Heath', 'Iris', 'Lake', 'Moss',
  // Musical names
  'Aria', 'Lyra', 'Viola', 'Alto', 'Jazz', 'Blues', 'Echo', 'Harmony', 'Melody', 'Tempo',
  // Nature themed easy names
  'Sunny', 'Rain', 'Cloud', 'Storm', 'River', 'Ocean', 'Forest', 'Meadow', 'Willow', 'Clover',
  'Petal', 'Daisy', 'Poppy', 'Maple', 'Birch', 'Pine', 'Holly', 'Jasmine', 'Rose', 'Sage'
];

// Track used names to ensure uniqueness
const usedNames = new Set();

function getRandomName() {
  // If we've used all names, reset (unlikely with 200+ names)
  if (usedNames.size >= CHATLING_NAMES.length) {
    usedNames.clear();
  }

  let name;
  do {
    name = CHATLING_NAMES[Math.floor(Math.random() * CHATLING_NAMES.length)];
  } while (usedNames.has(name));

  usedNames.add(name);
  return name;
}

function ensureDirectories() {
  if (!fs.existsSync(LINKED_DIR)) fs.mkdirSync(LINKED_DIR, { recursive: true });
  if (!fs.existsSync(EXTRACTED_DIR)) fs.mkdirSync(EXTRACTED_DIR, { recursive: true });
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

function findFilesRecursively(dir, extension) {
  const files = [];

  function search(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        search(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }

  search(dir);
  return files;
}

async function processZipFile(zipFile) {
  const zipPath = path.join(ARTWORK_DIR, zipFile);

  // Skip if already processing
  if (processing.has(zipFile)) {
    return;
  }

  // Skip if in processed folder
  if (zipPath.includes('processed_zips')) {
    return;
  }

  processing.add(zipFile);
  log(`📦 Processing: ${zipFile}`);

  const client = new Client(config);

  try {
    await client.connect();

    const extractPath = path.join(EXTRACTED_DIR, path.basename(zipFile, '.zip'));

    // Extract ZIP
    if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });

    try {
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`, {
        stdio: 'ignore'
      });
      log(`   ✓ Extracted to: ${path.basename(extractPath)}`);
    } catch (error) {
      log(`   ❌ Failed to extract ${zipFile}: ${error.message}`);
      processing.delete(zipFile);
      await client.end();
      return;
    }

    // Find all JSON files recursively (handles subfolders like galleries/general)
    const jsonFiles = findFilesRecursively(extractPath, '.info.json');

    log(`   Found ${jsonFiles.length} image(s) in ZIP`);

    let assignedCount = 0;
    let skippedCount = 0;

    for (const jsonPath of jsonFiles) {
      const baseName = path.basename(jsonPath, '.info.json');
      const jpegFile = baseName + '.jpeg';
      const jpegPath = path.join(path.dirname(jsonPath), jpegFile);

      // Check if corresponding JPEG exists
      if (!fs.existsSync(jpegPath)) {
        log(`   ⚠️  No matching JPEG for ${baseName}.info.json`);
        skippedCount++;
        continue;
      }

      // Read JSON to get prompt
      let jsonData;
      try {
        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        jsonData = JSON.parse(jsonContent);
      } catch (error) {
        log(`   ❌ Failed to parse ${baseName}.json: ${error.message}`);
        skippedCount++;
        continue;
      }

      // Extract prompt (try multiple possible fields)
      // Perchance format: info.prompt
      const prompt = jsonData.info?.prompt || jsonData.prompt || jsonData.text || jsonData.description || jsonData.input;

      if (!prompt) {
        log(`   ⚠️  No prompt found in ${baseName}.json`);
        skippedCount++;
        continue;
      }

      // Match prompt to database
      // Use fuzzy matching since Perchance may add extra text
      const promptResult = await client.query(
        `SELECT id, prompt
         FROM creature_prompts
         WHERE $1 LIKE '%' || prompt || '%'
         ORDER BY length(prompt) DESC
         LIMIT 1`,
        [prompt]
      );

      if (promptResult.rows.length === 0) {
        log(`   ⚠️  Prompt not found in database`);
        log(`      Prompt: ${prompt.substring(0, 80)}...`);
        skippedCount++;
        continue;
      }

      log(`   ✓ Matched prompt: ${promptResult.rows[0].prompt.substring(0, 60)}...`);

      const promptId = promptResult.rows[0].id;

      // Generate a unique name for this creature
      const newName = getRandomName();

      // Create new creature record (dimensions are stored in creature_prompts, not creatures)
      const creatureResult = await client.query(`
        INSERT INTO creatures
          (creature_name, prompt_id, selected_image, rarity_tier)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        newName,
        promptId,
        null,  // selected_image - will set after copying file
        'Common'
      ]);

      const creatureId = creatureResult.rows[0].id;

      // Rename JPEG to creature_id.jpg and move to linked folder
      const newFilename = `${creatureId}.jpg`;
      const newPath = path.join(LINKED_DIR, newFilename);

      fs.copyFileSync(jpegPath, newPath);

      // Update creature with image filename
      await client.query(
        'UPDATE creatures SET selected_image = $1 WHERE id = $2',
        [newFilename, creatureId]
      );

      log(`   ✅ Created: ${newName}`);
      assignedCount++;
    }

    // Move ZIP to processed folder (use copy+delete for Windows reliability)
    const processedPath = path.join(PROCESSED_DIR, zipFile);
    try {
      fs.copyFileSync(zipPath, processedPath);
      fs.unlinkSync(zipPath);
    } catch (err) {
      log(`   ⚠️  Could not archive ZIP: ${err.message}`);
    }

    log(`   ✓ Completed: ${assignedCount} creatures created, ${skippedCount} skipped`);
    log(`   ✓ Archived to: processed_zips/${zipFile}\n`);

    await client.end();

  } catch (error) {
    log(`   ❌ Error: ${error.message}`);
    await client.end();
  } finally {
    processing.delete(zipFile);
  }
}

async function scanExistingZips() {
  log('🔍 Scanning for existing ZIP files...');

  const files = fs.readdirSync(ARTWORK_DIR);
  const zipFiles = files.filter(f => f.endsWith('.zip'));

  if (zipFiles.length === 0) {
    log('   No ZIP files found\n');
    return;
  }

  log(`   Found ${zipFiles.length} ZIP file(s)\n`);

  for (const zipFile of zipFiles) {
    await processZipFile(zipFile);
  }
}

function startWatcher() {
  log('👁️  Watching artwork folder for new ZIP files...');
  log(`   Folder: ${ARTWORK_DIR}`);
  log('   Drop Perchance ZIP files here and they will be processed automatically!\n');

  // Debounce timer to handle rapid file system events
  const debounceTimers = new Map();

  fs.watch(ARTWORK_DIR, { recursive: false }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.zip')) {
      return;
    }

    // Skip if in processed folder
    const fullPath = path.join(ARTWORK_DIR, filename);
    if (fullPath.includes('processed_zips')) {
      return;
    }

    // Clear existing timer for this file
    if (debounceTimers.has(filename)) {
      clearTimeout(debounceTimers.get(filename));
    }

    // Set new timer - wait 1 second to ensure file is fully written
    const timer = setTimeout(() => {
      debounceTimers.delete(filename);

      // Check if file still exists (might have been moved during processing)
      if (fs.existsSync(fullPath)) {
        processZipFile(filename);
      }
    }, 1000);

    debounceTimers.set(filename, timer);
  });
}

async function main() {
  console.log('================================================================================');
  console.log('Perchance ZIP Watcher Service');
  console.log('================================================================================\n');

  ensureDirectories();

  // Process any existing ZIPs first
  await scanExistingZips();

  // Start watching for new files
  startWatcher();

  // Keep process alive
  process.on('SIGINT', () => {
    log('\n👋 Shutting down watcher...');
    process.exit(0);
  });
}

main();
