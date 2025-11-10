const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

/**
 * Update social trait categories to be more creature-appropriate
 * Replaces: Persuasion → Friendliness, Team Player → Playfulness, Wisdom → Curiosity
 */

async function updateCategories() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🎭 Updating social trait categories...\n');

    // Step 1: Show current categories
    console.log('📋 Current categories:');
    const beforeCategories = await client.query('SELECT id, category_name, icon FROM dim_social_trait_category ORDER BY id');
    beforeCategories.rows.forEach(cat => {
      console.log(`   ${cat.id}. ${cat.icon} ${cat.category_name}`);
    });
    console.log('');

    // Step 2: Run SQL migration
    console.log('🔧 Applying changes...');
    const migrationPath = path.join(__dirname, 'sql', 'update_social_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Categories updated\n');

    // Step 3: Show updated categories
    console.log('📋 Updated categories:');
    const afterCategories = await client.query('SELECT id, category_name, description, icon FROM dim_social_trait_category ORDER BY id');
    afterCategories.rows.forEach(cat => {
      console.log(`   ${cat.id}. ${cat.icon} ${cat.category_name}`);
      console.log(`      ${cat.description}`);
    });
    console.log('');

    // Step 4: Regenerate scores for the 3 updated categories
    console.log('🎲 Regenerating scores for updated categories...');

    const creatures = await client.query('SELECT id FROM creatures');
    const updatedCats = await client.query(`
      SELECT id FROM dim_social_trait_category
      WHERE category_name IN ('Friendliness', 'Playfulness', 'Curiosity')
      ORDER BY id
    `);

    console.log(`   Found ${creatures.rows.length} creatures`);
    console.log(`   Regenerating scores for ${updatedCats.rows.length} categories\n`);

    let insertedCount = 0;
    for (const creature of creatures.rows) {
      for (const category of updatedCats.rows) {
        // Generate random score with normal distribution
        const score = generateNormalScore(50, 20, 0, 100);

        await client.query(`
          INSERT INTO creature_social_traits (creature_id, trait_category_id, score)
          VALUES ($1, $2, $3)
          ON CONFLICT (creature_id, trait_category_id)
          DO UPDATE SET score = $3, updated_at = NOW()
        `, [creature.id, category.id, score]);

        insertedCount++;
      }
    }

    console.log(`✅ Regenerated ${insertedCount} scores\n`);

    // Step 5: Show summary statistics
    console.log('📊 Summary:');

    const totalScores = await client.query('SELECT COUNT(*) as count FROM creature_social_traits');
    console.log(`   Total trait scores: ${totalScores.rows[0].count}`);

    const avgScores = await client.query(`
      SELECT
        c.category_name,
        c.icon,
        ROUND(AVG(cst.score)) as avg_score,
        MIN(cst.score) as min_score,
        MAX(cst.score) as max_score
      FROM creature_social_traits cst
      JOIN dim_social_trait_category c ON cst.trait_category_id = c.id
      GROUP BY c.id, c.category_name, c.icon
      ORDER BY c.id
    `);

    console.log('\n   Average scores by category:');
    avgScores.rows.forEach(row => {
      console.log(`     ${row.icon} ${row.category_name}: ${row.avg_score} (range: ${row.min_score}-${row.max_score})`);
    });

    // Step 6: Show sample creature with new categories
    console.log('\n📝 Sample creature with updated traits:');
    const sample = await client.query(`
      SELECT
        c.creature_name,
        array_agg(
          cat.icon || ' ' || cat.category_name || ': ' || cst.score
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

    console.log('\n✨ Social categories updated successfully!\n');
    console.log('💡 Changes made:');
    console.log('   • Persuasion → 😊 Friendliness (how warm and welcoming)');
    console.log('   • Team Player → 🎮 Playfulness (love of games and fun)');
    console.log('   • Wisdom → 🔍 Curiosity (eager to explore and learn)');
    console.log('');
    console.log('   Kept: Energy Level, Creativity, Empathy, Confidence, Humor');
    console.log('');
    console.log('🎯 The categories are now more appropriate for cute creatures!');
    console.log('   All interactions will use the new categories going forward.\n');

  } catch (error) {
    console.error('❌ Update failed:', error.message);
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

updateCategories();
