-- Migration 36: Add Password Security
-- Adds memorable password for sensitive actions (partial password verification)
-- Industry standard: UK banking-style challenge-response authentication

-- Add password hash column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Note: Passwords are hashed using bcrypt before storage
-- For partial verification, we store individual character hashes
-- This allows us to verify specific positions without storing plaintext

-- Verify
SELECT
    COUNT(*) as total_users,
    COUNT(password_hash) as users_with_password
FROM users;
