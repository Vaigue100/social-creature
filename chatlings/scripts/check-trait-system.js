const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkTraitSystem() {
  const client = new Client(config);

  try {
    await client.connect();

    // Get trait categories
    console.log('=== SOCIAL TRAIT CATEGORIES ===');
    const categories = await client.query(`
      SELECT id, category_name, icon, description
      FROM dim_social_trait_category
      ORDER BY id
    `);
    console.log(categories.rows);

    // Get body types - first check structure
    console.log('\n=== BODY TYPES TABLE STRUCTURE ===');
    const bodyTypeColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'dim_body_type'
      ORDER BY ordinal_position
    `);
    console.log(bodyTypeColumns.rows);

    // Get body types
    console.log('\n=== BODY TYPES ===');
    const bodyTypes = await client.query(`
      SELECT *
      FROM dim_body_type
      LIMIT 10
    `);
    console.log(bodyTypes.rows);

    // Check for creatures without traits
    console.log('\n=== CREATURES WITHOUT TRAITS ===');
    const noTraits = await client.query(`
      SELECT c.id, c.creature_name, c.rarity_tier, cp.body_type_id, bt.body_type_name as body_type
      FROM creatures c
      LEFT JOIN creature_prompts cp ON c.prompt_id = cp.id
      LEFT JOIN dim_body_type bt ON cp.body_type_id = bt.id
      LEFT JOIN creature_social_traits cst ON c.id = cst.creature_id
      WHERE cst.creature_id IS NULL
        AND c.is_deleted = false
      LIMIT 10
    `);
    console.log(`Found ${noTraits.rows.length} creatures without traits`);
    if (noTraits.rows.length > 0) {
      console.log(noTraits.rows);
    }

    // Total count of creatures without traits
    const noTraitsCount = await client.query(`
      SELECT COUNT(*) as count
      FROM creatures c
      LEFT JOIN creature_social_traits cst ON c.id = cst.creature_id
      WHERE cst.creature_id IS NULL
        AND c.is_deleted = false
    `);
    console.log(`\nTotal creatures without traits: ${noTraitsCount.rows[0].count}`);

    // Check creatures table structure
    console.log('\n=== CREATURES TABLE COLUMNS ===');
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'creatures'
      ORDER BY ordinal_position
    `);
    console.log(columns.rows.map(r => `${r.column_name}: ${r.data_type}`).join('\n'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTraitSystem();
