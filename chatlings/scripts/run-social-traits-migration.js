const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

/**
 * Run social traits migration and generate scores for all creatures
 */

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🎭 Setting up social interaction system...\n');

    // Step 1: Run migration SQL
    console.log('📋 Step 1: Creating tables...');
    const migrationPath = path.join(__dirname, 'sql', 'add_social_traits.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Tables created\n');

    // Step 2: Get all creatures
    console.log('📋 Step 2: Generating social trait scores for all creatures...');
    const creatures = await client.query('SELECT id FROM creatures');
    const categories = await client.query('SELECT id FROM dim_social_trait_category ORDER BY id');

    console.log(`   Found ${creatures.rows.length} creatures`);
    console.log(`   Found ${categories.rows.length} social trait categories\n`);

    // Step 3: Generate random scores for each creature in each category
    let insertedCount = 0;
    for (const creature of creatures.rows) {
      for (const category of categories.rows) {
        // Generate random score between 0-100
        // Use normal distribution centered around 50 for more realistic scores
        const score = generateNormalScore(50, 20, 0, 100);

        await client.query(`
          INSERT INTO creature_social_traits (creature_id, trait_category_id, score)
          VALUES ($1, $2, $3)
          ON CONFLICT (creature_id, trait_category_id) DO NOTHING
        `, [creature.id, category.id, score]);

        insertedCount++;
      }
    }

    console.log(`✅ Generated ${insertedCount} social trait scores\n`);

    // Step 4: Show summary
    console.log('📊 Summary:');

    const traitCounts = await client.query(`
      SELECT COUNT(*) as count FROM creature_social_traits
    `);
    console.log(`   Total trait scores: ${traitCounts.rows[0].count}`);

    const avgScores = await client.query(`
      SELECT
        c.category_name,
        ROUND(AVG(cst.score)) as avg_score,
        MIN(cst.score) as min_score,
        MAX(cst.score) as max_score
      FROM creature_social_traits cst
      JOIN dim_social_trait_category c ON cst.trait_category_id = c.id
      GROUP BY c.id, c.category_name
      ORDER BY c.id
    `);

    console.log('\n   Average scores by category:');
    avgScores.rows.forEach(row => {
      console.log(`     ${row.category_name}: ${row.avg_score} (range: ${row.min_score}-${row.max_score})`);
    });

    // Step 5: Show sample creature
    console.log('\n📝 Sample creature social profile:');
    const sample = await client.query(`
      SELECT
        c.creature_name,
        array_agg(
          cat.category_name || ': ' || cst.score
          ORDER BY cat.id
        ) as traits
      FROM creatures c
      JOIN creature_social_traits cst ON c.id = cst.creature_id
      JOIN dim_social_trait_category cat ON cst.trait_category_id = cat.id
      WHERE c.selected_image IS NOT NULL
      GROUP BY c.id, c.creature_name
      LIMIT 1
    `);

    if (sample.rows.length > 0) {
      console.log(`\n   ${sample.rows[0].creature_name}:`);
      sample.rows[0].traits.forEach(trait => {
        console.log(`     • ${trait}`);
      });
    }

    console.log('\n✨ Social interaction system is ready!\n');
    console.log('💡 Next steps:');
    console.log('   1. Chatlings can now interact with each other');
    console.log('   2. Use the social interaction API to trigger encounters');
    console.log('   3. Friend or foe outcomes trigger notifications and rewards\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

/**
 * Generate a score using normal distribution
 * @param {number} mean - Center point (e.g., 50)
 * @param {number} stdDev - Standard deviation (e.g., 20)
 * @param {number} min - Minimum value (e.g., 0)
 * @param {number} max - Maximum value (e.g., 100)
 */
function generateNormalScore(mean, stdDev, min, max) {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Scale to desired mean and standard deviation
  let score = Math.round(z0 * stdDev + mean);

  // Clamp to min/max
  score = Math.max(min, Math.min(max, score));

  return score;
}

runMigration();
