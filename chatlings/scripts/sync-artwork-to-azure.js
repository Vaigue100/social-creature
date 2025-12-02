#!/usr/bin/env node
/**
 * Sync Artwork to Azure Blob Storage
 *
 * Uploads local artwork files to Azure blob storage.
 * Only uploads new files (doesn't re-upload existing ones).
 *
 * Usage:
 *   node scripts/sync-artwork-to-azure.js
 *
 * Environment Variables:
 *   AZURE_STORAGE_ACCOUNT - Storage account name (default: chatlingsartwork)
 *   AZURE_STORAGE_CONTAINER - Container name (default: artwork)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || 'chatlingsartwork';
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'artwork';
const ARTWORK_DIR = path.join(__dirname, '..', 'artwork');

console.log('================================================================================');
console.log('Syncing Artwork to Azure Blob Storage');
console.log('================================================================================\n');
console.log(`Storage Account: ${STORAGE_ACCOUNT}`);
console.log(`Container: ${CONTAINER}`);
console.log(`Source: ${ARTWORK_DIR}\n`);

try {
  // Check if artwork directory exists
  if (!fs.existsSync(ARTWORK_DIR)) {
    console.error(`❌ Artwork directory not found: ${ARTWORK_DIR}`);
    process.exit(1);
  }

  // Upload all PNG files
  console.log('Uploading artwork files...\n');

  const cmd = `az storage blob upload-batch --account-name ${STORAGE_ACCOUNT} --destination ${CONTAINER} --source "${ARTWORK_DIR}" --auth-mode key --pattern "*.png" --overwrite false`;

  const result = execSync(cmd, {
    stdio: 'inherit',
    encoding: 'utf8'
  });

  console.log('\n✅ Artwork sync complete!\n');
  console.log(`View at: https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/`);

} catch (error) {
  console.error('\n❌ Artwork sync failed:', error.message);
  process.exit(1);
}
