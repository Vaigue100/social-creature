/**
 * Migration 31: Add Chatroom Notification Types
 *
 * Adds new notification types for chatroom system:
 * - new_conversation
 * - chatling_runaway
 * - chatling_recovered
 */

-- Drop the existing constraint
ALTER TABLE notifications
DROP CONSTRAINT check_notification_type;

-- Add new constraint with additional types
ALTER TABLE notifications
ADD CONSTRAINT check_notification_type CHECK (
  notification_type IN (
    'daily_visit',
    'new_discovery',
    'achievement_unlocked',
    'chatling_evolved',
    'reward_claimed',
    'new_conversation',
    'chatling_runaway',
    'chatling_recovered'
  )
);

-- Verify
SELECT 'Migration 31 complete!' as status;
