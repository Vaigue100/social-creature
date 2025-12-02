/**
 * Sync existing local animations to Azure Blob Storage
 */

require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

async function syncAnimationsToAzure() {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.error('❌ AZURE_STORAGE_CONNECTION_STRING not set in .env');
    console.log('\nRun this command to get it:');
    console.log('  az storage account show-connection-string --name chatlingsartwork --resource-group chatlings-dev-rg --query connectionString -o tsv');
    console.log('\nThen add to your .env file:');
    console.log('  AZURE_STORAGE_CONNECTION_STRING=<connection string>');
    process.exit(1);
  }

  try {
    // Connect to Azure Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerName = process.env.AZURE_STORAGE_CONTAINER_ANIMATIONS || 'animations';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    await containerClient.createIfNotExists({ access: 'blob' });
    console.log(`✓ Connected to Azure Blob Storage (container: ${containerName})`);

    // Get local animations directory
    const localAnimationsPath = path.join(__dirname, '..', 'animations', 'processed');

    if (!fs.existsSync(localAnimationsPath)) {
      console.log('No local animations folder found at:', localAnimationsPath);
      return;
    }

    const files = fs.readdirSync(localAnimationsPath);

    if (files.length === 0) {
      console.log('No animation files to sync');
      return;
    }

    console.log(`\nFound ${files.length} animation file(s) to sync...\n`);

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const filename of files) {
      const localFilePath = path.join(localAnimationsPath, filename);
      const blobName = `processed/${filename}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      try {
        // Check if blob already exists
        const exists = await blockBlobClient.exists();

        if (exists) {
          console.log(`⏭️  Skipped (already exists): ${filename}`);
          skipped++;
        } else {
          // Upload file
          const fileStats = fs.statSync(localFilePath);
          const fileSize = (fileStats.size / 1024 / 1024).toFixed(2);

          await blockBlobClient.uploadFile(localFilePath, {
            blobHTTPHeaders: {
              blobContentType: 'video/mp4'
            }
          });

          console.log(`✅ Uploaded: ${filename} (${fileSize} MB)`);
          uploaded++;
        }
      } catch (error) {
        console.error(`❌ Error uploading ${filename}:`, error.message);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Sync Complete!');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Uploaded: ${uploaded}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`Total: ${files.length}`);

    if (uploaded > 0) {
      console.log(`\nView your animations at:`);
      console.log(`https://chatlingsartwork.blob.core.windows.net/${containerName}/processed/`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncAnimationsToAzure();
