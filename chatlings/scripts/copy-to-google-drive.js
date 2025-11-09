const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

/**
 * Google Drive Backup Script
 * Copies database backups and artwork to Google Drive folder
 *
 * Prerequisites:
 * - Google Drive for Desktop must be installed
 * - Google Drive folder must be mounted (usually at G:\ or C:\Users\[Username]\Google Drive)
 */

// Configuration
const CONFIG_FILE = path.join(__dirname, '.google-drive-config.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Load or create configuration
 */
async function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    console.log('📁 Using existing configuration:');
    console.log(`   Google Drive path: ${config.googleDrivePath}`);
    console.log(`   Backup folder: ${config.backupFolderName}\n`);

    const confirm = await question('Use this configuration? (y/n): ');
    if (confirm.toLowerCase() === 'y') {
      rl.close();
      return config;
    }
  }

  console.log('\n🔧 Google Drive Backup Configuration\n');
  console.log('Common Google Drive paths:');
  console.log('  - C:\\Users\\[YourUsername]\\Google Drive');
  console.log('  - G:\\My Drive');
  console.log('  - G:\\');
  console.log('');

  const googleDrivePath = await question('Enter your Google Drive folder path: ');
  const backupFolderName = await question('Enter backup folder name (default: Chatlings_Backups): ') || 'Chatlings_Backups';

  const config = {
    googleDrivePath: googleDrivePath.trim(),
    backupFolderName: backupFolderName.trim()
  };

  // Verify Google Drive path exists
  if (!fs.existsSync(config.googleDrivePath)) {
    console.error(`\n❌ Error: Google Drive path does not exist: ${config.googleDrivePath}`);
    console.error('Please check the path and try again.\n');
    rl.close();
    process.exit(1);
  }

  // Save configuration
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log('\n✅ Configuration saved!\n');

  rl.close();
  return config;
}

/**
 * Copy files to Google Drive
 */
async function copyToGoogleDrive(config) {
  const targetDir = path.join(config.googleDrivePath, config.backupFolderName);

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created backup folder: ${targetDir}\n`);
  }

  console.log('📤 Starting backup to Google Drive...\n');

  // 1. Copy database backups
  const dbBackupDir = path.join(__dirname, '..', 'backups', 'database');
  const targetDbDir = path.join(targetDir, 'database');

  if (fs.existsSync(dbBackupDir)) {
    console.log('Copying database backups...');

    if (!fs.existsSync(targetDbDir)) {
      fs.mkdirSync(targetDbDir, { recursive: true });
    }

    const dbFiles = fs.readdirSync(dbBackupDir).filter(f => f.endsWith('.sql'));

    for (const file of dbFiles) {
      const source = path.join(dbBackupDir, file);
      const target = path.join(targetDbDir, file);

      fs.copyFileSync(source, target);
      console.log(`  ✓ ${file}`);
    }

    console.log(`\n✅ Copied ${dbFiles.length} database backup(s)\n`);
  } else {
    console.log('⚠️  No database backups found. Run backup-database.js first.\n');
  }

  // 2. Copy artwork folder (ask for confirmation - can be large)
  const artworkDir = path.join(__dirname, '..', 'artwork');

  if (fs.existsSync(artworkDir)) {
    const artworkSize = getFolderSize(artworkDir);
    const sizeMB = (artworkSize / (1024 * 1024)).toFixed(2);

    console.log(`📸 Artwork folder found (${sizeMB} MB)`);
    console.log('Copy artwork to Google Drive? This may take a while for large folders.');
    console.log('Options:');
    console.log('  1. Copy entire artwork folder');
    console.log('  2. Copy only linked images');
    console.log('  3. Skip artwork backup');

    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const choice = await new Promise(resolve => {
      rl2.question('\nEnter choice (1/2/3): ', answer => {
        rl2.close();
        resolve(answer);
      });
    });

    if (choice === '1') {
      console.log('\nCopying entire artwork folder...');
      await copyDirectory(artworkDir, path.join(targetDir, 'artwork'));
      console.log('✅ Artwork folder copied\n');
    } else if (choice === '2') {
      console.log('\nCopying linked images only...');
      const linkedDir = path.join(artworkDir, 'linked');
      if (fs.existsSync(linkedDir)) {
        const targetLinked = path.join(targetDir, 'artwork', 'linked');
        await copyDirectory(linkedDir, targetLinked);
        console.log('✅ Linked images copied\n');
      }
    } else {
      console.log('⏭️  Skipped artwork backup\n');
    }
  }

  console.log('✨ Backup to Google Drive completed!\n');
  console.log(`📁 Location: ${targetDir}\n`);
}

/**
 * Get folder size in bytes
 */
function getFolderSize(folderPath) {
  let size = 0;

  function traverse(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        traverse(filePath);
      } else {
        size += stats.size;
      }
    });
  }

  traverse(folderPath);
  return size;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      const config = await loadConfig();
      await copyToGoogleDrive(config);
      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { copyToGoogleDrive, loadConfig };
