-- Create Test001 account with all chatlings
-- Run this against the chatlings database

\c chatlings;

-- Create Test001 user if it doesn't exist
INSERT INTO users (username, email, created_at)
VALUES ('Test001', 'test001@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE
SET updated_at = CURRENT_TIMESTAMP
RETURNING id;

-- Store the user ID in a variable
DO $$
DECLARE
    test_user_id UUID;
    creature_record RECORD;
BEGIN
    -- Get the Test001 user ID
    SELECT id INTO test_user_id FROM users WHERE username = 'Test001';

    -- Assign ALL creatures to this user
    FOR creature_record IN
        SELECT id FROM creatures WHERE is_active = TRUE
    LOOP
        INSERT INTO user_rewards (user_id, creature_id, claimed_at, source)
        VALUES (test_user_id, creature_record.id, CURRENT_TIMESTAMP, 'test_account')
        ON CONFLICT (user_id, creature_id) DO NOTHING;
    END LOOP;

    -- Set a random creature as the current chatling
    UPDATE users
    SET current_creature_id = (
        SELECT id FROM creatures WHERE is_active = TRUE ORDER BY RANDOM() LIMIT 1
    )
    WHERE id = test_user_id;

    RAISE NOTICE 'Test001 account created with all chatlings assigned!';
END $$;

-- Show stats for Test001
SELECT
    u.username,
    u.email,
    c.creature_name as current_chatling,
    COUNT(DISTINCT ur.creature_id) as total_chatlings
FROM users u
LEFT JOIN user_rewards ur ON u.id = ur.user_id
LEFT JOIN creatures c ON u.current_creature_id = c.id
WHERE u.username = 'Test001'
GROUP BY u.id, u.username, u.email, c.creature_name;
