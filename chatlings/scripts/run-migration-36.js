const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./db-config');

async function runMigration() {
    const client = new Client(config);

    try {
        await client.connect();
        console.log('Connected to database');

        const migrationPath = path.join(__dirname, 'sql', '36_add_user_passwords.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration 36: Add user password security...');
        await client.query(migrationSQL);

        console.log('✅ Migration 36 completed successfully');

        const result = await client.query(`
            SELECT
                COUNT(*) as total_users,
                COUNT(password_hash) as users_with_password
            FROM users
        `);

        console.log('\nUser Password Summary:');
        console.log(`Total users: ${result.rows[0].total_users}`);
        console.log(`Users with password set: ${result.rows[0].users_with_password}`);

    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
