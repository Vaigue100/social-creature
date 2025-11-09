const { backupDatabase } = require('./backup-database');
const { copyToGoogleDrive, loadConfig } = require('./copy-to-google-drive');

/**
 * Full Backup Script
 * Performs database backup and copies to Google Drive in one command
 */

async function fullBackup() {
  console.log('🚀 Starting full backup process...\n');
  console.log('This will:');
  console.log('  1. Create a database backup');
  console.log('  2. Copy backups to Google Drive');
  console.log('');

  try {
    // Step 1: Backup database
    console.log('═'.repeat(60));
    console.log('STEP 1: Database Backup');
    console.log('═'.repeat(60) + '\n');

    const backupPath = await backupDatabase();

    // Step 2: Copy to Google Drive
    console.log('═'.repeat(60));
    console.log('STEP 2: Copy to Google Drive');
    console.log('═'.repeat(60) + '\n');

    const config = await loadConfig();
    await copyToGoogleDrive(config);

    console.log('═'.repeat(60));
    console.log('🎉 Full backup completed successfully!');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Full backup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fullBackup().then(() => process.exit(0));
}

module.exports = { fullBackup };
