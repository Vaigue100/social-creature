# Glow Algorithm Design
**Context-Aware Reward System for YouTube Chatroom**

---

## Problem Statement

**Bad Design:**
```
User always sets: Enthusiasm 10, Criticism 1, Humor 10
→ Always gets maximum glow
→ No strategy, no variety, boring
```

**Good Design:**
```
Video: Tech Product Review
Best settings: Criticism 8, Enthusiasm 4, Humor 2
→ Rewards users who match attitude to content
→ Encourages strategic thinking
→ Different videos reward different approaches
```

---

## Core Principles

1. **Context Matters:** Different video types favor different attitudes
2. **No Universal "Best" Setting:** What works for comedy fails for reviews
3. **Reward Strategy:** Users who match their attitude to content get more glow
4. **Skill-Based:** Users can learn patterns and improve
5. **Variety Encouraged:** Extreme settings (all 10s) penalized

---

## Video Category Detection

### YouTube API Categories
```javascript
const VIDEO_CATEGORIES = {
  // Entertainment
  MUSIC: { id: 10, name: 'Music' },
  GAMING: { id: 20, name: 'Gaming' },
  COMEDY: { id: 23, name: 'Comedy' },
  ENTERTAINMENT: { id: 24, name: 'Entertainment' },

  // Educational
  EDUCATION: { id: 27, name: 'Education' },
  SCIENCE_TECH: { id: 28, name: 'Science & Technology' },
  HOWTO_STYLE: { id: 26, name: 'Howto & Style' },

  // Opinion/Discussion
  NEWS_POLITICS: { id: 25, name: 'News & Politics' },
  PEOPLE_BLOGS: { id: 22, name: 'People & Blogs' },

  // Lifestyle
  SPORTS: { id: 17, name: 'Sports' },
  TRAVEL_EVENTS: { id: 19, name: 'Travel & Events' },
  PETS_ANIMALS: { id: 15, name: 'Pets & Animals' }
};
```

### Enhanced Detection
```javascript
/**
 * Detect video category with additional context
 */
async function analyzeVideoContext(video) {
  const category = VIDEO_CATEGORIES[video.snippet.categoryId];

  // Additional signals from title/description
  const title = video.snippet.title.toLowerCase();
  const description = video.snippet.description.toLowerCase();

  // Subcategories based on keywords
  const subcategory = detectSubcategory(title, description);

  return {
    mainCategory: category,
    subcategory: subcategory,
    keywords: extractKeywords(title, description),
    sentiment: analyzeTitleSentiment(title)
  };
}

function detectSubcategory(title, description) {
  const text = `${title} ${description}`;

  // Review detection
  if (/(review|unboxing|comparison|vs|tested)/i.test(text)) {
    return 'REVIEW';
  }

  // Tutorial detection
  if (/(tutorial|how to|guide|learn|tips)/i.test(text)) {
    return 'TUTORIAL';
  }

  // Drama/controversy detection
  if (/(drama|exposed|shocking|controversy|scandal)/i.test(text)) {
    return 'DRAMA';
  }

  // Inspirational detection
  if (/(inspiring|motivational|success|journey|story)/i.test(text)) {
    return 'INSPIRATIONAL';
  }

  return 'GENERAL';
}
```

---

## Optimal Attitude Profiles

### Category-Specific Ideal Ranges

