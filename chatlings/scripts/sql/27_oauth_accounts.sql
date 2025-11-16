-- Migration 27: Add OAuth authentication support

-- Create oauth_accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'facebook', etc.
    provider_user_id VARCHAR(255) NOT NULL, -- The user's ID from the provider
    provider_email VARCHAR(255), -- Email from the provider
    provider_display_name VARCHAR(255), -- Display name from provider
    access_token TEXT, -- Current access token (encrypted in production!)
    refresh_token TEXT, -- Refresh token (encrypted in production!)
    token_expires_at TIMESTAMP, -- When the access token expires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one provider account can only link to one user
    UNIQUE(provider, provider_user_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider_lookup ON oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_email ON oauth_accounts(provider_email);

-- Add comments
COMMENT ON TABLE oauth_accounts IS 'Links external OAuth providers (Google, GitHub, etc.) to user accounts';
COMMENT ON COLUMN oauth_accounts.provider IS 'OAuth provider name: google, github, facebook, etc.';
COMMENT ON COLUMN oauth_accounts.provider_user_id IS 'User ID from the OAuth provider';
COMMENT ON COLUMN oauth_accounts.access_token IS 'OAuth access token (should be encrypted in production)';
COMMENT ON COLUMN oauth_accounts.refresh_token IS 'OAuth refresh token (should be encrypted in production)';

-- Show table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'oauth_accounts'
ORDER BY ordinal_position;
