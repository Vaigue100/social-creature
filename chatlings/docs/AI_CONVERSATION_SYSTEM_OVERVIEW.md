# AI Conversation System - Architecture Overview

## Executive Summary

This document outlines the complete architecture for the YouTube AI Conversation Viewing system, replacing the participation-based chatroom system with AI-generated conversations that users can view and enjoy.

**Key Features:**
- AI generates realistic conversations about trending YouTube videos daily
- User's chatlings are assigned to comments automatically
- User's attitude settings (Enthusiasm, Criticism, Humor) customize how comments appear
- Glow stat changes based on comment sentiment (positive/negative)
- Cost-effective: Generate once server-side, customize per user

**Estimated Cost:** ~$1.60/month for unlimited users

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Azure OpenAI vs Direct OpenAI](#azure-openai-vs-direct-openai)
3. [Setup Instructions](#setup-instructions)
4. [Database Schema](#database-schema)
5. [Service Architecture](#service-architecture)
6. [API Design](#api-design)
7. [Frontend Design](#frontend-design)
8. [Cost Breakdown](#cost-breakdown)
9. [Implementation Sequence](#implementation-sequence)

---

## 1. System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAILY AUTOMATED PROCESS                      │
│                        (Runs at 3 AM)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. YouTube API                                                  │
│     └─ Fetch top 10 trending videos                             │
│     └─ Store metadata in trending_topics table                  │
│                                                                  │
│  2. Azure OpenAI / OpenAI API                                    │
│     └─ For each video:                                          │
│        ├─ Generate 20 initial comments (Pass 1)                 │
│        ├─ Generate replies to 8 top comments (Pass 2)           │
│        └─ Generate deeper nested replies (Pass 3)               │
│     └─ Total: ~35 comments per video                            │
│     └─ Store in youtube_base_conversations table                │
│                                                                  │
│  Cost per day: $0.053 (for all users)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    USER REQUEST PROCESS                          │
│                  (When user opens chatroom)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Fetch Base Conversation                                     │
│     └─ SELECT from youtube_base_conversations                   │
│     └─ Get AI-generated comments (already in database)          │
│                                                                  │
│  2. Check Cache                                                 │
│     └─ Do we have personalized version for this user?           │
│     └─ If yes: return cached version                            │
│                                                                  │
│  3. Customize for User (NO AI COST)                             │
│     ├─ Assign user's chatlings to comments                      │
│     ├─ Apply attitude transformations                           │
│     │  - Enthusiastic → add excitement words/emoji              │
│     │  - Skeptical → add questioning phrases                    │
│     │  - Humorous → add jokes/emoji                             │
│     ├─ Calculate glow changes                                   │
│     │  - Positive sentiment → +2 glow                           │
│     │  - Neutral sentiment → +1 glow                            │
│     │  - Negative sentiment → -1 glow                           │
│     │  - Attitude bonus: matching attitude → +50%               │
│     └─ Cache personalized version                               │
│                                                                  │
│  4. Return to Frontend                                          │
│     └─ Display with animations                                  │
│                                                                  │
│  Cost per user: $0.00 (post-processing only)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Azure OpenAI vs Direct OpenAI

### Option A: Azure OpenAI Service (Recommended for Production)

**Pros:**
- ✅ Enterprise SLAs (99.9% uptime)
- ✅ Data stays in your Azure region (data residency)
- ✅ Integrated with Azure Key Vault (secure secrets)
- ✅ Managed identity authentication (no API keys to manage)
- ✅ Azure monitoring and logging built-in
- ✅ Supports virtual networks for security
- ✅ Same pricing as OpenAI direct

**Cons:**
- ❌ Requires Azure subscription
- ❌ More setup steps
- ❌ Limited model availability (not all OpenAI models)
- ❌ Slightly more complex deployment

**Best For:**
- Production deployments
- Enterprise customers
- Data sovereignty requirements
- Teams already using Azure

**Setup Time:** ~30 minutes

---

### Option B: Direct OpenAI API (Simpler for Development)

**Pros:**
- ✅ Fastest setup (5 minutes)
- ✅ Access to all latest OpenAI models immediately
- ✅ Simple API key authentication
- ✅ Great for prototyping
- ✅ Easier to test locally

**Cons:**
- ❌ Data sent to OpenAI servers (outside Azure)
- ❌ Less enterprise features
- ❌ API key management required
- ❌ No built-in Azure monitoring

**Best For:**
- Development and testing
- Quick prototypes
- Startups
- Simple deployments

**Setup Time:** ~5 minutes

---

### Pricing Comparison

Both options have **identical pricing**:

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| GPT-3.5 Turbo | $0.0005 | $0.0015 |
| GPT-4 Turbo | $0.01 | $0.03 |
| GPT-4o | $0.0025 | $0.01 |

**Recommended:** GPT-3.5 Turbo for cost-effectiveness (~$1.60/month)

---

## 3. Setup Instructions

### Option A: Azure OpenAI Setup

#### Step 1: Create Azure OpenAI Resource

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"

# Create resource group (if not exists)
az group create \
  --name rg-chatlings \
  --location eastus

# Create Azure OpenAI resource
az cognitiveservices account create \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --kind OpenAI \
  --sku S0 \
  --location eastus \
  --yes

# Get the endpoint
az cognitiveservices account show \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --query properties.endpoint \
  --output tsv

# Get the API key
az cognitiveservices account keys list \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --query key1 \
  --output tsv
```

#### Step 2: Deploy a Model

```bash
# Deploy GPT-3.5 Turbo
az cognitiveservices account deployment create \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --deployment-name gpt-35-turbo \
  --model-name gpt-35-turbo \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 120 \
  --sku-name "Standard"
```

**Alternative: Use Azure Portal**

1. Go to https://portal.azure.com
2. Search for "Azure OpenAI"
3. Click "Create"
4. Fill in:
   - Resource group: `rg-chatlings`
   - Region: `East US` (has best availability)
   - Name: `openai-chatlings`
   - Pricing tier: `Standard S0`
5. Click "Review + create"
6. After creation, go to resource
7. Click "Model deployments" → "Create"
8. Select "gpt-35-turbo" → Deploy

#### Step 3: Add to Key Vault

```bash
# Get your endpoint and key
ENDPOINT=$(az cognitiveservices account show \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --query properties.endpoint \
  --output tsv)

KEY=$(az cognitiveservices account keys list \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --query key1 \
  --output tsv)

# Add to Key Vault
az keyvault secret set \
  --vault-name kv-chatlingsdevlyg7hq \
  --name AzureOpenAIEndpoint \
  --value "$ENDPOINT"

az keyvault secret set \
  --vault-name kv-chatlingsdevlyg7hq \
  --name AzureOpenAIKey \
  --value "$KEY"
```

#### Step 4: Update App Service Configuration

```bash
# Add app settings
az webapp config appsettings set \
  --name app-chatlings-dev \
  --resource-group rg-chatlings \
  --settings \
    AZURE_OPENAI_ENDPOINT="@Microsoft.KeyVault(SecretUri=https://kv-chatlingsdevlyg7hq.vault.azure.net/secrets/AzureOpenAIEndpoint/)" \
    AZURE_OPENAI_KEY="@Microsoft.KeyVault(SecretUri=https://kv-chatlingsdevlyg7hq.vault.azure.net/secrets/AzureOpenAIKey/)" \
    AZURE_OPENAI_DEPLOYMENT="gpt-35-turbo" \
    AI_PROVIDER="azure"
```

---

### Option B: Direct OpenAI Setup

#### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up / Log in
3. Click "Create new secret key"
4. Name it: "Chatlings Production"
5. Copy the key (starts with `sk-`)

#### Step 2: Add to Key Vault

```bash
# Add to Azure Key Vault
az keyvault secret set \
  --vault-name kv-chatlingsdevlyg7hq \
  --name OpenAIAPIKey \
  --value "sk-your-key-here"
```

#### Step 3: Update App Service Configuration

```bash
# Add app settings
az webapp config appsettings set \
  --name app-chatlings-dev \
  --resource-group rg-chatlings \
  --settings \
    OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://kv-chatlingsdevlyg7hq.vault.azure.net/secrets/OpenAIAPIKey/)" \
    AI_PROVIDER="openai"
```

#### Step 4: Install OpenAI SDK

```bash
cd chatlings
npm install openai@^4.0.0
```

---

## 4. Database Schema

### New Tables Needed

```sql
-- AI-generated base conversations (generated once, shared by all users)
CREATE TABLE youtube_base_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES trending_topics(id),
  youtube_video_id VARCHAR(20) NOT NULL UNIQUE,
  conversation_data JSONB NOT NULL,  -- Full conversation tree
  total_comments INTEGER NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
  generation_cost_usd NUMERIC(10,6),
  generation_duration_ms INTEGER
);

CREATE INDEX idx_youtube_base_conv_topic ON youtube_base_conversations(topic_id);
CREATE INDEX idx_youtube_base_conv_video ON youtube_base_conversations(youtube_video_id);
CREATE INDEX idx_youtube_base_conv_generated ON youtube_base_conversations(generated_at DESC);

-- User-personalized conversations (cached per user)
CREATE TABLE user_youtube_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  base_conversation_id UUID NOT NULL REFERENCES youtube_base_conversations(id),
  topic_id UUID NOT NULL REFERENCES trending_topics(id),
  assigned_chatlings JSONB NOT NULL,  -- Which chatlings got which comments
  customized_content JSONB NOT NULL,  -- User's customized version
  glow_impact JSONB NOT NULL,         -- Glow changes per creature
  total_glow_change INTEGER NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, base_conversation_id)
);

CREATE INDEX idx_user_youtube_conv_user ON user_youtube_conversations(user_id);
CREATE INDEX idx_user_youtube_conv_base ON user_youtube_conversations(base_conversation_id);
CREATE INDEX idx_user_youtube_conv_viewed ON user_youtube_conversations(viewed_at DESC);

-- User chat attitudes (already exists from Feature A, just modify)
-- Already have: user_chat_attitudes table with enthusiasm_level, criticism_level, humor_level
-- No changes needed!

-- Update trending_topics to track if conversation is generated
ALTER TABLE trending_topics
  ADD COLUMN IF NOT EXISTS has_conversation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conversation_generated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_trending_topics_has_conv
  ON trending_topics(has_conversation, is_active)
  WHERE has_conversation = true;
```

### Tables to Remove (from Feature A)

```sql
-- These are no longer needed
DROP TABLE IF EXISTS chatroom_schedules CASCADE;
DROP TABLE IF EXISTS user_attitude_history CASCADE;
DROP TABLE IF EXISTS attitude_presets CASCADE;
```

---

## 5. Service Architecture

### Service Overview

```
services/
├── ai-conversation-generator.js      [NEW] - OpenAI integration
├── conversation-customizer.js        [NEW] - Post-processing
├── youtube-conversation-service.js   [NEW] - Main orchestrator
├── glow-service.js                   [NEW] - Sentiment-based glow
├── youtube-hourly-trending.js        [KEEP] - Fetch trending videos
└── daily-chatling-service.js         [MODIFY] - Add conversation generation
```

### Key Services

**1. AI Conversation Generator**
- Connects to Azure OpenAI or OpenAI API
- Generates conversations in 3 passes:
  - Pass 1: 20 initial comments about video
  - Pass 2: 3 replies to top 8 comments
  - Pass 3: 1-2 deeper nested replies
- Handles rate limiting and retries
- Stores in `youtube_base_conversations`

**2. Conversation Customizer**
- Takes base conversation (generic)
- Assigns user's chatlings to comments
- Applies attitude transformations:
  - Enthusiastic: Adds "Wow!", "Amazing!", emoji
  - Skeptical: Adds "Hmm...", "I'm not sure..."
  - Humorous: Adds jokes, funny emoji
  - Balanced: No modifications
- Calculates glow changes
- Caches in `user_youtube_conversations`

**3. YouTube Conversation Service**
- Orchestrates everything
- Fetches base conversation
- Checks cache
- Customizes if needed
- Returns formatted response

**4. Glow Service**
- Calculates glow based on sentiment
- Updates `user_rewards` table
- Tracks glow history

---

## 6. API Design

### New Endpoints

```javascript
// Get latest conversation for user
GET /api/chatroom/youtube/latest

Response:
{
  "video": {
    "id": "dQw4w9WgXcQ",
    "title": "Amazing Tech Review 2024",
    "channel": "Tech Channel",
    "thumbnail": "https://...",
    "url": "https://youtube.com/watch?v=...",
    "duration": 630
  },
  "conversation": {
    "id": "uuid",
    "totalComments": 35,
    "totalGlowChange": +12,
    "comments": [
      {
        "id": "comment_1",
        "chatling": {
          "id": "uuid",
          "name": "Sparklepuff",
          "image": "sparklepuff.png",
          "rarity": "rare"
        },
        "text": "This is incredible! The future is here!",
        "sentiment": "positive",
        "glowChange": +2,
        "tone": "excited",
        "replies": [
          {
            "id": "reply_1_1",
            "chatling": {...},
            "text": "I totally agree!",
            "sentiment": "positive",
            "glowChange": +1,
            "replies": []
          }
        ]
      }
    ]
  },
  "glowSummary": {
    "creature_uuid_1": +5,
    "creature_uuid_2": +3,
    "creature_uuid_3": +4
  }
}

// List all available videos with conversations
GET /api/chatroom/youtube/videos

Response:
{
  "videos": [
    {
      "id": "video_id",
      "title": "...",
      "channel": "...",
      "thumbnail": "...",
      "commentCount": 35,
      "hasViewed": true,
      "generatedAt": "2025-01-15T03:00:00Z"
    }
  ]
}

// Get conversation for specific video
GET /api/chatroom/youtube/video/:videoId

Response: (same as /latest)

// Update user's chat attitude
PUT /api/user/chat-attitude

Request:
{
  "attitudeType": "enthusiastic|skeptical|humorous|balanced",
  "enthusiasmLevel": 8,
  "criticismLevel": 3,
  "humorLevel": 7
}

Response:
{
  "success": true,
  "attitude": {...}
}

// Get user's chat attitude
GET /api/user/chat-attitude

Response:
{
  "attitudeType": "enthusiastic",
  "enthusiasmLevel": 8,
  "criticismLevel": 3,
  "humorLevel": 7,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

---

## 7. Frontend Design

### Main Chatroom Page (`user/chatroom.html`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Header: "YouTube Chatroom"                     │
│  [Attitude Settings Button] [Video List Button] │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Video Preview Section                          │
│  ┌───────────────────┐                          │
│  │                   │  "Amazing Tech Review"   │
│  │   Video Thumbnail │  by Tech Channel         │
│  │                   │  [Watch on YouTube →]    │
│  └───────────────────┘                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Glow Summary                                   │
│  Total: +12 glow from this conversation         │
│  ────────────────────────────────────────────   │
│  🟢 Sparklepuff: +5   🟢 Fluffball: +3          │
│  🟢 Zappy: +4                                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Conversation Thread                            │
│                                                  │
│  [Typing dots animation...]                     │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 🦊 Sparklepuff         [+2 glow] 😊      │   │
│  │ "This is incredible! The future is here!"│   │
│  │                                           │   │
│  │   ┌─────────────────────────────────┐    │   │
│  │   │ 🐱 Fluffball    [+1 glow] 😊    │    │   │
│  │   │ "I totally agree!"               │    │   │
│  │   └─────────────────────────────────┘    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [Next comment animates in...]                  │
└─────────────────────────────────────────────────┘
```

**Features:**
- Real-time typing animations
- Smooth scroll as comments appear
- Color-coded sentiment (green=positive, gray=neutral, red=negative)
- Glow change badges on each comment
- Nested threading with indentation
- Chatling avatars from Azure Storage
- Pause/resume animation
- Skip to end button

---

## 8. Cost Breakdown

### AI Generation Costs

**Per Video (35 comments):**
- Pass 1 (20 comments): ~500 input + 1500 output = $0.0025
- Pass 2 (12 replies): ~800 input + 800 output = $0.00184
- Pass 3 (3 deeper): ~400 input + 400 output = $0.00092
- **Total per video:** ~$0.0053

**Daily (10 videos):** ~$0.053
**Monthly:** ~$1.59
**Annual:** ~$19.08

### YouTube API Costs

**Free tier:** 10,000 units/day
**Usage:** 10 videos/day = 10 units
**Cost:** $0.00 (well within free tier)

### Database Storage

**Per conversation:** ~50KB JSON
**Monthly:** ~15MB
**Cost:** ~$0.01/month (negligible)

### Total Costs

| Component | Monthly | Annual |
|-----------|---------|--------|
| AI Generation | $1.59 | $19.08 |
| YouTube API | $0.00 | $0.00 |
| Database | $0.01 | $0.12 |
| **TOTAL** | **$1.60** | **$19.20** |

**Key Insight:** Cost does NOT increase with user count!
- 10 users: $1.60/month
- 1,000 users: $1.60/month
- 10,000 users: $1.60/month

Why? Conversations generated once, customized via free post-processing.

---

## 9. Implementation Sequence

### Phase 1: Setup & Infrastructure (You Do This)

**Tasks:**
1. ✅ Choose: Azure OpenAI or Direct OpenAI
2. ✅ Create resource and deploy model
3. ✅ Add secrets to Key Vault
4. ✅ Update App Service settings
5. ✅ Install npm packages

**Time:** 30 minutes

---

### Phase 2: Database Migration (I Build)

**Tasks:**
1. Create migration script (run-migration-56.js)
2. Add new tables
3. Remove old tables
4. Add indexes
5. Test migration

**Deliverable:** `scripts/run-migration-56.js`

---

### Phase 3: AI Services (I Build)

**Tasks:**
1. Build `services/ai-conversation-generator.js`
   - OpenAI/Azure OpenAI integration
   - 3-pass generation
   - Error handling
2. Build `services/conversation-customizer.js`
   - Chatling assignment
   - Attitude transformations
   - Glow calculation
3. Build `services/youtube-conversation-service.js`
   - Orchestration
   - Caching
   - Response formatting

**Deliverables:** 3 service files

---

### Phase 4: Daily Job (I Build)

**Tasks:**
1. Create `jobs/daily-conversation-job.js`
2. Integrate with existing daily service
3. Schedule for 3 AM daily
4. Add logging and monitoring

**Deliverable:** Background job

---

### Phase 5: API Routes (I Build)

**Tasks:**
1. Replace `routes/youtube-chatroom-routes.js`
2. Implement 5 endpoints
3. Add error handling
4. Test with Postman

**Deliverable:** API routes

---

### Phase 6: Frontend (I Build)

**Tasks:**
1. Replace `user/chatroom.html`
2. Build conversation viewer with animations
3. Integrate attitude settings
4. Add glow summary display
5. Video browser page (optional)

**Deliverable:** Complete chatroom UI

---

### Phase 7: Testing & Launch

**Tasks:**
1. End-to-end testing
2. Cost monitoring
3. Performance optimization
4. Deploy to production

---

## Next Steps

**Your Action Items:**
1. Decide: Azure OpenAI or Direct OpenAI?
2. Follow setup instructions above
3. Confirm environment variables are set
4. Let me know when ready

**My Action Items:**
1. Wait for your setup completion
2. Build database migration
3. Build AI services
4. Build API routes
5. Build frontend

**Ready to proceed?** Let me know which option you chose (Azure OpenAI or Direct OpenAI) and I'll start building!
