/**
 * Migration 56: Replace Feature A (Participation) with Feature B (AI Conversation Viewing)
 *
 * Removes:
 * - chatroom_schedules table (not needed)
 * - user_attitude_history table (participation tracking)
 * - attitude_presets table (not needed)
 *
 * Adds:
 * - youtube_base_conversations table (AI-generated conversations)
 * - user_youtube_conversations table (personalized versions)
 *
 * Keeps:
 * - user_chat_attitudes table (used for customization)
 */

const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Start transaction
    await client.query('BEGIN');

    console.log('\n🗑️  REMOVING FEATURE A TABLES...\n');

    // Drop Feature A tables
    console.log('Dropping chatroom_schedules table...');
    await client.query(`DROP TABLE IF EXISTS chatroom_schedules CASCADE`);

    console.log('Dropping user_attitude_history table...');
    await client.query(`DROP TABLE IF EXISTS user_attitude_history CASCADE`);

    console.log('Dropping attitude_presets table...');
    await client.query(`DROP TABLE IF EXISTS attitude_presets CASCADE`);

    console.log('\n✅ Feature A tables removed\n');

    console.log('🏗️  CREATING FEATURE B TABLES...\n');

    // Create youtube_base_conversations table
    console.log('Creating youtube_base_conversations table...');
    await client.query(`
      CREATE TABLE youtube_base_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES trending_topics(id) ON DELETE CASCADE,
        youtube_video_id VARCHAR(20) NOT NULL UNIQUE,
        conversation_data JSONB NOT NULL,
        total_comments INTEGER NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ai_model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
        ai_provider VARCHAR(20) DEFAULT 'openai',
        generation_cost_usd NUMERIC(10,6),
        generation_duration_ms INTEGER,

        CONSTRAINT valid_total_comments CHECK (total_comments > 0),
        CONSTRAINT valid_generation_cost CHECK (generation_cost_usd >= 0),
        CONSTRAINT valid_duration CHECK (generation_duration_ms >= 0)
      )
    `);

    // Add indexes for youtube_base_conversations
    console.log('Adding indexes to youtube_base_conversations...');
    await client.query(`
      CREATE INDEX idx_youtube_base_conv_topic
        ON youtube_base_conversations(topic_id)
    `);
    await client.query(`
      CREATE INDEX idx_youtube_base_conv_video
        ON youtube_base_conversations(youtube_video_id)
    `);
    await client.query(`
      CREATE INDEX idx_youtube_base_conv_generated
        ON youtube_base_conversations(generated_at DESC)
    `);

    // Create user_youtube_conversations table
    console.log('Creating user_youtube_conversations table...');
    await client.query(`
      CREATE TABLE user_youtube_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        base_conversation_id UUID NOT NULL REFERENCES youtube_base_conversations(id) ON DELETE CASCADE,
        topic_id UUID NOT NULL REFERENCES trending_topics(id) ON DELETE CASCADE,
        assigned_chatlings JSONB NOT NULL,
        customized_content JSONB NOT NULL,
        glow_impact JSONB NOT NULL,
        total_glow_change INTEGER NOT NULL DEFAULT 0,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT unique_user_base_conv UNIQUE(user_id, base_conversation_id)
      )
    `);

    // Add indexes for user_youtube_conversations
    console.log('Adding indexes to user_youtube_conversations...');
    await client.query(`
      CREATE INDEX idx_user_youtube_conv_user
        ON user_youtube_conversations(user_id)
    `);
    await client.query(`
      CREATE INDEX idx_user_youtube_conv_base
        ON user_youtube_conversations(base_conversation_id)
    `);
    await client.query(`
      CREATE INDEX idx_user_youtube_conv_viewed
        ON user_youtube_conversations(viewed_at DESC)
    `);
    await client.query(`
      CREATE INDEX idx_user_youtube_conv_user_viewed
        ON user_youtube_conversations(user_id, viewed_at DESC)
    `);

    console.log('\n✅ Feature B tables created\n');

    console.log('🔧 UPDATING EXISTING TABLES...\n');

    // Update trending_topics table
    console.log('Adding columns to trending_topics...');
    await client.query(`
      ALTER TABLE trending_topics
        ADD COLUMN IF NOT EXISTS has_conversation BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS conversation_generated_at TIMESTAMP
    `);

    console.log('Adding index to trending_topics...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trending_topics_has_conv
        ON trending_topics(has_conversation, is_active)
        WHERE has_conversation = true
    `);

    // Ensure user_chat_attitudes table exists (it should from Feature A)
    console.log('Verifying user_chat_attitudes table...');
    const attitudesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_chat_attitudes'
      )
    `);

    if (!attitudesCheck.rows[0].exists) {
      console.log('Creating user_chat_attitudes table...');
      await client.query(`
        CREATE TABLE user_chat_attitudes (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          attitude_type VARCHAR(50) NOT NULL DEFAULT 'balanced',
          enthusiasm_level INTEGER DEFAULT 5 CHECK (enthusiasm_level BETWEEN 1 AND 10),
          criticism_level INTEGER DEFAULT 5 CHECK (criticism_level BETWEEN 1 AND 10),
          humor_level INTEGER DEFAULT 5 CHECK (humor_level BETWEEN 1 AND 10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created user_chat_attitudes table');
    } else {
      console.log('user_chat_attitudes table already exists ✓');
    }

    // Ensure glow columns exist in user_rewards
    console.log('Ensuring glow columns in user_rewards...');
    await client.query(`
      ALTER TABLE user_rewards
        ADD COLUMN IF NOT EXISTS total_glow_earned INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS chatroom_participations INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_chatroom_at TIMESTAMP
    `);

    console.log('Adding index for glow tracking...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_rewards_glow
        ON user_rewards(user_id, total_glow_earned DESC)
    `);

    console.log('\n✅ Existing tables updated\n');

    // Commit transaction
    await client.query('COMMIT');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ MIGRATION 56 COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log('   ✓ Removed 3 Feature A tables');
    console.log('   ✓ Created 2 Feature B tables');
    console.log('   ✓ Updated trending_topics table');
    console.log('   ✓ Verified user_chat_attitudes table');
    console.log('   ✓ Updated user_rewards table');
    console.log('');
    console.log('🚀 Ready for AI conversation system!');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
