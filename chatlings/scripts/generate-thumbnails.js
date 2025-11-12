/**
 * Generate Thumbnails Migration Script
 *
 * Creates 200x200px thumbnails for all existing images in the linked folder.
 *
 * Usage:
 *   node scripts/generate-thumbnails.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ARTWORK_DIR = path.join(__dirname, '..', 'artwork');
const LINKED_DIR = path.join(ARTWORK_DIR, 'linked');
const THUMBS_DIR = path.join(ARTWORK_DIR, 'thumbs');

// Thumbnail size (width x height)
const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 200;

function log(message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timestamp}] ${message}`);
}

function ensureThumbsDirectory() {
  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
    log('✓ Created thumbs directory');
  }
}

async function createThumbnail(sourceFile) {
  try {
    const sourcePath = path.join(LINKED_DIR, sourceFile);
    const thumbPath = path.join(THUMBS_DIR, sourceFile);

    // Skip if thumbnail already exists
    if (fs.existsSync(thumbPath)) {
      return { skipped: true };
    }

    await sharp(sourcePath)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  console.log('================================================================================');
  console.log('Thumbnail Generation Migration');
  console.log('================================================================================\n');

  log('Starting thumbnail generation...');

  // Ensure thumbs directory exists
  ensureThumbsDirectory();

  // Check if linked directory exists
  if (!fs.existsSync(LINKED_DIR)) {
    log('❌ Error: linked directory not found');
    log(`   Expected: ${LINKED_DIR}`);
    process.exit(1);
  }

  // Get all image files from linked directory
  const files = fs.readdirSync(LINKED_DIR);
  const imageFiles = files.filter(f =>
    f.toLowerCase().endsWith('.jpg') ||
    f.toLowerCase().endsWith('.jpeg') ||
    f.toLowerCase().endsWith('.png')
  );

  if (imageFiles.length === 0) {
    log('ℹ️  No images found in linked directory');
    process.exit(0);
  }

  log(`Found ${imageFiles.length} image(s) in linked directory\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const progress = `[${i + 1}/${imageFiles.length}]`;

    process.stdout.write(`${progress} Processing ${file}... `);

    const result = await createThumbnail(file);

    if (result.success) {
      console.log('✓ Created');
      successCount++;
    } else if (result.skipped) {
      console.log('⊘ Already exists');
      skippedCount++;
    } else {
      console.log(`✗ Failed: ${result.error}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n================================================================================');
  console.log('Summary');
  console.log('================================================================================');
  console.log(`Total images:      ${imageFiles.length}`);
  console.log(`Created:           ${successCount}`);
  console.log(`Already existed:   ${skippedCount}`);
  console.log(`Errors:            ${errorCount}`);
  console.log('================================================================================\n');

  if (errorCount > 0) {
    log('⚠️  Some thumbnails could not be created');
  } else {
    log('✅ All thumbnails generated successfully!');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
