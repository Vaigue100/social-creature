# Procedural Chat System - Deployment Guide

## Overview

We've pivoted from pre-generating entire conversations to a **procedural/emergent conversation system** where:

1. **All chat lines are pre-approved** in the database (moderation-safe)
2. **Conversations emerge from rules** - client polls for next line
3. **State-based flow** - each line type determines what can follow
4. **Conversations end organically** - no forced closing statements
5. **Full audit trail** - last 1000 conversations logged for quality review

## Architecture Components

### 1. Database Schema (Migration 30)
**File:** `scripts/sql/30_procedural_chat_system.sql`

**Tables:**
- `chat_lines` - Library of pre-approved messages with metadata
- `chat_flow_rules` - State machine defining valid transitions
- `active_conversations` - Current conversation state per user
- `conversation_audit_log` - Rolling log of recent conversations (for QA)
- `trending_topics` - Conversation topics (refreshed weekly)
- `runaway_chatlings` - Chatlings that left due to unhappiness

**Sample Data Included:**
- 15+ starter chat lines
- Flow rules for natural conversation arcs
- Mood and runaway mechanics

### 2. Conversation Engine
**File:** `services/conversation-engine.js`

**Core Functions:**
- `getNextLine(userId)` - Main polling endpoint logic
- `checkStartLikelihood(userId)` - Determines when conversations start
- `startConversation(userId)` - Initiates new conversation
- `continueConversation(conversation)` - Generates next line
- `endConversation(conversation)` - Calculates mood changes, logs to audit
- `selectChatLine()` - Picks appropriate line from library
- `selectNextChatLine()` - Uses flow rules to determine next line type

### 3. API Endpoints
**File:** `admin-server.js` (lines 1855-1914, 1916-1966)

**Client APIs:**
- `GET /api/chat/next-line` - Client polls this every 3-5 seconds
- `GET /api/chat/moods` - Get mood dashboard for all chatlings

**Admin APIs:**
- `GET /api/admin/conversations` - Review audit log
- `POST /api/admin/conversations/:id/flag` - Flag nonsensical conversations
- `POST /api/admin/conversations/:id/notes` - Add admin notes

### 4. Testing Suite
**File:** `scripts/test-conversation-engine.js`

**Features:**
- Generates 50 test conversations
- Validates conversation coherence
- Detects common issues (duplicate speakers, too long/short, etc.)
- Outputs statistics and samples for manual review

**Usage:**
```bash
node scripts/test-conversation-engine.js
```

### 5. Admin Review Interface
**File:** `admin/review-conversations.html`

**Features:**
- View recent conversations from audit log
- Filter by flagged/recent
- Flag nonsensical conversations
- Add admin notes
- Statistics dashboard

**Access:** `http://localhost:3000/admin/review-conversations.html`

### 6. Client Demo
**File:** `user/chatroom-demo.html`

**Features:**
- Polls `/api/chat/next-line` every 3 seconds
- Displays messages as they emerge
- Typing indicators
- Mood dashboard
- Smooth animations

**Access:** `http://localhost:3000/user/chatroom-demo.html`

## Deployment Steps

### Step 1: Run Migration 30
```bash
psql -U your_user -d chatlings -f scripts/sql/30_procedural_chat_system.sql
```

**What it creates:**
- All necessary tables
- Sample chat lines (15+ messages)
- Flow rules (20+ transition rules)
- Indexes for performance

### Step 2: Set Up Chat Likelihood (Optional)
```sql
-- For testing: Set high likelihood to trigger conversations frequently
INSERT INTO chat_likelihood (user_id, likelihood_multiplier)
VALUES (YOUR_TEST_USER_ID, 999999)
ON CONFLICT (user_id) DO UPDATE SET likelihood_multiplier = 999999;

-- For production: Default is 1.0 (2 conversations per day)
-- Users can adjust their own likelihood later
```

### Step 3: Add Trending Topics
```sql
INSERT INTO trending_topics (topic, category, active) VALUES
('Should pineapple be on pizza?', 'food', true),
('Are cats better than dogs?', 'pets', true),
('Is working from home better?', 'lifestyle', true),
('What''s the best way to spend a weekend?', 'lifestyle', true),
('Is social media good or bad?', 'tech', true);
```

### Step 4: Run Test Suite
```bash
node scripts/test-conversation-engine.js
```

**Expected output:**
- 50 test conversations generated
- Pass/warning/fail statistics
- Sample conversations for review
- Common issues detected

**Quality checks:**
- Conversations should be 4-12 turns
- No duplicate consecutive speakers
- All participants speak at least once
- Natural flow (not nonsensical)

