-- Migration 35: Account Abandonment System
-- Allows users to abandon their account and start fresh while keeping OAuth login

-- Add active_account flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS active_account BOOLEAN DEFAULT true;

-- Add abandoned_at timestamp for tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP;

-- Set all existing users to active
UPDATE users SET active_account = true WHERE active_account IS NULL;

-- Note: We cannot add a database constraint for "one active account per OAuth login"
-- because the relationship is in oauth_accounts table (provider_user_id -> user_id)
-- This will be enforced at the application level

-- Verify: Show users grouped by OAuth account
SELECT
    oa.provider_user_id,
    oa.provider_email,
    u.id as user_id,
    u.username,
    u.active_account,
    u.created_at,
    u.abandoned_at
FROM users u
JOIN oauth_accounts oa ON u.id = oa.user_id
ORDER BY oa.provider_user_id, u.created_at;