```javascript
const OPTIMAL_ATTITUDES = {
  // Entertainment categories favor positivity
  MUSIC: {
    enthusiasm: { min: 7, max: 10, weight: 0.4 },
    criticism: { min: 1, max: 4, weight: 0.2 },
    humor: { min: 5, max: 10, weight: 0.4 }
  },

  COMEDY: {
    enthusiasm: { min: 6, max: 10, weight: 0.3 },
    criticism: { min: 1, max: 5, weight: 0.2 },
    humor: { min: 8, max: 10, weight: 0.5 }
  },

  GAMING: {
    enthusiasm: { min: 6, max: 10, weight: 0.35 },
    criticism: { min: 2, max: 6, weight: 0.25 },
    humor: { min: 5, max: 9, weight: 0.4 }
  },

  // Review content favors critical thinking
  REVIEW: {
    enthusiasm: { min: 3, max: 7, weight: 0.2 },
    criticism: { min: 6, max: 10, weight: 0.5 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  // Educational content favors balanced approach
  EDUCATION: {
    enthusiasm: { min: 5, max: 8, weight: 0.3 },
    criticism: { min: 4, max: 7, weight: 0.4 },
    humor: { min: 3, max: 6, weight: 0.3 }
  },

  SCIENCE_TECH: {
    enthusiasm: { min: 5, max: 8, weight: 0.3 },
    criticism: { min: 5, max: 9, weight: 0.4 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  // Drama/controversy favors strong opinions
  DRAMA: {
    enthusiasm: { min: 2, max: 6, weight: 0.25 },
    criticism: { min: 7, max: 10, weight: 0.45 },
    humor: { min: 4, max: 8, weight: 0.3 }
  },

  // Inspirational content favors positivity
  INSPIRATIONAL: {
    enthusiasm: { min: 8, max: 10, weight: 0.5 },
    criticism: { min: 1, max: 3, weight: 0.2 },
    humor: { min: 3, max: 7, weight: 0.3 }
  },

  // Tutorial content favors balanced constructive approach
  TUTORIAL: {
    enthusiasm: { min: 5, max: 8, weight: 0.3 },
    criticism: { min: 5, max: 8, weight: 0.4 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  // Sports favors passion and debate
  SPORTS: {
    enthusiasm: { min: 7, max: 10, weight: 0.4 },
    criticism: { min: 5, max: 9, weight: 0.35 },
    humor: { min: 4, max: 8, weight: 0.25 }
  },

  // Default for uncategorized
  GENERAL: {
    enthusiasm: { min: 5, max: 8, weight: 0.33 },
    criticism: { min: 4, max: 7, weight: 0.33 },
    humor: { min: 4, max: 7, weight: 0.34 }
  }
};
```

---

## Glow Calculation Algorithm

### Formula Components