### Step 5: Review Test Conversations
1. Open `http://localhost:3000/admin/review-conversations.html`
2. Review the 50 test conversations
3. Flag any nonsensical ones
4. Note patterns in flagged conversations
5. Adjust chat lines or flow rules if needed

### Step 6: Expand Chat Line Library
Add more chat lines to increase variety:

```sql
INSERT INTO chat_lines (text, line_type, responds_to, sentiment, personality_filter) VALUES
('That''s a hot take!', 'neutral', ARRAY['starter', 'disagreement'], 'neutral', NULL),
('Never thought about it that way...', 'agreement', ARRAY['answer'], 'positive', '{"thoughtful": true}'),
-- Add 50-100+ more lines over time
```

### Step 7: Deploy to Production
1. **Server restart** - Conversation engine loads automatically
2. **Monitor first 24 hours** - Check audit log for quality
3. **Adjust likelihood** - Fine-tune conversation frequency
4. **Add more topics** - Keep conversations fresh

## Ongoing Maintenance

### Daily Tasks
1. Review flagged conversations in admin interface
2. Add new chat lines based on what's missing
3. Monitor conversation length statistics

### Weekly Tasks
1. Refresh trending topics (new topics weekly)
2. Review mood changes and runaway rates
3. Analyze conversation patterns

### Monthly Tasks
1. Expand chat line library (target: 200+ lines)
2. Add personality filtering to chat lines
3. Fine-tune flow rules based on patterns

## Scaling Considerations

### For 100k Users
- **Polling load:** 100k users × 1 poll/3s = ~33k requests/sec peak
- **Mitigation:** Add caching layer, rate limiting per user
- **Database:** Active conversations table only has 1 row per user (max 100k rows)
- **Audit log:** Rolling cleanup (keep last 1000 conversations)

### Performance Optimizations
- Index on `active_conversations(user_id)`
- Index on `chat_lines(line_type)`
- Index on `chat_flow_rules(from_type, to_type)`
- Cache trending topics in memory
- Cache chat lines by type in memory

## Risk Mitigation

### Main Risk: Nonsensical Conversations
**Mitigation strategies:**
1. ✅ Audit log stores all conversations
2. ✅ Admin review interface for flagging
3. ✅ Test suite validates coherence
4. ✅ Flow rules prevent impossible transitions
5. ✅ All chat lines are pre-approved

### If nonsense is detected:
1. Flag the conversation in admin interface
2. Add admin notes explaining the issue
3. Identify the problematic chat line or flow rule
4. Update chat lines or flow rules
5. Re-run test suite to validate fix

## Future Enhancements

### Phase 2: Personality Filtering
- Add personality traits to chatlings
- Use `personality_filter` in chat_lines table
- Chatlings say lines matching their personality

### Phase 3: Topic Reactions
- Chatlings have preferred/disliked topics
- Stronger opinions on favorite topics
- More likely to disagree on disliked topics

### Phase 4: Memory System
- Track past conversations between chatlings
- Reference previous interactions
- Build ongoing relationships

## Troubleshooting

### "No conversations happening"
- Check `chat_likelihood.likelihood_multiplier` (should be high for testing)
- Verify trending topics exist and active=true
- Ensure user has 2+ chatlings

### "Conversations too short"
- Increase turn limits in flow rules
- Reduce weight on 'closer' transitions early in conversation

### "Conversations too long"
- Increase weight on 'closer' transitions after turn 5
- Add more `can_end_conversation=true` lines

### "Duplicate speakers"
- Bug in conversation engine - should not happen
- Report and check `continueConversation()` logic

## Testing Checklist

Before production deployment:

- [ ] Migration 30 runs successfully
- [ ] Test suite passes (0 failures)
- [ ] Reviewed 50 test conversations
- [ ] Less than 10% flagged as nonsense
- [ ] Admin review interface accessible
- [ ] Client polling works correctly
- [ ] Mood changes work correctly
- [ ] Runaway mechanics work
- [ ] Trending topics populated
- [ ] Chat likelihood configured

## Support

**Documentation:**
- Architecture: `docs/CHATROOM_ARCHITECTURE.md` (old - being replaced)
- This deployment guide

**Key Files:**
- Migration: `scripts/sql/30_procedural_chat_system.sql`
- Engine: `services/conversation-engine.js`
- Tests: `scripts/test-conversation-engine.js`
- Admin UI: `admin/review-conversations.html`
- Client Demo: `user/chatroom-demo.html`

**For issues:**
Review audit log and test suite output first, then adjust chat lines or flow rules accordingly.
