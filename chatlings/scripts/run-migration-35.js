const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./db-config');

async function runMigration() {
    const client = new Client(config);

    try {
        await client.connect();
        console.log('Connected to database');

        // Read migration file
        const migrationPath = path.join(__dirname, 'sql', '35_account_abandonment.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration 35: Account abandonment system...');
        await client.query(migrationSQL);

        console.log('✅ Migration 35 completed successfully');

        // Show results
        const result = await client.query(`
            SELECT
                COUNT(*) as total_users,
                COUNT(CASE WHEN active_account = true THEN 1 END) as active_users,
                COUNT(CASE WHEN active_account = false THEN 1 END) as abandoned_users
            FROM users
        `);

        console.log('\nUser Account Summary:');
        console.log(`Total users: ${result.rows[0].total_users}`);
        console.log(`Active accounts: ${result.rows[0].active_users}`);
        console.log(`Abandoned accounts: ${result.rows[0].abandoned_users}`);

    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