```javascript
class GlowCalculator {

  /**
   * Calculate glow for a chatling's participation
   *
   * @param {Object} userSettings - { enthusiasm, criticism, humor } (1-10)
   * @param {Object} videoContext - { category, subcategory, sentiment }
   * @returns {number} Glow change (-5 to +10)
   */
  calculateGlow(userSettings, videoContext) {
    // 1. Base participation reward
    const baseGlow = 2;

    // 2. Context matching bonus
    const matchBonus = this.calculateMatchBonus(userSettings, videoContext);

    // 3. Extremism penalty (discourage all 10s or all 1s)
    const extremismPenalty = this.calculateExtremismPenalty(userSettings);

    // 4. Variety bonus (reward using different settings over time)
    const varietyBonus = this.calculateVarietyBonus(userSettings);

    const totalGlow = baseGlow + matchBonus - extremismPenalty + varietyBonus;

    // Clamp to range
    return Math.max(-5, Math.min(10, Math.round(totalGlow)));
  }

  /**
   * Calculate bonus for matching attitude to video context
   */
  calculateMatchBonus(userSettings, videoContext) {
    const optimal = this.getOptimalProfile(videoContext);

    let totalScore = 0;
    let maxPossibleScore = 0;

    // Score each attitude dimension
    ['enthusiasm', 'criticism', 'humor'].forEach(dimension => {
      const userValue = userSettings[dimension];
      const optimalRange = optimal[dimension];
      const weight = optimalRange.weight;

      // Calculate how well user's setting matches optimal range
      const dimensionScore = this.scoreMatchToRange(
        userValue,
        optimalRange.min,
        optimalRange.max
      );

      totalScore += dimensionScore * weight;
      maxPossibleScore += 10 * weight; // Max score is 10 per dimension
    });

    // Normalize to 0-6 range (6 is max match bonus)
    const normalizedScore = (totalScore / maxPossibleScore) * 6;

    return normalizedScore;
  }

  /**
   * Score how well a value fits within optimal range
   * Perfect match (within range) = 10
   * Far outside range = 0
   */
  scoreMatchToRange(value, min, max) {
    // Perfect match: within optimal range
    if (value >= min && value <= max) {
      return 10;
    }

    // Calculate distance from range
    let distance;
    if (value < min) {
      distance = min - value;
    } else {
      distance = value - max;
    }

    // Exponential decay: further away = worse
    // Distance 1 = score 7
    // Distance 2 = score 5
    // Distance 3 = score 3
    // Distance 4 = score 2
    // Distance 5+ = score 0
    const score = Math.max(0, 10 - (distance * distance * 0.4));

    return score;
  }

  /**
   * Penalty for extreme settings (all high or all low)
   */
  calculateExtremismPenalty(userSettings) {
    const values = [
      userSettings.enthusiasm,
      userSettings.criticism,
      userSettings.humor
    ];

    const average = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => {
      return sum + Math.pow(val - average, 2);
    }, 0) / values.length;

    // Low variance = all settings similar = penalty
    // Variance < 2 means settings are too similar (e.g., all 10s or all 5s)
    if (variance < 2) {
      return 2; // -2 glow penalty
    }

    // Check for all extremes (all >= 8 or all <= 3)
    const allHigh = values.every(v => v >= 8);
    const allLow = values.every(v => v <= 3);

    if (allHigh || allLow) {
      return 3; // -3 glow penalty for obvious min-maxing
    }

    return 0;
  }

  /**
   * Bonus for using variety over time (track user's history)
   */
  calculateVarietyBonus(userSettings, userHistory = []) {
    if (userHistory.length < 3) {
      return 0; // Need history to calculate
    }

    // Get last 5 chatroom participations
    const recentSettings = userHistory.slice(-5);

    // Count unique setting combinations
    const uniqueCombinations = new Set(
      recentSettings.map(s => `${s.enthusiasm}-${s.criticism}-${s.humor}`)
    ).size;

    // Reward variety: if user changed settings frequently
    if (uniqueCombinations >= 4) {
      return 1; // +1 glow for variety
    }

    // Penalty for always using same settings
    if (uniqueCombinations === 1) {
      return -1; // -1 glow for repetition
    }

    return 0;
  }

  /**
   * Get optimal profile for video context
   */
  getOptimalProfile(videoContext) {
    // Primary: Use subcategory if detected
    if (videoContext.subcategory && OPTIMAL_ATTITUDES[videoContext.subcategory]) {
      return OPTIMAL_ATTITUDES[videoContext.subcategory];
    }

    // Secondary: Use main category
    if (OPTIMAL_ATTITUDES[videoContext.mainCategory?.name]) {
      return OPTIMAL_ATTITUDES[videoContext.mainCategory.name];
    }

    // Fallback: General
    return OPTIMAL_ATTITUDES.GENERAL;
  }
}
```

---

## Example Scenarios

### Scenario 1: Music Video
```javascript
Video: "Taylor Swift - New Single (Official Music Video)"
Category: MUSIC
Optimal: Enthusiasm 7-10, Criticism 1-4, Humor 5-10

User A: { enthusiasm: 10, criticism: 1, humor: 10 }
- Base: +2
- Match bonus: +5.8 (excellent match!)
- Extremism penalty: -3 (all maxed out)
- Variety bonus: 0
- Total: +4.8 glow

User B: { enthusiasm: 8, criticism: 3, humor: 7 }
- Base: +2
- Match bonus: +6.0 (perfect balance!)
- Extremism penalty: 0 (good variance)
- Variety bonus: +1 (changes settings frequently)
- Total: +9.0 glow ✅ WINNER

User C: { enthusiasm: 10, criticism: 10, humor: 10 }
- Base: +2
- Match bonus: +2.5 (criticism too high for music)
- Extremism penalty: -3 (all 10s)
- Variety bonus: -1 (always uses same)
- Total: +0.5 glow
```

### Scenario 2: Tech Review
```javascript
Video: "iPhone 15 Pro Review - Is It Worth It?"
Category: SCIENCE_TECH
Subcategory: REVIEW
Optimal: Enthusiasm 3-7, Criticism 6-10, Humor 2-5

User A: { enthusiasm: 10, criticism: 1, humor: 10 }
- Base: +2
- Match bonus: +0.5 (terrible match for review)
- Extremism penalty: -3
- Variety bonus: -1
- Total: -1.5 glow ❌

User B: { enthusiasm: 5, criticism: 8, humor: 3 }
- Base: +2
- Match bonus: +6.0 (excellent for review!)
- Extremism penalty: 0
- Variety bonus: +1
- Total: +9.0 glow ✅ WINNER

User C: { enthusiasm: 7, criticism: 7, humor: 4 }
- Base: +2
- Match bonus: +5.5 (good but not optimal)
- Extremism penalty: 0
- Variety bonus: 0
- Total: +7.5 glow
```

