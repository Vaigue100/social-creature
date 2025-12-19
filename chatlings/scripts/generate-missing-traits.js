/**
 * Generate traits for all creatures that don't have them yet
 */

const { Client } = require('pg');
const { generateTraits, saveTraits } = require('./trait-generator');
const config = { ...require('./db-config'), database: 'chatlings' };

async function generateMissingTraits() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔍 Finding creatures without traits...\n');

    // Get all active creatures
    const creaturesResult = await client.query(`
      SELECT
        c.id,
        c.creature_name,
        c.rarity_tier,
        bt.body_type_name
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      WHERE c.is_active = true
        AND c.is_deleted = false
    `);

    console.log(`Found ${creaturesResult.rows.length} active creatures\n`);

    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const creature of creaturesResult.rows) {
      try {
        // Check if creature already has traits
        const existingTraits = await client.query(`
          SELECT COUNT(*) as count
          FROM creature_social_traits
          WHERE creature_id = $1
        `, [creature.id]);

        const hasTraits = parseInt(existingTraits.rows[0].count) > 0;

        if (hasTraits) {
          skippedCount++;
          continue;
        }

        // Generate traits
        const bodyTypeName = creature.body_type_name || 'Cute';
        const rarityTier = creature.rarity_tier || 'Common';

        const traits = generateTraits(bodyTypeName, rarityTier);
        await saveTraits(client, creature.id, traits);

        generatedCount++;
        console.log(`✅ Generated traits for: ${creature.creature_name} (${bodyTypeName}, ${rarityTier})`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error generating traits for ${creature.creature_name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`  Total creatures: ${creaturesResult.rows.length}`);
    console.log(`  Traits generated: ${generatedCount}`);
    console.log(`  Already had traits: ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
generateMissingTraits().catch(console.error);
