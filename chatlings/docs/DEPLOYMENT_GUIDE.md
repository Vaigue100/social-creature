# AI Conversation System - Deployment Guide

## 🎉 What's Been Built

Feature B (AI Conversation Viewing System) has completely replaced Feature A (Participation System).

### New Components Created:

#### Backend Services (3 files)
1. **`services/ai-conversation-generator.js`**
   - Generates AI conversations using OpenAI GPT-3.5 Turbo
   - Three-pass generation: initial comments → replies → nested replies
   - Tracks costs and generation time
   - Creates realistic comment threads with sentiment labels

2. **`services/conversation-customizer.js`**
   - Assigns user's chatlings to comments
   - Applies attitude transformations (Enthusiastic/Skeptical/Humorous/Balanced)
   - Calculates glow based on comment sentiment
   - 100% post-processing (no AI costs)

3. **`services/youtube-conversation-service.js`**
   - Main orchestrator for the entire system
   - Coordinates generation, storage, retrieval, and customization
   - Manages database operations
   - Handles caching of personalized conversations

#### API Routes (1 file)
4. **`routes/youtube-chatroom-routes.js`** (completely replaced)
   - `GET /api/chatroom/youtube/latest` - Get latest conversation
   - `GET /api/chatroom/youtube/videos` - List all conversations
   - `GET /api/chatroom/youtube/video/:videoId` - Get specific video
   - `GET /api/chatroom/youtube/history` - User's viewing history
   - `GET /api/user/chat-attitude` - Get attitude settings
   - `PUT /api/user/chat-attitude` - Update attitude settings
   - `GET /api/chatroom/youtube/stats` - Generation statistics
   - `GET /api/chatroom/youtube/validate` - Validate AI setup

#### Background Jobs (1 file)
5. **`jobs/daily-conversation-job.js`**
   - Runs daily at 3 AM to generate conversations
   - Fetches 10 trending videos
   - Generates AI conversations for each
   - Tracks costs and statistics
   - Can be run manually with `--now` flag

#### Frontend (1 file)
6. **`user/chatroom.html`** (completely replaced)
   - Beautiful AI conversation viewer
   - Animated comment appearance with typing indicators
   - Video thumbnail with title overlay
   - Glow summary with sentiment breakdown
   - Attitude settings modal
   - Nested comment threads
   - Responsive design for mobile

#### Database Migration (1 file)
7. **`scripts/run-migration-56.js`**
   - Removes Feature A tables (chatroom_schedules, user_attitude_history, attitude_presets)
   - Creates Feature B tables (youtube_base_conversations, user_youtube_conversations)
   - Updates trending_topics table
   - Preserves user_chat_attitudes table

#### Configuration Updates (1 file)
8. **`package.json`**
   - Added `openai@^4.0.0` dependency
   - Added `node-schedule@^2.1.1` dependency

---

## 📋 Pre-Deployment Checklist

### ✅ Already Complete (from previous session):
- [x] OpenAI API key added to Azure Key Vault
- [x] AI_PROVIDER environment variable set to "openai"
- [x] App Service configured to use Key Vault secrets

### ⚠️ To Do Before Deployment:

1. **Verify Environment Variables**
   ```bash
   az webapp config appsettings list --name app-chatlings-dev --resource-group <your-rg>
   ```

   Should include:
   - `OPENAI_API_KEY` (pointing to Key Vault)
   - `AI_PROVIDER=openai`

2. **Ensure Trending Videos Exist**

   The system needs videos in the `trending_topics` table. Check:
   ```sql
   SELECT COUNT(*) FROM trending_topics WHERE is_active = true;
   ```

   If zero, your existing YouTube background service should populate these.

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
cd chatlings
node scripts/run-migration-56.js
```

**Expected output:**
```
✅ Connected to database

🗑️  REMOVING FEATURE A TABLES...
Dropping chatroom_schedules table...
Dropping user_attitude_history table...
Dropping attitude_presets table...
✅ Feature A tables removed

🏗️  CREATING FEATURE B TABLES...
Creating youtube_base_conversations table...
Adding indexes to youtube_base_conversations...
Creating user_youtube_conversations table...
Adding indexes to user_youtube_conversations...
✅ Feature B tables created

🔧 UPDATING EXISTING TABLES...
Adding columns to trending_topics...
Verifying user_chat_attitudes table...
✅ Existing tables updated

