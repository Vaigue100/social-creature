/**
 * Check for duplicate creatures (same image, different names)
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function checkDuplicates() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Check for duplicate images (same selected_image)
    console.log('='.repeat(80));
    console.log('DUPLICATE IMAGES (same image file, different creatures)');
    console.log('='.repeat(80));

    const duplicateImages = await client.query(`
      SELECT
        selected_image,
        COUNT(*) as creature_count,
        STRING_AGG(creature_name, ', ') as creature_names,
        STRING_AGG(id::text, ', ') as creature_ids
      FROM creatures
      WHERE selected_image IS NOT NULL
      GROUP BY selected_image
      HAVING COUNT(*) > 1
      ORDER BY creature_count DESC
      LIMIT 20
    `);

    if (duplicateImages.rows.length > 0) {
      console.log(`Found ${duplicateImages.rows.length} image files used by multiple creatures:\n`);
      duplicateImages.rows.forEach(row => {
        console.log(`Image: ${row.selected_image}`);
        console.log(`  Used by ${row.creature_count} creatures: ${row.creature_names}`);
        console.log(`  IDs: ${row.creature_ids}\n`);
      });
    } else {
      console.log('No duplicate images found.\n');
    }

    // Check for creatures sharing the same prompt_id (family members)
    console.log('='.repeat(80));
    console.log('CREATURES PER PROMPT (families with multiple siblings)');
    console.log('='.repeat(80));

    const familyMembers = await client.query(`
      SELECT
        cp.id as prompt_id,
        cp.prompt,
        COUNT(c.id) as creature_count,
        STRING_AGG(c.creature_name, ', ') as creature_names
      FROM creature_prompts cp
      LEFT JOIN creatures c ON c.prompt_id = cp.id
      GROUP BY cp.id, cp.prompt
      HAVING COUNT(c.id) > 1
      ORDER BY creature_count DESC
      LIMIT 20
    `);

    if (familyMembers.rows.length > 0) {
      console.log(`Found ${familyMembers.rows.length} prompts with multiple creatures:\n`);
      familyMembers.rows.forEach(row => {
        console.log(`Prompt ID: ${row.prompt_id}`);
        console.log(`  ${row.creature_count} creatures: ${row.creature_names}`);
        console.log(`  Prompt: ${row.prompt.substring(0, 80)}...\n`);
      });
    } else {
      console.log('No prompts with multiple creatures found.\n');
    }

    // Total stats
    console.log('='.repeat(80));
    console.log('OVERALL STATS');
    console.log('='.repeat(80));

    const stats = await client.query(`
      SELECT
        COUNT(DISTINCT c.id) as total_creatures,
        COUNT(DISTINCT c.selected_image) as unique_images,
        COUNT(DISTINCT c.prompt_id) as unique_prompts
      FROM creatures c
      WHERE c.selected_image IS NOT NULL
    `);

    const s = stats.rows[0];
    console.log(`Total creatures with images: ${s.total_creatures}`);
    console.log(`Unique image files: ${s.unique_images}`);
    console.log(`Unique prompts: ${s.unique_prompts}`);
    console.log(`\nDuplicate ratio: ${s.total_creatures - s.unique_images} creatures sharing images`);

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDuplicates();
