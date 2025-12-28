/**
 * Migration 55: Add chatroom scheduling and attitude tracking
 *
 * Creates tables for:
 * - Chatroom schedules (random daily scheduling)
 * - User attitude history (track settings and glow earned)
 * - Updates user_rewards with glow tracking fields
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 55: Add chatroom scheduling and attitude tracking\n');
    console.log('='.repeat(80));

    // Step 1: Create chatroom_schedules table
    console.log('\n1. Creating chatroom_schedules table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chatroom_schedules (
        id SERIAL PRIMARY KEY,
        schedule_date DATE NOT NULL,
        open_time TIMESTAMP NOT NULL,
        close_time TIMESTAMP NOT NULL,
        notification_time TIMESTAMP NOT NULL,
        reminder_time TIMESTAMP NOT NULL,
        video_id VARCHAR(50),
        video_title TEXT,
        video_category VARCHAR(50),
        video_subcategory VARCHAR(50),
        video_thumbnail_url TEXT,
        optimal_enthusiasm_min INTEGER,
        optimal_enthusiasm_max INTEGER,
        optimal_criticism_min INTEGER,
        optimal_criticism_max INTEGER,
        optimal_humor_min INTEGER,
        optimal_humor_max INTEGER,
        hint TEXT,
        status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, notified, open, closed
        participant_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        CHECK (status IN ('scheduled', 'notified', 'open', 'closed'))
      );
    `);
    console.log('✓ chatroom_schedules table created');

    // Create indexes for chatroom_schedules
    console.log('\n2. Creating indexes for chatroom_schedules...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_date
        ON chatroom_schedules(schedule_date, open_time);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_status
        ON chatroom_schedules(status, open_time);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_open_time
        ON chatroom_schedules(open_time)
        WHERE status IN ('scheduled', 'notified');
    `);
    console.log('✓ Indexes created');

    // Step 3: Create user_attitude_history table
    console.log('\n3. Creating user_attitude_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_attitude_history (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        chatroom_id INTEGER REFERENCES chatroom_schedules(id) ON DELETE CASCADE,
        creature_id INTEGER REFERENCES creatures(id) ON DELETE SET NULL,
        enthusiasm INTEGER NOT NULL,
        criticism INTEGER NOT NULL,
        humor INTEGER NOT NULL,
        glow_earned INTEGER NOT NULL,
        match_score DECIMAL(5,2),
        extremism_penalty INTEGER DEFAULT 0,
        variety_bonus INTEGER DEFAULT 0,
        participated_at TIMESTAMP DEFAULT NOW(),
        CHECK (enthusiasm BETWEEN 1 AND 10),
        CHECK (criticism BETWEEN 1 AND 10),
        CHECK (humor BETWEEN 1 AND 10),
        CHECK (glow_earned BETWEEN -5 AND 10)
      );
    `);
    console.log('✓ user_attitude_history table created');

    // Create indexes for user_attitude_history
    console.log('\n4. Creating indexes for user_attitude_history...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_attitude_user
        ON user_attitude_history(user_id, participated_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_attitude_chatroom
        ON user_attitude_history(chatroom_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_attitude_creature
        ON user_attitude_history(creature_id);
    `);
    console.log('✓ Indexes created');

    // Step 4: Add glow tracking columns to user_rewards
    console.log('\n5. Adding glow tracking columns to user_rewards...');

    // Check if columns already exist
    const glowColumnsExist = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_rewards'
        AND column_name IN ('total_glow_earned', 'chatroom_participations', 'last_chatroom_at')
    `);

    if (glowColumnsExist.rows.length === 0) {
      await client.query(`
        ALTER TABLE user_rewards
        ADD COLUMN total_glow_earned INTEGER DEFAULT 0,
        ADD COLUMN chatroom_participations INTEGER DEFAULT 0,
        ADD COLUMN last_chatroom_at TIMESTAMP;
      `);
      console.log('✓ Glow tracking columns added to user_rewards');
    } else {
      console.log('✓ Glow tracking columns already exist in user_rewards');
    }

    // Step 5: Create user_chat_attitudes table (for saving preset attitudes)
    console.log('\n6. Creating user_chat_attitudes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_chat_attitudes (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        creature_id INTEGER REFERENCES creatures(id) ON DELETE CASCADE,
        attitude_name VARCHAR(50) NOT NULL,
        enthusiasm INTEGER NOT NULL,
        criticism INTEGER NOT NULL,
        humor INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CHECK (enthusiasm BETWEEN 1 AND 10),
        CHECK (criticism BETWEEN 1 AND 10),
        CHECK (humor BETWEEN 1 AND 10),
        UNIQUE(user_id, creature_id, attitude_name)
      );
    `);
    console.log('✓ user_chat_attitudes table created');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_chat_attitudes
        ON user_chat_attitudes(user_id, creature_id, is_active);
    `);

    // Step 6: Create function to cleanup old schedules
    console.log('\n7. Creating cleanup function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_chatroom_schedules()
      RETURNS void AS $$
      BEGIN
        -- Keep schedules for 30 days, then delete
        DELETE FROM chatroom_schedules
        WHERE schedule_date < CURRENT_DATE - INTERVAL '30 days';
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ Cleanup function created');

    // Step 7: Insert some preset attitudes
    console.log('\n8. Creating preset attitude templates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS attitude_presets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        enthusiasm INTEGER NOT NULL,
        criticism INTEGER NOT NULL,
        humor INTEGER NOT NULL,
        best_for TEXT,
        CHECK (enthusiasm BETWEEN 1 AND 10),
        CHECK (criticism BETWEEN 1 AND 10),
        CHECK (humor BETWEEN 1 AND 10)
      );
    `);

    // Insert presets
    await client.query(`
      INSERT INTO attitude_presets (name, description, enthusiasm, criticism, humor, best_for)
      VALUES
        ('Optimistic Fan', 'Enthusiastic and positive about everything', 9, 2, 7, 'Music, Comedy, Inspirational'),
        ('Critical Analyst', 'Thoughtful and analytical approach', 5, 8, 3, 'Reviews, Tech, Educational'),
        ('Class Clown', 'Maximum humor and playfulness', 7, 2, 10, 'Comedy, Entertainment, Gaming'),
        ('Balanced Observer', 'Even-keeled and fair assessment', 6, 6, 5, 'General content, Mixed topics'),
        ('Passionate Debater', 'Strong opinions and engagement', 8, 7, 5, 'Sports, Drama, News'),
        ('Skeptical Viewer', 'Questions and critiques content', 4, 9, 4, 'Reviews, Controversy, Analysis')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✓ Preset attitudes created');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration 55 completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  - chatroom_schedules (for daily random scheduling)');
    console.log('  - user_attitude_history (track glow earnings)');
    console.log('  - user_chat_attitudes (save custom attitudes)');
    console.log('  - attitude_presets (template attitudes)');
    console.log('');
    console.log('Updated tables:');
    console.log('  - user_rewards (added glow tracking columns)');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: node scripts/run-migration-55.js');
    console.log('  2. Implement GlowCalculator service');
    console.log('  3. Implement ChatroomScheduler service');
    console.log('  4. Set up daily schedule generation job');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 55: Chatroom Scheduling & Attitude Tracking');
console.log('================================================================================\n');

runMigration();