### Scenario 3: Comedy Sketch
```javascript
Video: "SNL - Funniest Moments 2024"
Category: COMEDY
Optimal: Enthusiasm 6-10, Criticism 1-5, Humor 8-10

User A: { enthusiasm: 8, criticism: 2, humor: 10 }
- Base: +2
- Match bonus: +6.0 (perfect!)
- Extremism penalty: -1 (slightly extreme)
- Variety bonus: +1
- Total: +8.0 glow ✅

User B: { enthusiasm: 5, criticism: 8, humor: 3 }
- Base: +2
- Match bonus: +1.2 (bad for comedy)
- Extremism penalty: 0
- Variety bonus: 0
- Total: +3.2 glow
```

---

## Hourly Trending System

### Why Hourly > Daily

**Problem with Daily:**
- Music videos dominate (most views over 24 hours)
- Less variety
- Same category repeatedly

**Solution: Hourly Trending**
```javascript
/**
 * Get trending videos from a specific hour
 * More variety than daily trending
 */
async function getHourlyTrendingVideo() {
  const youtube = google.youtube('v3');

  // Get trending videos from this hour
  const response = await youtube.videos.list({
    key: process.env.YOUTUBE_API_KEY,
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode: 'US', // or user's region
    maxResults: 50,
    videoCategoryId: null // All categories
  });

  // Filter by upload time (recent videos trend in specific hours)
  const recentVideos = response.data.items.filter(video => {
    const uploadTime = new Date(video.snippet.publishedAt);
    const hoursSinceUpload = (Date.now() - uploadTime) / (1000 * 60 * 60);
    return hoursSinceUpload <= 24; // Videos from last 24 hours
  });

  // Randomly select from top 10 to add variety
  const topVideos = recentVideos.slice(0, 10);
  const selectedVideo = topVideos[Math.floor(Math.random() * topVideos.length)];

  return selectedVideo;
}
```

---

## Chatroom Scheduling System

### Random Daily Schedule

