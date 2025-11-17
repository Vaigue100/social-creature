-- Migration 28: Add team member slots to users

-- Add 4 additional team member slots (current_creature_id is team member 1)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS team_member_2_id UUID REFERENCES creatures(id),
ADD COLUMN IF NOT EXISTS team_member_3_id UUID REFERENCES creatures(id),
ADD COLUMN IF NOT EXISTS team_member_4_id UUID REFERENCES creatures(id),
ADD COLUMN IF NOT EXISTS team_member_5_id UUID REFERENCES creatures(id);

-- Add indexes for team member lookups
CREATE INDEX IF NOT EXISTS idx_users_team_member_2 ON users(team_member_2_id);
CREATE INDEX IF NOT EXISTS idx_users_team_member_3 ON users(team_member_3_id);
CREATE INDEX IF NOT EXISTS idx_users_team_member_4 ON users(team_member_4_id);
CREATE INDEX IF NOT EXISTS idx_users_team_member_5 ON users(team_member_5_id);

-- Add comments
COMMENT ON COLUMN users.current_creature_id IS 'Team Leader (Position 1) - Main chatling';
COMMENT ON COLUMN users.team_member_2_id IS 'Team Member 2 - Director of Influence';
COMMENT ON COLUMN users.team_member_3_id IS 'Team Member 3 - Director of Chatling Resources';
COMMENT ON COLUMN users.team_member_4_id IS 'Team Member 4 - Chief of Engagement';
COMMENT ON COLUMN users.team_member_5_id IS 'Team Member 5 - Head of Community';

-- Show updated table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name LIKE '%creature%' OR column_name LIKE '%team%'
ORDER BY ordinal_position;
