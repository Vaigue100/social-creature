/**
 * Clear creatures table and regenerate without names
 * Names will be assigned by the watcher when images are processed
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

const TARGET_PROMPTS = 100;
const CREATURES_PER_PROMPT = 10;

async function clearAndRegenerate() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Clear creatures table
    console.log('Clearing creatures table...');
    await client.query('DELETE FROM creatures');
    console.log('✓ Creatures table cleared\n');

    // Get all prompts
    const promptsResult = await client.query('SELECT id FROM creature_prompts ORDER BY id');
    console.log(`Found ${promptsResult.rows.length} prompts\n`);

    let creaturesCreated = 0;

    for (const promptRow of promptsResult.rows) {
      const promptId = promptRow.id;

      // Create 10 creatures for this prompt with no names yet
      for (let i = 0; i < CREATURES_PER_PROMPT; i++) {
        await client.query(`
          INSERT INTO creatures (creature_name, prompt_id, rarity_tier)
          VALUES ($1, $2, $3)
        `, [`Unnamed Chatling ${creaturesCreated + 1}`, promptId, 'Common']);

        creaturesCreated++;
      }

      if (creaturesCreated % 100 === 0) {
        console.log(`Progress: ${creaturesCreated} creatures created...`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Regeneration Complete!');
    console.log('='.repeat(80));
    console.log(`Creatures created: ${creaturesCreated}`);
    console.log(`Prompts: ${promptsResult.rows.length}`);
    console.log(`\nNames will be assigned automatically by the watcher when images are processed.`);
    console.log('='.repeat(80));

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Clear & Regenerate Creatures (Without Names)');
console.log('================================================================================\n');

clearAndRegenerate();
