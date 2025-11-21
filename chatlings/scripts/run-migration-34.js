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
        const migrationPath = path.join(__dirname, 'sql', '34_youtube_chat_lines.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration 34: Add YouTube video-sharing chat lines...');
        await client.query(migrationSQL);

        console.log('✅ Migration 34 completed successfully');

        // Show results
        const result = await client.query(`
            SELECT
                COUNT(*) as total_lines,
                COUNT(CASE WHEN requires_youtube_topic = true THEN 1 END) as youtube_lines,
                COUNT(CASE WHEN line_type = 'video-share' THEN 1 END) as video_share_starters
            FROM chat_lines
        `);

        console.log('\nChat Lines Summary:');
        console.log(`Total chat lines: ${result.rows[0].total_lines}`);
        console.log(`YouTube-specific lines: ${result.rows[0].youtube_lines}`);
        console.log(`Video-share starters: ${result.rows[0].video_share_starters}`);

        // Show flow rules
        const flowResult = await client.query(`
            SELECT COUNT(*) as count
            FROM chat_flow_rules
            WHERE from_type = 'video-share' OR to_type = 'video-share'
        `);

        console.log(`Flow rules involving video-share: ${flowResult.rows[0].count}`);

    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
