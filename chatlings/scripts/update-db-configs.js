/**
 * Update all scripts to use shared db-config.js
 */

const fs = require('fs');
const path = require('path');

const files = [
  'import-data-only.js',
  'generate-shortnames.js',
  'add-shortname-columns.js',
  'update-shortnames.js',
  'regenerate-better-shortnames.js',
  'generate-image-prompts.js',
  'update-shortnames-v2.js'
];

const oldPattern = `const config = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '!1Swagger!1',
  database: 'chatlings'
};`;

const newPattern = `const config = { ...require('./db-config'), database: 'chatlings' };`;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('!1Swagger!1')) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${file}`);
    } else {
      console.log(`- Skipped: ${file} (already updated)`);
    }
  } else {
    console.log(`! Not found: ${file}`);
  }
});

console.log('\nDone!');
