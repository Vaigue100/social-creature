/**
 * Migration 52: Create shop system tables
 * - shop_items: Items available for purchase
 * - user_purchases: Track user purchase history
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 52: Create shop system tables\n');
    console.log('='.repeat(80));

    // Create shop_items table
    console.log('\n1. Creating shop_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        motes_price INTEGER,
        real_money_price DECIMAL(10, 2),
        currency_code VARCHAR(3) DEFAULT 'GBP',
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ shop_items table created');

    // Create indexes
    console.log('\n2. Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(is_active, display_order);
      CREATE INDEX IF NOT EXISTS idx_shop_items_type ON shop_items(item_type);
    `);
    console.log('✓ Indexes created');

    // Create user_purchases table
    console.log('\n3. Creating user_purchases table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
        purchase_method VARCHAR(20) NOT NULL CHECK (purchase_method IN ('motes', 'payment')),
        motes_spent INTEGER,
        real_money_spent DECIMAL(10, 2),
        currency_code VARCHAR(3),
        payment_provider VARCHAR(50),
        payment_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `);
    console.log('✓ user_purchases table created');

    // Create indexes for purchases
    console.log('\n4. Creating purchase indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id, purchased_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_purchases_item ON user_purchases(shop_item_id);
      CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(status);
    `);
    console.log('✓ Purchase indexes created');

    // Insert Avatar Reset item
    console.log('\n5. Adding Avatar Reset shop item...');
    await client.query(`
      INSERT INTO shop_items (
        item_type, name, description, motes_price, real_money_price, currency_code, display_order
      ) VALUES (
        'avatar_reset',
        'Avatar Reset',
        'Start fresh with a new avatar! Answer the questionnaire again and generate 9 new avatar options.',
        299,
        2.99,
        'GBP',
        1
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('✓ Avatar Reset item added (299 Motes or £2.99)');

    console.log('\n✅ Migration 52 completed successfully!');
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
console.log('Migration 52: Create shop system tables');
console.log('================================================================================\n');

runMigration();
