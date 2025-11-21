-- Migration 33: Track YouTube integration date to skip old likes

-- Add youtube_integrated_at to oauth_accounts
ALTER TABLE oauth_accounts
ADD COLUMN IF NOT EXISTS youtube_integrated_at TIMESTAMP;

-- Add index for YouTube provider lookups
CREATE INDEX IF NOT EXISTS idx_oauth_youtube_integration
ON oauth_accounts(user_id, provider)
WHERE provider = 'youtube';

-- Add comments
COMMENT ON COLUMN oauth_accounts.youtube_integrated_at IS 'When YouTube was first integrated (to skip rewarding old likes)';
