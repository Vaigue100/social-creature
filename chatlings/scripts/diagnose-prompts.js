/**
 * Diagnose prompt matching issues
 * Shows sample prompts and checks for potential duplicates
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function diagnose() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // 1. Check total prompts
    const totalResult = await client.query('SELECT COUNT(*) FROM creature_prompts');
    console.log(`Total prompts in database: ${totalResult.rows[0].count}\n`);

    // 2. Show sample prompts
    console.log('Sample prompts:');
    console.log('='.repeat(80));
    const sampleResult = await client.query(`
      SELECT id, prompt
      FROM creature_prompts
      ORDER BY id
      LIMIT 10
    `);

    sampleResult.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.prompt.substring(0, 70)}...`);
    });
    console.log('');

    // 3. Check for creatures with the same prompt_id (duplicates)
    console.log('Checking for duplicate creatures (same prompt_id):');
    console.log('='.repeat(80));
    const duplicatesResult = await client.query(`
      SELECT
        prompt_id,
        COUNT(*) as creature_count,
        array_agg(creature_name) as creature_names
      FROM creatures
      WHERE is_active = true
      GROUP BY prompt_id
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `);

    if (duplicatesResult.rows.length === 0) {
      console.log('No duplicates found! Each prompt has a unique creature.\n');
    } else {
      console.log(`Found ${duplicatesResult.rows.length} prompts with multiple creatures:\n`);
      duplicatesResult.rows.forEach(row => {
        console.log(`Prompt ID ${row.prompt_id}: ${row.creature_count} creatures`);
        console.log(`  Names: ${row.creature_names.slice(0, 5).join(', ')}${row.creature_count > 5 ? '...' : ''}`);
        console.log('');
      });
    }

    // 4. Get a sample prompt to test matching
    console.log('Testing prompt matching logic:');
    console.log('='.repeat(80));

    const testPromptResult = await client.query(`
      SELECT cp.id, cp.prompt, c.creature_name
      FROM creature_prompts cp
      JOIN creatures c ON c.prompt_id = cp.id
      WHERE c.is_active = true
      LIMIT 1
    `);

    if (testPromptResult.rows.length > 0) {
      const testPrompt = testPromptResult.rows[0].prompt;
      console.log(`Test prompt: "${testPrompt.substring(0, 100)}..."`);
      console.log(`Associated creature: ${testPromptResult.rows[0].creature_name}\n`);

      // Simulate what the fuzzy match would do
      const fuzzyResult = await client.query(`
        SELECT id, prompt
        FROM creature_prompts
        WHERE $1 LIKE '%' || prompt || '%'
        ORDER BY length(prompt) DESC
        LIMIT 5
      `, [testPrompt]);

      console.log('Fuzzy match results (what the watcher would find):');
      fuzzyResult.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ID ${row.id}: ${row.prompt.substring(0, 70)}...`);
      });
    }

    // 5. Check prompt uniqueness
    console.log('\n' + '='.repeat(80));
    console.log('Checking if prompts are unique:');
    const uniqueCheck = await client.query(`
      SELECT prompt, COUNT(*) as count
      FROM creature_prompts
      GROUP BY prompt
      HAVING COUNT(*) > 1
    `);

    if (uniqueCheck.rows.length === 0) {
      console.log('✓ All prompts are unique in creature_prompts table\n');
    } else {
      console.log(`✗ Found ${uniqueCheck.rows.length} duplicate prompts!\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

diagnose();
