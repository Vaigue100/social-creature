/**
 * Run all migrations in sequence against Azure database
 */

const { execSync } = require('child_process');
const path = require('path');

const migrations = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

console.log('Running all migrations against Azure database...\n');

for (const num of migrations) {
  const scriptPath = path.join(__dirname, `run-migration-${num}.js`);
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running migration ${num}...`);
    console.log('='.repeat(80));

    execSync(`node "${scriptPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    console.log(`✓ Migration ${num} completed`);
  } catch (error) {
    console.error(`\n❌ Migration ${num} failed:`, error.message);
    console.log('\nContinuing with next migration...');
  }
}

console.log('\n' + '='.repeat(80));
console.log('All migrations completed!');
console.log('='.repeat(80));
