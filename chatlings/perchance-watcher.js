/**
 * Perchance ZIP File Watcher Service
 *
 * Automatically watches the artwork folder for new Perchance ZIP files
 * and creates creature records when images are processed.
 *
 * Features:
 * - Auto-detects new ZIP files in artwork folder
 * - Recursively searches for images in subfolders (e.g., galleries/general)
 * - Creates new creature records with unique names
 * - Prompts user to select body type for all images
 * - Moves processed ZIPs to archive folder
 * - Logs all activity
 *
 * Workflow:
 * 1. ZIP file appears in artwork folder
 * 2. Extract and find all JSON/JPG pairs
 * 3. Prompt user to select body type for all images
 * 4. Generate unique name from curated list
 * 5. Create new creature record with body type
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
const sharp = require('sharp');
const readline = require('readline');
const config = { ...require('./scripts/db-config'), database: 'chatlings' };

const ARTWORK_DIR = path.join(__dirname, 'artwork');
const LINKED_DIR = path.join(ARTWORK_DIR, 'linked');
const THUMBS_DIR = path.join(ARTWORK_DIR, 'thumbs');
const EXTRACTED_DIR = path.join(ARTWORK_DIR, 'extracted');
const PROCESSED_DIR = path.join(ARTWORK_DIR, 'processed_zips');

// Thumbnail size (width x height)
const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 200;

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

async function getRandomName(client) {
  // If we've used all names, reset (unlikely with 200+ names)
  if (usedNames.size >= CHATLING_NAMES.length) {
    usedNames.clear();
  }

  let name;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    name = CHATLING_NAMES[Math.floor(Math.random() * CHATLING_NAMES.length)];
    attempts++;

    // Check if name exists in database
    const result = await client.query(
      'SELECT COUNT(*) as count FROM creatures WHERE creature_name = $1',
      [name]
    );

    const nameExists = parseInt(result.rows[0].count) > 0;

    if (!nameExists && !usedNames.has(name)) {
      break;
    }

    // If we've tried too many times, add a number suffix
    if (attempts >= maxAttempts) {
      const timestamp = Date.now();
      name = `${name}${timestamp.toString().slice(-3)}`;
      break;
    }
  } while (true);

  usedNames.add(name);
  return name;
}

function ensureDirectories() {
  if (!fs.existsSync(LINKED_DIR)) fs.mkdirSync(LINKED_DIR, { recursive: true });
  if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });
  if (!fs.existsSync(EXTRACTED_DIR)) fs.mkdirSync(EXTRACTED_DIR, { recursive: true });
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

async function createThumbnail(sourcePath, creatureId) {
  try {
    const thumbFilename = `${creatureId}.jpg`;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);

    await sharp(sourcePath)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    log(`   ✓ Created thumbnail: ${thumbFilename}`);
    return true;
  } catch (error) {
    log(`   ⚠️  Failed to create thumbnail: ${error.message}`);
    return false;
  }
}

function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

async function promptUserForBodyType(client, unmatchedCount) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    log(`\n⚠️  ${unmatchedCount} images could not be matched to prompts (custom designs)`);
    log(`   Would you like to assign them to a body type? (y/n)`);

    rl.question('> ', async (answer) => {
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        rl.close();
        resolve(null);
        return;
      }

      // Get list of body types
      const bodyTypes = await client.query('SELECT id, body_type_name FROM dim_body_type ORDER BY body_type_name');

      log(`\n   Available body types:`);
      bodyTypes.rows.forEach(bt => {
        log(`      - ${bt.body_type_name}`);
      });

      log(`\n   Enter body type name for these ${unmatchedCount} images:`);

      rl.question('> ', (bodyTypeName) => {
        rl.close();
        resolve(bodyTypeName.trim());
      });
    });
  });
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
    const unmatchedImages = []; // Store unmatched images for later processing

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

      // Read JSON to get prompt and metadata
      let jsonData;
      try {
        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        jsonData = JSON.parse(jsonContent);
      } catch (error) {
        log(`   ❌ Failed to parse ${baseName}.json: ${error.message}`);
        skippedCount++;
        continue;
      }

      // Extract image ID from metadata or filename
      const imageId = jsonData.meta?.id || jsonData.id || baseName;
      log(`   📷 Image ID: ${imageId}`);

      // Extract prompt (try multiple possible fields)
      // Perchance format: info.prompt
      const prompt = jsonData.info?.prompt || jsonData.prompt || jsonData.text || jsonData.description || jsonData.input;

      if (!prompt) {
        log(`   ⚠️  No prompt found in ${baseName}.json`);
        skippedCount++;
        continue;
      }

      log(`   📝 Prompt captured: "${prompt.substring(0, 150)}..."`);

      // Check if this specific image has already been imported
      const existingImage = await client.query(`
        SELECT id, creature_name, selected_image
        FROM creatures
        WHERE perchance_image_id = $1
        LIMIT 1
      `, [imageId]);

      if (existingImage.rows.length > 0) {
        // This exact image already imported - skip
        log(`   ⊘ Image already imported as: ${existingImage.rows[0].creature_name} (skipping)`);
        skippedCount++;
        continue;
      }

      // Store all images for body type assignment
      unmatchedImages.push({
        jsonPath,
        jpegPath,
        baseName,
        imageId,
        prompt
      });
    }

    // Process all collected images
    if (unmatchedImages.length > 0) {
      log(`\n   📋 Processing ${unmatchedImages.length} image(s)...`);

      const bodyTypeName = await promptUserForBodyType(client, unmatchedImages.length);

      if (bodyTypeName) {
        // Find the body type
        const bodyTypeResult = await client.query(
          'SELECT id, body_type_name FROM dim_body_type WHERE LOWER(body_type_name) = LOWER($1)',
          [bodyTypeName]
        );

        if (bodyTypeResult.rows.length === 0) {
          log(`   ❌ Body type "${bodyTypeName}" not found. Skipping images.`);
        } else {
          const bodyType = bodyTypeResult.rows[0];
          log(`   ✓ Assigning to body type: ${bodyType.body_type_name}`);

          // Process each image
          for (const unmatched of unmatchedImages) {
            // Check if this specific image has already been imported
            const existingImage = await client.query(
              'SELECT id, creature_name FROM creatures WHERE perchance_image_id = $1',
              [unmatched.imageId]
            );

            if (existingImage.rows.length > 0) {
              log(`   ⊘ Image already imported as: ${existingImage.rows[0].creature_name} (skipping)`);
              continue;
            }

            // Generate a unique name for this creature
            const newName = await getRandomName(client);

            // Create new creature record with body type ID but no prompt
            const creatureResult = await client.query(`
              INSERT INTO creatures
                (creature_name, body_type_id, selected_image, rarity_tier, perchance_image_id)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `, [
              newName,
              bodyType.id,
              null,
              'Common',
              unmatched.imageId
            ]);

            const creatureId = creatureResult.rows[0].id;

            // Copy image to linked folder
            const newFilename = `${creatureId}.jpg`;
            const newPath = path.join(LINKED_DIR, newFilename);
            fs.copyFileSync(unmatched.jpegPath, newPath);

            // Create thumbnail
            await createThumbnail(newPath, creatureId);

            // Update creature with image filename
            await client.query(
              'UPDATE creatures SET selected_image = $1 WHERE id = $2',
              [newFilename, creatureId]
            );

            log(`   ✅ Created: ${newName} (${bodyType.body_type_name})`);
            assignedCount++;
          }
        }
      } else {
        log(`   ⊘ Skipping ${unmatchedImages.length} image(s)`);
      }
    }

    // Move ZIP to processed folder (use copy+delete for Windows reliability)
    const processedPath = path.join(PROCESSED_DIR, zipFile);
    try {
      fs.copyFileSync(zipPath, processedPath);

      // Try to delete with retries (Windows file locking)
      let deleted = false;
      for (let i = 0; i < 3; i++) {
        try {
          fs.unlinkSync(zipPath);
          deleted = true;
          break;
        } catch (err) {
          if (i < 2) {
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!deleted) {
        log(`   ⚠️  ZIP copied to processed_zips/ but couldn't delete original (Windows file lock)`);
        log(`   ℹ️  You can manually delete: ${zipFile}`);
      }
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
