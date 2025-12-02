/**
 * Animation Watcher Service
 * Watches the dropbox folder for new animation files
 * Sends them to the admin UI for categorization
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { Client } = require('pg');

class AnimationWatcher {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    this.dropboxPath = path.join(__dirname, '..', 'animations', 'dropbox');
    this.processedPath = path.join(__dirname, '..', 'animations', 'processed');
    this.watcher = null;
    this.pendingFiles = new Map(); // filename -> { path, detectedAt }

    // Ensure folders exist
    if (!fs.existsSync(this.dropboxPath)) {
      fs.mkdirSync(this.dropboxPath, { recursive: true });
    }
    if (!fs.existsSync(this.processedPath)) {
      fs.mkdirSync(this.processedPath, { recursive: true });
    }
  }

  /**
   * Start watching the dropbox folder
   */
  start() {
    console.log('\n' + '='.repeat(80));
    console.log('🎬 Animation Watcher Service Started');
    console.log('='.repeat(80));
    console.log(`📁 Watching folder: ${this.dropboxPath}`);
    console.log(`📦 Processed folder: ${this.processedPath}`);
    console.log(`🎥 Supported formats: .mp4, .webm, .mov`);
    console.log('='.repeat(80) + '\n');

    this.watcher = chokidar.watch(this.dropboxPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleNewFile(filePath))
      .on('error', (error) => console.error('❌ Watcher error:', error));

    // Check for existing files on startup
    this.checkExistingFiles();
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('✓ Animation watcher stopped');
    }
  }

  /**
   * Check for files that are already in the dropbox
   */
  async checkExistingFiles() {
    try {
      const files = fs.readdirSync(this.dropboxPath);
      const videoFiles = files.filter(f => this.isVideoFile(f));

      if (videoFiles.length > 0) {
        console.log(`\n📋 Found ${videoFiles.length} existing file(s) in dropbox:\n`);
        videoFiles.forEach(file => {
          const filePath = path.join(this.dropboxPath, file);
          this.addPendingFile(file, filePath);
        });
      }
    } catch (error) {
      console.error('Error checking existing files:', error);
    }
  }

  /**
   * Handle new file detected
   */
  handleNewFile(filePath) {
    const fileName = path.basename(filePath);

    // Only process video files
    if (!this.isVideoFile(fileName)) {
      return;
    }

    console.log(`\n🎬 New animation file detected: ${fileName}`);
    this.addPendingFile(fileName, filePath);
  }

  /**
   * Add file to pending list
   */
  addPendingFile(fileName, filePath) {
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    this.pendingFiles.set(fileName, {
      path: filePath,
      fileName: fileName,
      size: stats.size,
      sizeMB: sizeInMB,
      detectedAt: new Date(),
      status: 'pending'
    });

    console.log(`   📊 File size: ${sizeInMB} MB`);
    console.log(`   ⏰ Detected at: ${new Date().toLocaleString()}`);
    console.log(`   📌 Status: Waiting for admin categorization`);
    console.log(`   🌐 Admin UI: http://localhost:3000/admin/animations.html`);
  }

  /**
   * Check if file is a video file
   */
  isVideoFile(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return ['.mp4', '.webm', '.mov'].includes(ext);
  }

  /**
   * Get all pending files
   */
  getPendingFiles() {
    return Array.from(this.pendingFiles.values());
  }

  /**
   * Process a file (move it and add to database)
   */
  async processFile(fileName, creatureId, animationType, displayName) {
    const fileInfo = this.pendingFiles.get(fileName);

    if (!fileInfo) {
      throw new Error('File not found in pending list');
    }

    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Generate new filename: creatureId_animationType_timestamp.ext
      const ext = path.extname(fileName);
      const timestamp = Date.now();
      const newFileName = `${creatureId}_${animationType}_${timestamp}${ext}`;
      const newPath = path.join(this.processedPath, newFileName);

      // Move file from dropbox to processed folder
      fs.renameSync(fileInfo.path, newPath);

      // Store relative path for database
      const relativePath = `/animations/processed/${newFileName}`;

      // Insert into database
      const result = await client.query(`
        INSERT INTO creature_animations
        (creature_id, animation_type, file_path, file_name, display_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [creatureId, animationType, relativePath, newFileName, displayName || fileName]);

      const animationId = result.rows[0].id;

      // Remove from pending
      this.pendingFiles.delete(fileName);

      console.log(`\n✅ Animation processed successfully!`);
      console.log(`   ID: ${animationId}`);
      console.log(`   Creature: ${creatureId}`);
      console.log(`   Type: ${animationType}`);
      console.log(`   Path: ${relativePath}`);

      return {
        success: true,
        animationId: animationId,
        filePath: relativePath
      };

    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Remove a file from pending (if user wants to delete it)
   */
  removePendingFile(fileName) {
    const fileInfo = this.pendingFiles.get(fileName);

    if (fileInfo) {
      // Delete the file
      if (fs.existsSync(fileInfo.path)) {
        fs.unlinkSync(fileInfo.path);
      }

      this.pendingFiles.delete(fileName);
      console.log(`🗑️  Removed pending file: ${fileName}`);
      return true;
    }

    return false;
  }
}

module.exports = AnimationWatcher;
