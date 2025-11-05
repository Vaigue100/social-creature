/**
 * Export Prompts for Perchance
 *
 * Exports creature_prompts to CSV with just the prompt text
 * User will paste this into Perchance to generate images
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = { ...require('./db-config'), database: 'chatlings' };

const OUTPUT_FILE = path.join(__dirname, '..', 'artwork', 'perchance_prompts.csv');

async function exportPromptsForPerchance() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected to database...\n');

    // Get all prompts
    const result = await client.query(`
      SELECT id, prompt
      FROM creature_prompts
      ORDER BY id
    `);

    console.log(`Found ${result.rows.length} prompts to export\n`);

    // Create CSV with just prompts (one per line)
    // No header, just the prompt text - ready to paste into Perchance
    const csvLines = result.rows.map(row => row.prompt);
    const csvContent = csvLines.join('\n');

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');

    console.log('='.repeat(80));
    console.log('Export Complete!');
    console.log('='.repeat(80));
    console.log(`File: ${OUTPUT_FILE}`);
    console.log(`Prompts exported: ${result.rows.length}`);
    console.log('\nNext steps:');
    console.log('1. Copy perchance_prompts.csv to your gaming PC');
    console.log('2. Open Perchance AI image generator');
    console.log('3. Paste prompts one by one (or use batch mode if available)');
    console.log('4. Download generated images as ZIP');
    console.log('5. Run import-perchance-zip.js to process the images');
    console.log('='.repeat(80));

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('Export Prompts for Perchance');
console.log('================================================================================\n');

exportPromptsForPerchance();