═══════════════════════════════════════════════════════
✅ MIGRATION 56 COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════
```

**If migration fails:**
- Check database connection settings in `.env`
- Verify DB_SSL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are correct
- Check if you're connected to the right database (local vs Azure)

---

### Step 2: Validate AI Setup (Optional but Recommended)

Test that OpenAI API is working:

```bash
node -e "
const service = require('./services/youtube-conversation-service');
const svc = new service();
svc.validateAISetup().then(result => {
  console.log('Validation result:', result);
  process.exit(result.success ? 0 : 1);
});
"
```

**Expected output:**
```javascript
Validation result: {
  success: true,
  message: 'OpenAI API connection successful',
  model: 'gpt-3.5-turbo',
  response: 'AI setup successful!'
}
```

---

### Step 3: Generate First Conversation (Test)

Before deploying, test the generation locally:

```bash
node jobs/daily-conversation-job.js --now
```

**What happens:**
1. Fetches 10 trending videos from database
2. Generates AI conversation for each (takes 5-10 minutes total)
3. Stores in `youtube_base_conversations` table
4. Outputs cost and statistics

**Expected output:**
```
═══════════════════════════════════════════════════════
🤖 DAILY AI CONVERSATION GENERATION JOB
═══════════════════════════════════════════════════════

📹 Fetching trending videos...
✓ Found 10 videos for processing

[1/10] Processing: iPhone 15 Pro Review

🤖 Generating AI conversation for: iPhone 15 Pro Review
   Video ID: dQw4w9WgXcQ
   Category: Science & Technology

📝 Pass 1: Generating initial comments...
   ✓ Generated 20 initial comments

💬 Pass 2: Generating replies...
   ✓ Generated replies for 8 comments

🔄 Pass 3: Generating nested replies...
   ✓ Generated nested replies

✅ Conversation generation complete!
   Total comments: 35
   Total tokens: 2,847 (1,234 in, 1,613 out)
   Cost: $0.0053
   Duration: 8.42s

   ✅ Stored conversation (ID: abc-123-def)

[2/10] Processing: Taylor Swift - New Song
...

═══════════════════════════════════════════════════════
✅ DAILY JOB COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════
Completed at: 2025-12-28T03:00:00.000Z

Results:
  Videos processed: 10
  Successful: 10
  Failed: 0
  Total comments generated: 350
  Total cost: $0.0530
  Average cost per video: $0.0053
```

**If this works, you're ready to deploy!**

---

### Step 4: Commit and Push to Git

```bash
git status

# Review changes
git diff

# Stage all changes
git add -A

# Commit
git commit -m "Replace participation system with AI conversation viewing

- Add OpenAI integration for AI-generated conversations
- Create conversation customization with attitude transformations
- Implement sentiment-based glow rewards
- Replace chatroom participation UI with conversation viewer
- Add daily job for automated conversation generation
- Update database schema (migration 56)

Cost: ~$1.60/month for unlimited users"

# Push to remote
git push origin master
```

---

### Step 5: Deploy to Azure App Service

Azure App Service will automatically:
1. Detect the push
2. Run `npm install` (installs openai and node-schedule packages)
3. Restart the application

**Monitor deployment:**
```bash
# Watch deployment logs
az webapp log tail --name app-chatlings-dev --resource-group <your-rg>
```

---

### Step 6: Set Up Daily Job Scheduler

You have two options:

#### Option A: Use Azure App Service WebJobs (Recommended)

1. Create a script to run the job:
   ```bash
   # Create run-daily-job.sh
   echo "#!/bin/bash
   cd /home/site/wwwroot
   node jobs/daily-conversation-job.js --now" > run-daily-job.sh
   ```

2. Upload as a scheduled WebJob:
   ```bash
   az webapp deployment source config-zip \
     --name app-chatlings-dev \
     --resource-group <your-rg> \
     --src run-daily-job.zip
   ```

3. Schedule: `0 0 3 * * *` (3 AM daily)

#### Option B: Use Azure Functions (Alternative)

Create an Azure Function with timer trigger:
- Schedule: `0 0 3 * * *`
- Code: Call the daily job endpoint

#### Option C: Manual Trigger (For Testing)

Run manually via SSH:
```bash
az webapp ssh --name app-chatlings-dev --resource-group <your-rg>

cd /home/site/wwwroot
node jobs/daily-conversation-job.js --now
```

---

### Step 7: Test the Frontend

1. **Open the app**: `https://app-chatlings-dev.azurewebsites.net/user/chatroom.html`