```javascript
/**
 * Schedule chatroom opening times
 * Randomized each day, advance notice given to users
 */
class ChatroomScheduler {

  /**
   * Generate today's chatroom schedule
   * Run this at midnight each day
   */
  async generateDailySchedule() {
    const schedules = [];

    // Generate 3 chatrooms per day at random times
    const numChatrooms = 3;

    for (let i = 0; i < numChatrooms; i++) {
      const openTime = this.randomTimeSlot(10, 22); // Between 10 AM - 10 PM

      schedules.push({
        id: `chatroom_${Date.now()}_${i}`,
        openTime: openTime,
        notificationTime: this.subtractHours(openTime, 2), // 2 hours before
        reminderTime: this.subtractMinutes(openTime, 15), // 15 min before
        closeTime: this.addHours(openTime, 1), // Open for 1 hour
        status: 'scheduled'
      });
    }

    // Sort by time
    schedules.sort((a, b) => a.openTime - b.openTime);

    // Store in database
    await this.storeDailySchedule(schedules);

    // Schedule notifications
    await this.scheduleNotifications(schedules);

    return schedules;
  }

  /**
   * Get random time slot within business hours
   */
  randomTimeSlot(startHour, endHour) {
    const today = new Date();
    today.setHours(startHour, 0, 0, 0);

    const hourRange = endHour - startHour;
    const randomHour = Math.floor(Math.random() * hourRange);
    const randomMinute = Math.random() < 0.5 ? 0 : 30; // On the hour or half past

    today.setHours(startHour + randomHour, randomMinute, 0, 0);
    return today;
  }

  /**
   * Send advance notice to users
   */
  async sendAdvanceNotice(chatroom) {
    const video = await this.getScheduledVideo(chatroom);
    const context = await analyzeVideoContext(video);

    // Suggest optimal settings based on video type
    const suggestions = this.generateSettingSuggestions(context);

    const message = {
      title: "Chatroom Opening Soon!",
      body: `New chatroom in 2 hours: "${video.snippet.title}"`,
      data: {
        chatroomId: chatroom.id,
        videoId: video.id,
        videoTitle: video.snippet.title,
        category: context.mainCategory.name,
        subcategory: context.subcategory,
        openTime: chatroom.openTime.toISOString(),
        suggestions: suggestions
      }
    };

    // Send push notifications to active users
    await this.sendPushNotifications(message);
  }

  /**
   * Generate setting suggestions (hints, not exact answers)
   */
  generateSettingSuggestions(context) {
    const optimal = OPTIMAL_ATTITUDES[context.subcategory] ||
                     OPTIMAL_ATTITUDES[context.mainCategory?.name] ||
                     OPTIMAL_ATTITUDES.GENERAL;

    // Give ranges, not exact values
    return {
      enthusiasm: `${optimal.enthusiasm.min}-${optimal.enthusiasm.max}`,
      criticism: `${optimal.criticism.min}-${optimal.criticism.max}`,
      humor: `${optimal.humor.min}-${optimal.humor.max}`,
      hint: this.getHint(context)
    };
  }

  /**
   * Get contextual hint for users
   */
  getHint(context) {
    const hints = {
      REVIEW: "Critical analysis works well here",
      COMEDY: "Humor and enthusiasm shine in comedy",
      MUSIC: "Let your enthusiasm flow!",
      EDUCATION: "Balanced, thoughtful approach recommended",
      DRAMA: "Strong opinions and criticism valued",
      INSPIRATIONAL: "Positivity and enthusiasm excel",
      TUTORIAL: "Constructive criticism is appreciated",
      SPORTS: "Passion and debate encouraged"
    };

    return hints[context.subcategory] || hints[context.mainCategory?.name] ||
           "Adapt your approach to the content";
  }
}
```

---

## User Interface

### Chatroom Schedule Display
```html
<!-- Daily Schedule View -->
<div class="chatroom-schedule">
  <h2>Today's Chatroom Schedule</h2>

  <div class="schedule-item upcoming">
    <div class="time-badge">
      <span class="countdown">Opens in 2h 15m</span>
      <span class="time">3:00 PM</span>
    </div>

    <div class="video-preview">
      <img src="thumbnail.jpg" alt="Video thumbnail">
      <div class="video-info">
        <h3>iPhone 15 Pro Review - Worth the Upgrade?</h3>
        <span class="category badge">Tech Review</span>
      </div>
    </div>

    <div class="suggestions">
      <h4>Recommended Settings</h4>
      <div class="suggestion-grid">
        <div class="suggestion">
          <label>Enthusiasm</label>
          <span class="range">3-7</span>
        </div>
        <div class="suggestion">
          <label>Criticism</label>
          <span class="range">6-10</span>
        </div>
        <div class="suggestion">
          <label>Humor</label>
          <span class="range">2-5</span>
        </div>
      </div>
      <p class="hint">💡 Critical analysis works well here</p>
    </div>

    <button class="btn-primary">Set Reminder</button>
  </div>

  <!-- More schedule items -->
</div>
```

### Attitude Settings Interface
```html
<!-- Creature Attitude Settings -->
<div class="attitude-settings">
  <h3>Set Your Chatling's Attitude</h3>

  <div class="slider-group">
    <label>
      Enthusiasm
      <span class="value">8</span>
    </label>
    <input type="range" min="1" max="10" value="8"
           class="slider enthusiasm-slider">
    <div class="slider-labels">
      <span>Reserved</span>
      <span>Energetic</span>
    </div>
  </div>

  <div class="slider-group">
    <label>
      Criticism
      <span class="value">3</span>
    </label>
    <input type="range" min="1" max="10" value="3"
           class="slider criticism-slider">
    <div class="slider-labels">
      <span>Accepting</span>
      <span>Critical</span>
    </div>
  </div>

  <div class="slider-group">
    <label>
      Humor
      <span class="value">7</span>
    </label>
    <input type="range" min="1" max="10" value="7"
           class="slider humor-slider">
    <div class="slider-labels">
      <span>Serious</span>
      <span>Playful</span>
    </div>
  </div>

  <div class="estimated-glow">
    <p>Estimated Glow: <span class="glow-preview">+7</span></p>
    <small>Based on video type and your settings</small>
  </div>

  <button class="btn-save">Save Settings</button>
</div>
```

