/**
 * Avatar Generation Service
 * Background service that processes avatar generation queue
 * - Polls queue every 2 minutes
 * - Generates 9 avatar images via Pollinations.ai API
 * - Uploads to Azure Storage
 * - Sends notification when complete
 */

const { Client } = require('pg');
const fetch = require('node-fetch');

class AvatarGenerationService {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    this.isRunning = false;
    this.checkIntervalMinutes = 2;
    this.processingLog = []; // Stores current processing log entries

    console.log(`🎨 Avatar Generation Service initialized`);
    console.log(`   Check interval: ${this.checkIntervalMinutes} minutes`);
  }

  /**
   * Add entry to processing log
   */
  log(message, level = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      level
    };
    this.processingLog.push(entry);
    console.log(`[Avatar Service] ${message}`);
  }

  /**
   * Clear the processing log (called when starting new queue item)
   */
  clearLog() {
    this.processingLog = [];
  }

  /**
   * Get current processing log
   */
  getLog() {
    return this.processingLog;
  }

  /**
   * Main queue processing function - polls every 2 minutes
   */
  async processQueue() {
    if (this.isRunning) {
      console.log('⏭️  Avatar generation already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get next pending item (FIFO)
      const pending = await client.query(`
        SELECT * FROM avatar_generation_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (pending.rows.length > 0) {
        console.log(`\n🎨 Processing avatar generation for user ${pending.rows[0].user_id}`);
        await this.processQueueItem(pending.rows[0], client);
      }

      // Cleanup old requests (>7 days)
      await this.cleanupOldRequests(client);

    } catch (error) {
      console.error('❌ Avatar queue processing error:', error);
    } finally {
      this.isRunning = false;
      await client.end();
    }
  }

  /**
   * Process a single queue item - generate 9 images
   */
  async processQueueItem(queueItem, client) {
    // Clear log for new processing
    this.clearLog();
    this.log(`🎨 Starting avatar generation for user ${queueItem.user_id}`, 'info');
    this.log(`Prompt: ${queueItem.prompt_text}`, 'info');

    // Mark as processing
    await client.query(`
      UPDATE avatar_generation_queue
      SET status = 'processing', started_at = NOW()
      WHERE id = $1
    `, [queueItem.id]);

    this.log(`Marked queue item as processing`, 'info');

    try {
      this.log(`Generating 9 avatar images...`, 'info');

      // Generate 9 images
      for (let i = 1; i <= 9; i++) {
        this.log(`Generating image ${i}/9...`, 'info');

        const imageBuffer = await this.generateImage(queueItem.prompt_text, i);
        await this.uploadToAzure(imageBuffer, queueItem.user_id, i);

        // Update progress
        await client.query(`
          UPDATE avatar_generation_queue
          SET image_count = $1
          WHERE id = $2
        `, [i, queueItem.id]);

        this.log(`✓ Image ${i}/9 completed and uploaded`, 'success');
      }

      // Mark complete
      await client.query(`
        UPDATE avatar_generation_queue
        SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [queueItem.id]);

      this.log(`✅ All 9 images generated successfully!`, 'success');

      // Send notification
      await this.notifyUserComplete(queueItem.user_id, client);
      this.log(`Notification sent to user`, 'success');

    } catch (error) {
      this.log(`❌ Generation failed: ${error.message}`, 'error');
      console.error(`   ❌ Generation failed:`, error.message);

      // Mark failed (silent - user doesn't see error)
      await client.query(`
        UPDATE avatar_generation_queue
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [error.message, queueItem.id]);

      this.log(`Marked queue item as failed`, 'error');
    }
  }

  /**
   * Generate AI prompt from questionnaire answers
   * Includes automatic directives for consistent style
   */
  generatePrompt(questionnaireData) {
    const answers = questionnaireData;

    // Build prompt from answers
    let prompt = 'a character avatar with ';

    // Vibe
    if (answers.vibe) {
      prompt += `${answers.vibe} vibe, `;
    }

    // Color (can be multiple) - specify it applies to the character only
    if (answers.color) {
      if (Array.isArray(answers.color)) {
        if (answers.color.includes('multi coloured')) {
          prompt += 'character is multi coloured, ';
        } else {
          prompt += `character has ${answers.color.join(' and ')} colors, `;
        }
      } else {
        prompt += `character is ${answers.color} colored, `;
      }
    }

    // Mood
    if (answers.mood) {
      prompt += `${answers.mood} mood, `;
    }

    // Style
    if (answers.style) {
      prompt += `${answers.style} style, `;
    }

    // Element
    if (answers.element) {
      prompt += `${answers.element} elemental theme, `;
    }

    // Pattern
    if (answers.pattern) {
      prompt += `${answers.pattern} pattern, `;
    }

    // Accessory
    if (answers.accessory) {
      prompt += `wearing ${answers.accessory}, `;
    }

    // Clothing Style
    if (answers.clothingStyle) {
      prompt += `${answers.clothingStyle} clothing, `;
    }

    // Expression
    if (answers.expression) {
      prompt += `${answers.expression} expression, `;
    }

    // Always add automatic directives for consistent style
    prompt += 'single creature only, full body visible, stylized 3D art, plain dimly lit neutral background, background is separate from character colors';

    return prompt;
  }

  /**
   * Generate single image via Pollinations.ai API
   * Free, unlimited text-to-image generation
   *
   * @param {string} promptText - The AI generation prompt
   * @param {number} imageNumber - Image number (1-9)
   * @returns {Buffer} Image buffer
   */
  async generateImage(promptText, imageNumber) {
    try {
      // Use unique seed for each image to ensure variety
      const seed = Date.now() + imageNumber;

      // Build Pollinations.ai URL with 768x768 resolution
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?seed=${seed}&width=768&height=768&model=flux&nologo=true`;

      console.log(`      Generating image ${imageNumber} with Pollinations.ai...`);

      // Fetch the generated image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Convert to buffer
      const imageBuffer = await response.buffer();

      console.log(`      ✓ Image ${imageNumber} generated (${Math.round(imageBuffer.length / 1024)}KB)`);
      return imageBuffer;

    } catch (error) {
      console.error(`      ❌ Failed to generate image ${imageNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload image to Azure Storage
   * Stores as: /user/${userId}_${imageNumber}.png
   */
  async uploadToAzure(imageBuffer, userId, imageNumber) {
    // Get Azure container client from global scope
    // (artworkContainerClient is set up in admin-server.js)
    const { artworkContainerClient } = require('../admin-server');

    if (!artworkContainerClient) {
      throw new Error('Azure Storage not configured');
    }

    const blobPath = `user/${userId}_${imageNumber}.png`;
    const blockBlobClient = artworkContainerClient.getBlockBlobClient(blobPath);

    await blockBlobClient.uploadData(imageBuffer, {
      blobHTTPHeaders: { blobContentType: 'image/png' }
    });

    console.log(`      Uploaded: ${blobPath}`);
  }

  /**
   * Send notification to user that avatar is ready
   */
  async notifyUserComplete(userId, client) {
    await client.query(`
      INSERT INTO notifications (user_id, notification_type, title, message, link, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      userId,
      'avatar_ready',
      '🎨 Your Avatar is Ready!',
      'Your personalized avatar has been generated! Click to choose your favorite.',
      '/user/avatar-select.html'
    ]);

    console.log(`   📬 Notification sent to user`);

    // Send push notification if available
    // Note: sendPushNotification is in admin-server.js scope
    // We'll handle this in the admin-server.js endpoints for now
  }

  /**
   * Cleanup old completed/failed requests
   * Deletes items older than 7 days
   */
  async cleanupOldRequests(client) {
    const result = await client.query(`
      DELETE FROM avatar_generation_queue
      WHERE (status = 'completed' OR status = 'failed')
        AND created_at < NOW() - INTERVAL '7 days'
      RETURNING id
    `);

    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} old avatar queue items`);
    }
  }
}

module.exports = AvatarGenerationService;
