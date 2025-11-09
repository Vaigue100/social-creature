const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('./db-config');

/**
 * Database Backup Script
 * Creates a timestamped backup of the chatlings database using pg_dump
 */

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupDir = path.join(__dirname, '..', 'backups', 'database');
  const backupFilename = `chatlings_backup_${timestamp}.sql`;
  const backupPath = path.join(backupDir, backupFilename);

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  }

  console.log('🗄️  Starting database backup...\n');
  console.log(`Database: chatlings`);
  console.log(`Output: ${backupPath}\n`);

  // Build pg_dump command
  // Set PGPASSWORD environment variable to avoid password prompt
  const env = {
    ...process.env,
    PGPASSWORD: config.password
  };

  const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d chatlings -F p -f "${backupPath}"`;

  return new Promise((resolve, reject) => {
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Backup failed:', error.message);
        if (stderr) console.error('Error details:', stderr);
        reject(error);
        return;
      }

      // Get file size
      const stats = fs.statSync(backupPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log('✅ Database backup completed successfully!\n');
      console.log(`📁 File: ${backupFilename}`);
      console.log(`📊 Size: ${fileSizeMB} MB`);
      console.log(`📍 Location: ${backupPath}\n`);

      // Clean up old backups (keep last 30 days)
      cleanupOldBackups(backupDir);

      resolve(backupPath);
    });
  });
}

/**
 * Clean up backups older than 30 days
 */
function cleanupOldBackups(backupDir) {
  const files = fs.readdirSync(backupDir);
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  let deletedCount = 0;

  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);

    if (stats.mtimeMs < thirtyDaysAgo && file.endsWith('.sql')) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`🗑️  Deleted old backup: ${file}`);
    }
  });

  if (deletedCount > 0) {
    console.log(`\n🧹 Cleaned up ${deletedCount} old backup(s)\n`);
  }
}

/**
 * List recent backups
 */
function listRecentBackups() {
  const backupDir = path.join(__dirname, '..', 'backups', 'database');

  if (!fs.existsSync(backupDir)) {
    console.log('No backups found.');
    return;
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.sql'))
    .map(f => {
      const stats = fs.statSync(path.join(backupDir, f));
      return {
        name: f,
        size: (stats.size / (1024 * 1024)).toFixed(2),
        date: stats.mtime
      };
    })
    .sort((a, b) => b.date - a.date)
    .slice(0, 10);

  if (files.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('📋 Recent backups:');
  files.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (${file.size} MB) - ${file.date.toLocaleString()}`);
  });
  console.log('');
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    listRecentBackups();
  } else {
    backupDatabase()
      .then(() => {
        console.log('💡 Tip: Copy this backup to your Google Drive for safekeeping!');
        console.log('   Or use: node scripts/copy-to-google-drive.js\n');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Backup failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { backupDatabase, listRecentBackups };