---

## Database Schema Updates

```sql
-- Store chatroom schedules
CREATE TABLE chatroom_schedules (
  id SERIAL PRIMARY KEY,
  schedule_date DATE NOT NULL,
  open_time TIMESTAMP NOT NULL,
  close_time TIMESTAMP NOT NULL,
  notification_time TIMESTAMP NOT NULL,
  reminder_time TIMESTAMP NOT NULL,
  video_id VARCHAR(50),
  video_title TEXT,
  video_category VARCHAR(50),
  video_subcategory VARCHAR(50),
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, open, closed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedule_date ON chatroom_schedules(schedule_date, open_time);
CREATE INDEX idx_schedule_status ON chatroom_schedules(status, open_time);

-- Store user's attitude settings history
CREATE TABLE user_attitude_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  chatroom_id INTEGER REFERENCES chatroom_schedules(id),
  enthusiasm INTEGER CHECK (enthusiasm BETWEEN 1 AND 10),
  criticism INTEGER CHECK (criticism BETWEEN 1 AND 10),
  humor INTEGER CHECK (humor BETWEEN 1 AND 10),
  glow_earned INTEGER,
  match_score DECIMAL(4,2), -- How well settings matched video
  participated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_attitude_history ON user_attitude_history(user_id, participated_at);
```

---

## Summary

### Key Features

1. **Context-Aware Glow:**
   - Different video types reward different attitudes
   - No universal "best" setting
   - Rewards strategic thinking

2. **Anti-Gaming Mechanics:**
   - Extremism penalty (-3 glow for all 10s)
   - Variety bonus (+1 for changing strategies)
   - Match bonus depends on video type (0-6 glow)

3. **Hourly Trending:**
   - More variety than daily
   - Different categories throughout the day
   - 3 chatrooms per day

4. **Anticipation System:**
   - Random open times (10 AM - 10 PM)
   - 2-hour advance notice
   - Setting suggestions provided
   - Users can strategize

5. **Glow Range:**
   - Minimum: -5 (terrible match, extremism, repetition)
   - Maximum: +10 (perfect match, variety, participation)
   - Average: +4 to +7 for good play

### Example Daily Experience

```
Morning (9:00 AM):
- User receives notification: "Chatroom opens at 11:00 AM"
- Video: "Taylor Swift - New Music Video"
- Category: MUSIC
- Suggestions: Enthusiasm 7-10, Criticism 1-4, Humor 5-10
- User sets: Enthusiasm 9, Criticism 2, Humor 8
- Participates at 11:00 AM
- Earns: +8 glow (excellent match!)

Afternoon (2:30 PM):
- Notification: "Chatroom opens at 4:30 PM"
- Video: "iPhone 15 Review - Full Analysis"
- Category: TECH REVIEW
- Suggestions: Enthusiasm 3-7, Criticism 6-10, Humor 2-5
- User sets: Enthusiasm 5, Criticism 8, Humor 3
- Participates at 4:30 PM
- Earns: +9 glow (strategic adaptation!)

Evening (7:00 PM):
- Notification: "Chatroom opens at 9:00 PM"
- Video: "NBA Highlights - Game 7 Thriller"
- Category: SPORTS
- Suggestions: Enthusiasm 7-10, Criticism 5-9, Humor 4-8
- User sets: Enthusiasm 9, Criticism 7, Humor 6
- Participates at 9:00 PM
- Earns: +7 glow (good match, +1 variety bonus)

Total Daily Glow: +24
```

This system rewards:
- ✅ Strategic thinking
- ✅ Adapting to content
- ✅ Trying different approaches
- ✅ Engaging with variety

And penalizes:
- ❌ Always using same settings
- ❌ Maxing everything to 10
- ❌ Ignoring video context
- ❌ Repetitive behavior
