# Chatroom System Architecture

## Overview
Chatlings interact with each other in conversations about trending topics, affecting their mood and potentially causing them to run away.

## System Components

### 1. Database Schema

**Tables:**
- `trending_topics` - Global pool of conversation topics (refreshed weekly)
- `chatling_conversations` - Conversation sessions (1-2 per user per day)
- `conversation_messages` - Individual messages in each conversation
- `user_rewards.mood_status` - Tracks chatling mood (happy/neutral/unhappy)
- `runaway_chatlings` - Chatlings that left due to unhappiness
- `conversation_generation_log` - Tracks background job execution

### 2. Conversation Generation (Server-Side)

**Background Job Schedule:**
- Runs twice daily: 6:00 AM and 6:00 PM (configurable)
- Processes users in batches of 100
- ~1.4 hours to process 100k users per run

**Generation Logic:**
1. For each user:
   - Get their chatling collection (from user_rewards)
   - Randomly select 2-5 chatlings (weighted: 40% chance 2, 30% chance 3, 20% chance 4, 10% chance 5)
   - Pick random trending topic from global pool
   - Generate conversation based on chatling personalities
   - Calculate mood outcomes based on conversation dynamics
   - Update chatling moods
   - Check if unhappy chatlings run away (10% chance per unhappy strike)

**Conversation Algorithm:**
```
FOR each participant chatling:
  - Determine opinion on topic (agree/disagree based on personality)
  - Generate 2-4 messages per chatling
  - Messages reflect their opinion and react to others

IF chatlings mostly agree: all become happy/neutral
IF chatlings conflict: some become unhappy
IF chatling already unhappy + conflict: increase unhappy_count
IF unhappy_count >= 3: 10% chance to run away
```

### 3. Chatroom Service (services/chatroom-service.js)

**Responsibilities:**
- Generate conversations for a user
- Manage chatling moods
- Handle runaway logic
- Provide API endpoints for client

**Key Methods:**
- `generateConversation(userId)` - Create new conversation
- `selectParticipants(userChatlings)` - Pick 2-5 chatlings (weighted)
- `generateMessages(participants, topic)` - Create dialogue
- `updateMoods(conversationId)` - Apply mood changes
- `checkRunaways(userId)` - Process chatlings that might leave
- `recoverRunaway(userId, creatureId)` - Bring back a runaway

### 4. Conversation Generator (services/conversation-generator.js)

**Responsibilities:**
- Create realistic dialogue based on chatling traits
- Determine opinions based on personality
- Generate varied message types

**Message Templates:**
Positive reactions:
- "I totally agree with [topic]!"
- "This is exactly what I've been thinking!"
- "You get it! This is so true!"

Negative reactions:
- "I don't know about that..."
- "That's a terrible take, honestly"
- "Why would anyone think that?"

Neutral reactions:
- "I can see both sides of this"
- "Interesting perspective"
- "Not sure how I feel about this"

### 5. Client-Side (user/chatroom.html)

**Features:**
- Live chat animation (messages appear one by one)
- Typing indicators between messages
- Chatling avatars with mood indicators
- Conversation history (last 10 conversations)
- Unread badge in navigation
- Runaway recovery interface

**Animation Flow:**
1. Load conversation data from server
2. Display chatling participants with avatars
3. Show typing indicator for first chatling
4. Fade in first message (1 second delay)
5. Repeat for each message with delays
6. Show mood changes at end of conversation

**UI Sections:**
- **Active Conversation**: Current/latest conversation with animation
- **Conversation History**: List of past conversations (collapsed)
- **Runaway Recovery**: Special section for recovering lost chatlings
- **Mood Dashboard**: Overview of all chatlings' current moods

### 6. API Endpoints

```
GET  /api/chatroom/conversations
     - Get user's conversations (paginated)
     - Returns: list of conversations with messages

GET  /api/chatroom/conversation/:id
     - Get specific conversation details
     - Returns: conversation with all messages

POST /api/chatroom/mark-read/:id
     - Mark conversation as read
     - Returns: success

GET  /api/chatroom/runaways
     - Get user's runaway chatlings
     - Returns: list of runaways with recovery info

POST /api/chatroom/recover/:creatureId
     - Attempt to recover a runaway chatling
     - Returns: success/failure with message

POST /api/chatroom/generate (admin only)
     - Manually trigger conversation generation
     - For testing purposes
```

## Scalability Plan (100k Users)

### Performance Calculations
- **Users**: 100,000
- **Conversations per day**: 2 × 100,000 = 200,000
- **Messages per conversation**: ~8-12 messages (avg 10)
- **Database inserts per day**: ~2 million messages

### Background Job Strategy
```
Batch Size: 100 users
Batches Needed: 1,000
Time per Batch: ~5 seconds
Total Time: ~1.4 hours

Schedule:
- Morning batch: 6:00 AM - 7:30 AM
- Evening batch: 6:00 PM - 7:30 PM
```

### Database Optimization
- Index on `chatling_conversations(user_id, created_at DESC)`
- Index on `conversation_messages(conversation_id, message_order)`
- Index on `user_rewards(user_id, mood_status)`
- Partition `conversation_messages` by month (for archival)

### Caching Strategy
- Cache trending topics in memory (refresh every 6 hours)
- Cache user's last conversation in session
- No real-time features = no WebSocket overhead

## Mood & Runaway System

### Mood Transitions
```
happy → neutral → unhappy → runaway
   ↑_________|
   (good conversation)
```

### Runaway Logic
```
IF chatling.unhappy_count >= 3:
  IF random(1-100) <= 10:  // 10% chance
    MOVE to runaway_chatlings table
    REMOVE from user_rewards
    CREATE notification
```

### Recovery System
- Runaways appear in special "Recovery" section
- User can attempt recovery (costs coins/action)
- Success rate based on recovery_difficulty:
  - Easy: 80% success
  - Normal: 50% success
  - Hard: 20% success
- Failed recovery increases difficulty

## Future Enhancements

1. **Personality System**: More nuanced chatling personalities affecting opinions
2. **Topic Reactions**: Chatlings have preferred/disliked topic categories
3. **Friendship System**: Chatlings remember past conversations with each other
4. **User Influence**: User can assign chatlings to "meditation" to improve mood
5. **Rare Events**: Special conversations with bonus rewards
6. **Team Synergy**: Team members interact more positively
7. **Seasonal Topics**: Holiday/event-specific conversation topics

## Testing Strategy

1. **Unit Tests**: Test conversation generation logic
2. **Load Tests**: Simulate 100k user batch processing
3. **Manual Tests**:
   - Generate conversation for test user
   - Verify mood updates correctly
   - Test runaway and recovery flow
   - Check animation timing on client

## Deployment Checklist

- [ ] Run migration 30
- [ ] Deploy ChatroomService and ConversationGenerator
- [ ] Set up cron job for 6am/6pm generation
- [ ] Deploy chatroom.html UI
- [ ] Test with small user batch first
- [ ] Monitor database performance
- [ ] Gradually scale to all users
