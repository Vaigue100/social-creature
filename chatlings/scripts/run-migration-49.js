/**
 * Migration 49: Add Avatar Generation System
 *
 * Creates:
 * - avatar_generation_queue table for managing avatar generation requests
 * - avatar_selected_number and avatar_created_at columns in users table
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 49: Add Avatar Generation System\n');
    console.log('='.repeat(80));

    console.log('\n📋 Creating avatar_generation_queue table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS avatar_generation_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        questionnaire_data JSONB NOT NULL,
        prompt_text TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        image_count INTEGER DEFAULT 0,
        CONSTRAINT one_queue_per_user UNIQUE(user_id)
      );
    `);

    console.log('✅ avatar_generation_queue table created');

    console.log('\n📋 Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_avatar_queue_status
      ON avatar_generation_queue(status, created_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_avatar_queue_user
      ON avatar_generation_queue(user_id);
    `);

    console.log('✅ Indexes created');

    console.log('\n📋 Adding avatar columns to users table...');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_selected_number INTEGER;
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_created_at TIMESTAMP;
    `);

    console.log('✅ Avatar columns added to users table');

    // Verify the setup
    const queueCheck = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_name = 'avatar_generation_queue'
    `);

    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('avatar_selected_number', 'avatar_created_at')
    `);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration 49 completed successfully!');
    console.log('\nCreated:');
    console.log('  - avatar_generation_queue table (status: pending, processing, completed, failed)');
    console.log('  - Indexes for queue status and user_id');
    console.log('  - users.avatar_selected_number (1-9)');
    console.log('  - users.avatar_created_at');
    console.log('\nAvatar path format: /user/${user_id}_${avatar_selected_number}.png');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration().catch(console.error);