2. **What you should see:**
   - Loading spinner briefly
   - Video thumbnail with title overlay
   - Glow summary showing total earned
   - Comments appearing with typing animations
   - Chatling names assigned to each comment
   - Sentiment badges (positive/neutral/negative)
   - Nested replies

3. **Test attitude settings:**
   - Click "⚙️ Attitude Settings"
   - Adjust sliders
   - Click "Save & Reload"
   - Comments should reload with transformations applied

4. **Verify glow was awarded:**
   - Check user_rewards table for glow increase
   - Check user_youtube_conversations table for record

---

## 🔍 Verification Queries

### Check if conversations were generated:
```sql
SELECT
  COUNT(*) as total_conversations,
  SUM(total_comments) as total_comments,
  SUM(generation_cost_usd) as total_cost,
  MAX(generated_at) as last_generated
FROM youtube_base_conversations;
```

### Check user conversation views:
```sql
SELECT
  u.email,
  COUNT(uyc.id) as views,
  SUM(uyc.total_glow_change) as total_glow
FROM user_youtube_conversations uyc
JOIN users u ON uyc.user_id = u.id
GROUP BY u.email;
```

### Check generation costs:
```sql
SELECT
  DATE(generated_at) as date,
  COUNT(*) as conversations,
  SUM(generation_cost_usd) as daily_cost
FROM youtube_base_conversations
GROUP BY DATE(generated_at)
ORDER BY date DESC;
```

---

## 📊 Expected Costs

### AI Generation Costs:
- **Per video:** ~$0.0053
- **10 videos/day:** ~$0.053/day
- **Monthly:** ~$1.60/month

### User Viewing Costs:
- **$0.00** (post-processing only, no AI calls)

### Total Monthly Cost:
- **~$1.60** regardless of user count

---

## 🐛 Troubleshooting

### Problem: "No conversations available yet"

**Cause:** No conversations have been generated

**Solution:**
```bash
# Run job manually
node jobs/daily-conversation-job.js --now
```

---

### Problem: OpenAI API errors

**Cause:** Invalid API key or configuration

**Solution:**
```bash
# Verify API key
az keyvault secret show \
  --vault-name kv-chatlingsdevlyg7hq \
  --name OpenAIAPIKey

# Test directly
node -e "
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{role: 'user', content: 'test'}]
}).then(r => console.log('✅ Works!', r.choices[0].message.content));
"
```

---

### Problem: No chatlings assigned to comments

**Cause:** User has no active team members

**Solution:**
- User needs to have chatlings in their team (team_positions table)
- Check: `SELECT * FROM team_positions WHERE user_id = '<user-id>' AND is_active = true`

---

### Problem: Database connection fails

**Cause:** Environment variables not set correctly

**Solution:**
```bash
# Check all DB variables
az webapp config appsettings list \
  --name app-chatlings-dev \
  --resource-group <your-rg> \
  --query "[?starts_with(name, 'DB_')]"
```

---

## 📈 Monitoring

### Daily Health Checks:

1. **Check generation stats:**
   ```bash
   curl https://app-chatlings-dev.azurewebsites.net/api/chatroom/youtube/stats
   ```

2. **Monitor costs:**
   - Login to OpenAI dashboard: https://platform.openai.com/usage
   - Expected: ~$1.60/month

3. **Check error logs:**
   ```bash
   az webapp log tail --name app-chatlings-dev --resource-group <your-rg>
   ```

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Migration 56 runs without errors
- ✅ AI validation returns success
- ✅ Daily job generates 10 conversations
- ✅ Users can view conversations at `/user/chatroom.html`
- ✅ Comments appear with typing animations
- ✅ Glow is awarded based on sentiment
- ✅ Attitude settings work and transform comments
- ✅ Cost is ~$0.053 per day

---

## 🚀 Next Steps After Deployment

1. **Run first generation:**
   ```bash
   node jobs/daily-conversation-job.js --now
   ```

2. **Set up daily schedule:**
   - Configure Azure WebJob or Function for 3 AM daily

3. **Monitor for one week:**
   - Check costs daily
   - Verify conversations are generated
   - Ensure users are viewing and earning glow

4. **Optimize if needed:**
   - Adjust number of videos per day (currently 10)
   - Fine-tune sentiment analysis
   - Add more attitude transformation rules

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs
3. Verify all environment variables are set
4. Test AI validation endpoint
5. Run migration again if database state is unclear

The system is now ready for deployment! 🎉
