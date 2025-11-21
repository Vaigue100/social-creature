/**
 * Switch Active Account Script
 * Allows switching between multiple accounts for a single OAuth login
 */

const { Client } = require('pg');
const readline = require('readline');
const config = require('./db-config');

const TARGET_EMAIL = 'xbarneyroddis@gmail.com';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function listAccounts() {
    const client = new Client(config);

    try {
        await client.connect();

        // Get all users for this email from oauth_accounts
        const result = await client.query(`
            SELECT
                u.id as user_id,
                u.username,
                u.email,
                u.active_account,
                u.created_at,
                u.abandoned_at,
                oa.provider_user_id,
                (SELECT COUNT(*) FROM user_rewards WHERE user_id = u.id) as chatling_count,
                (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) as achievement_count
            FROM users u
            JOIN oauth_accounts oa ON u.id = oa.user_id
            WHERE oa.provider_email = $1
            ORDER BY u.created_at ASC
        `, [TARGET_EMAIL]);

        return result.rows;

    } finally {
        await client.end();
    }
}

async function switchAccount(userId) {
    const client = new Client(config);

    try {
        await client.connect();

        // Get the provider_user_id for this user
        const oauthResult = await client.query(
            'SELECT provider_user_id, provider FROM oauth_accounts WHERE user_id = $1',
            [userId]
        );

        if (oauthResult.rows.length === 0) {
            throw new Error('OAuth account not found');
        }

        const { provider_user_id, provider } = oauthResult.rows[0];

        // Deactivate all accounts for this OAuth login
        await client.query(`
            UPDATE users
            SET active_account = false
            WHERE id IN (
                SELECT user_id FROM oauth_accounts
                WHERE provider_user_id = $1 AND provider = $2
            )
        `, [provider_user_id, provider]);

        // Activate the selected account
        await client.query(
            'UPDATE users SET active_account = true WHERE id = $1',
            [userId]
        );

        console.log('\n✅ Account switched successfully!');

    } finally {
        await client.end();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function main() {
    try {
        // List all accounts
        const accounts = await listAccounts();

        if (accounts.length === 0) {
            console.log('No accounts found for ' + TARGET_EMAIL);
            rl.close();
            return;
        }

        console.log('Found ' + accounts.length + ' account(s):\n');

        // Display accounts
        accounts.forEach((account, index) => {
            const status = account.active_account ? '[ACTIVE]' : '[INACTIVE]';
            const statusColor = account.active_account ? '🟢' : '⚪';
            const abandoned = account.abandoned_at ? ' (ABANDONED)' : '';

            console.log(`${index + 1}. ${statusColor} ${status}${abandoned}`);
            console.log(`   Username: ${account.username}`);
            console.log(`   User ID: ${account.user_id}`);
            console.log(`   Created: ${formatDate(account.created_at)}`);
            console.log(`   Chatlings: ${account.chatling_count} | Achievements: ${account.achievement_count}`);

            if (account.abandoned_at) {
                console.log(`   Abandoned: ${formatDate(account.abandoned_at)}`);
            }

            console.log('');
        });

        // Ask user to select account
        rl.question('Enter account number to activate (or 0 to cancel): ', async (answer) => {
            const selection = parseInt(answer);

            if (selection === 0 || isNaN(selection)) {
                console.log('Cancelled.');
                rl.close();
                return;
            }

            if (selection < 1 || selection > accounts.length) {
                console.log('Invalid selection.');
                rl.close();
                return;
            }

            const selectedAccount = accounts[selection - 1];

            console.log(`\nSwitching to account: ${selectedAccount.username}`);

            await switchAccount(selectedAccount.user_id);

            rl.close();
        });

    } catch (error) {
        console.error('Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

main();
