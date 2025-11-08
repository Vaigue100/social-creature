/**
 * CLEAR DOWN ALL CREATURE DATA AND START FRESH
 *
 * This script will:
 * 1. Delete all creatures from database
 * 2. Delete all images from artwork/linked folder
 * 3. Clear artwork/extracted folder
 * 4. Clear artwork/processed_zips folder
 * 5. Clear artwork/discarded folder
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

const CHATLINGS_DIR = path.join(__dirname, '..');
const LINKED_DIR = path.join(CHATLINGS_DIR, 'artwork', 'linked');
const EXTRACTED_DIR = path.join(CHATLINGS_DIR, 'artwork', 'extracted');
const PROCESSED_DIR = path.join(CHATLINGS_DIR, 'artwork', 'processed_zips');
const DISCARDED_DIR = path.join(CHATLINGS_DIR, 'artwork', 'discarded');

function deleteFilesInDir(dir, description) {
  if (!fs.existsSync(dir)) {
    console.log(`   ${description} folder doesn't exist, skipping...`);
    return 0;
  }

  const files = fs.readdirSync(dir);
  let count = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);

    try {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recursively delete directory contents
        deleteFilesInDir(filePath, file);
        fs.rmdirSync(filePath);
        count++;
      } else {
        fs.unlinkSync(filePath);
        count++;
      }
    } catch (err) {
      console.log(`   ⚠️  Could not delete ${filePath}: ${err.message}`);
    }
  }

  console.log(`   ✓ Deleted ${count} items from ${description}`);
  return count;
}

async function clearDown() {
  console.log('='.repeat(80));
  console.log('CLEAR DOWN AND REGENERATE');
  console.log('='.repeat(80));
  console.log('\n⚠️  WARNING: This will delete ALL creatures and images!');
  console.log('Make sure you have your Perchance ZIPs backed up outside this project.\n');

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Step 1: Count current data
    console.log('Current state:');
    const creatureCount = await client.query('SELECT COUNT(*) as count FROM creatures');
    console.log(`   Creatures in database: ${creatureCount.rows[0].count}`);

    // Step 2: Delete all creatures from database
    console.log('\n1. Deleting creatures from database...');
    await client.query('DELETE FROM creatures');
    console.log('   ✓ All creatures deleted');

    // Step 3: Delete all images from linked folder
    console.log('\n2. Deleting images from linked folder...');
    deleteFilesInDir(LINKED_DIR, 'linked images');

    // Step 4: Clear extracted folder
    console.log('\n3. Clearing extracted folder...');
    deleteFilesInDir(EXTRACTED_DIR, 'extracted files');

    // Step 5: Clear processed_zips folder
    console.log('\n4. Clearing processed_zips folder...');
    deleteFilesInDir(PROCESSED_DIR, 'processed ZIPs');

    // Step 6: Clear discarded folder
    console.log('\n5. Clearing discarded folder...');
    deleteFilesInDir(DISCARDED_DIR, 'discarded images');

    console.log('\n' + '='.repeat(80));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(80));
    console.log('\nDatabase and folders have been cleared.');
    console.log('You can now drop your Perchance ZIPs into the artwork folder.');
    console.log('The watcher will process them automatically.\n');

    await client.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

clearDown();
