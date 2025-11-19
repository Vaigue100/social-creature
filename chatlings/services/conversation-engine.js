const db = require('./db');

/**
 * Procedural Conversation Engine
 * Generates emergent conversations from pre-approved chat lines and flow rules
 */

const ConversationEngine = {
  /**
   * Check if user should get a new chat line
   * Called by client polling
   */
  async getNextLine(userId) {
    // Check if user has an active conversation
    const active = await db.query(
      'SELECT * FROM active_conversations WHERE user_id = $1',
      [userId]
    );

    if (active.rows.length > 0) {
      // Continue existing conversation
      return await this.continueConversation(active.rows[0]);
    }

    // Check if new conversation should start (based on likelihood)
    const shouldStart = await this.checkStartLikelihood(userId);
    if (shouldStart) {
      return await this.startConversation(userId);
    }

    return null; // No conversation right now
  },

  /**
   * Check if a new conversation should start based on likelihood table
   */
  async checkStartLikelihood(userId) {
    // Get user's chat likelihood setting
    const result = await db.query(
      `SELECT likelihood_multiplier
       FROM chat_likelihood
       WHERE user_id = $1`,
      [userId]
    );

    const multiplier = result.rows[0]?.likelihood_multiplier || 1.0;

    // Base chance: 2 conversations per day = ~8% chance per hour
    // With polling every 30 seconds = ~0.1% per check
    const baseChance = 0.001;
    const adjustedChance = baseChance * multiplier;

    // Check if conversation already happened recently (prevent spam)
    const recent = await db.query(
      `SELECT created_at FROM conversation_audit_log
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '6 hours'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (recent.rows.length > 0) {
      const hoursSince = (Date.now() - recent.rows[0].created_at.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 6) {
        // Reduce chance significantly if recent conversation
        return Math.random() < (adjustedChance * 0.1);
      }
    }

    return Math.random() < adjustedChance;
  },

  /**
   * Start a new conversation
   */
  async startConversation(userId) {
    // Get user's chatlings
    const chatlings = await db.query(
      `SELECT ur.creature_id, c.creature_name as name
       FROM user_rewards ur
       JOIN creatures c ON ur.creature_id = c.id
       WHERE ur.user_id = $1
       AND ur.mood_status != 'runaway'
       LIMIT 10`,
      [userId]
    );

    if (chatlings.rows.length < 2) {
      return null; // Need at least 2 chatlings
    }

    // Pick 2-5 participants (weighted)
    const numParticipants = this.weightedParticipantCount();
    const participants = this.shuffleArray(chatlings.rows).slice(0, Math.min(numParticipants, chatlings.rows.length));

    // Get random trending topic
    const topic = await db.query(
      'SELECT * FROM trending_topics WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
    );

    if (topic.rows.length === 0) {
      return null; // No topics available
    }

    // Get a starter line
    const starterLine = await this.selectChatLine({
      lineType: 'starter',
      speaker: participants[0],
      topicTags: topic.rows[0].category ? [topic.rows[0].category] : null
    });

    if (!starterLine) {
      return null; // No appropriate starter line found
    }

    // Create active conversation with first message
    const firstMessage = {
      turn: 1,
      speaker: participants[0].name,
      creatureId: participants[0].creature_id,
      text: starterLine.text,
      lineType: starterLine.line_type
    };

    await db.query(
      `INSERT INTO active_conversations
       (user_id, topic_id, participants, current_turn, last_speaker_index, last_line_type, sentiment_scores, messages)
       VALUES ($1, $2, $3, 1, 0, $4, $5, $6)`,
      [
        userId,
        topic.rows[0].id,
        JSON.stringify(participants),
        starterLine.line_type,
        JSON.stringify({}), // Initialize empty sentiment scores
        JSON.stringify([firstMessage]) // Track messages for audit log
      ]
    );

    return {
      speaker: participants[0].name,
      creatureId: participants[0].creature_id,
      text: starterLine.text,
      turn: 1,
      continues: true,
      topic: topic.rows[0].topic_text
    };
  },

  /**
   * Continue an existing conversation
   */
  async continueConversation(conversation) {
    const participants = conversation.participants; // Already parsed from JSONB
    const currentTurn = conversation.current_turn;

    // Check if conversation should end
    if (await this.shouldEndConversation(conversation)) {
      await this.endConversation(conversation);
      return {
        speaker: null,
        text: null,
        continues: false,
        conversationEnded: true
      };
    }

    // Rate limiting: Don't send lines too fast (min 100ms between for testing, 5s for production)
    const timeSinceLastActivity = Date.now() - new Date(conversation.last_activity).getTime();
    const minDelay = process.env.NODE_ENV === 'production' ? 5000 : 100;
    if (timeSinceLastActivity < minDelay) {
      return null; // Too soon, wait
    }

    // Pick next speaker (rotate, but not same speaker twice)
    let nextSpeakerIndex = (conversation.last_speaker_index + 1) % participants.length;

    // Occasionally skip to random speaker
    if (Math.random() < 0.3) {
      const otherIndices = participants
        .map((_, i) => i)
        .filter(i => i !== conversation.last_speaker_index);
      nextSpeakerIndex = otherIndices[Math.floor(Math.random() * otherIndices.length)];
    }

    const nextSpeaker = participants[nextSpeakerIndex];

    // Get next line based on flow rules
    const nextLine = await this.selectNextChatLine({
      previousLineType: conversation.last_line_type,
      speaker: nextSpeaker,
      currentTurn: currentTurn + 1
    });

    if (!nextLine) {
      // No appropriate line found, end conversation
      await this.endConversation(conversation);
      return {
        speaker: null,
        text: null,
        continues: false,
        conversationEnded: true
      };
    }

    // Append message to conversation history
    const messages = conversation.messages || [];
    const newMessage = {
      turn: currentTurn + 1,
      speaker: nextSpeaker.name,
      creatureId: nextSpeaker.creature_id,
      text: nextLine.text,
      lineType: nextLine.line_type
    };
    messages.push(newMessage);

    // Update conversation state
    await db.query(
      `UPDATE active_conversations
       SET current_turn = $1,
           last_speaker_index = $2,
           last_line_type = $3,
           last_activity = NOW(),
           sentiment_scores = $4,
           messages = $5
       WHERE id = $6`,
      [
        currentTurn + 1,
        nextSpeakerIndex,
        nextLine.line_type,
        this.updateSentimentScores(
          conversation.sentiment_scores || {},
          nextSpeaker.creature_id,
          nextLine.sentiment,
          nextLine.intensity
        ),
        JSON.stringify(messages),
        conversation.id
      ]
    );

    return {
      speaker: nextSpeaker.name,
      creatureId: nextSpeaker.creature_id,
      text: nextLine.text,
      turn: currentTurn + 1,
      continues: true
    };
  },

  /**
   * Select a chat line from the library
   */
  async selectChatLine({ lineType, speaker, topicTags = null }) {
    // Build query for appropriate chat lines
    let query = `
      SELECT * FROM chat_lines
      WHERE line_type = $1
    `;
    const params = [lineType];

    // TODO: Add personality filtering when we have trait data
    // For now, just random selection from matching lines

    if (topicTags && topicTags.length > 0) {
      query += ` AND (topic_tags IS NULL OR topic_tags && $2)`;
      params.push(topicTags);
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    const result = await db.query(query, params);
    return result.rows[0] || null;
  },

  /**
   * Select next chat line based on flow rules
   */
  async selectNextChatLine({ previousLineType, speaker, currentTurn }) {
    // Get valid next line types based on flow rules
    const flowOptions = await db.query(
      `SELECT to_type, weight
       FROM chat_flow_rules
       WHERE from_type = $1
       AND min_turn <= $2
       AND max_turn >= $2`,
      [previousLineType, currentTurn]
    );

    if (flowOptions.rows.length === 0) {
      return null; // No valid next lines
    }

    // Weighted random selection of line type
    const nextLineType = this.weightedRandom(
      flowOptions.rows.map(r => ({ value: r.to_type, weight: r.weight }))
    );

    // Get a chat line of that type
    return await this.selectChatLine({
      lineType: nextLineType,
      speaker
    });
  },

  /**
   * Determine if conversation should end
   */
  async shouldEndConversation(conversation) {
    const currentTurn = conversation.current_turn;

    // Natural end conditions:
    // 1. If last line can end conversation AND turn >= 4
    if (currentTurn >= 4) {
      const lastLine = await db.query(
        'SELECT can_end_conversation FROM chat_lines WHERE line_type = $1 LIMIT 1',
        [conversation.last_line_type]
      );
      if (lastLine.rows[0]?.can_end_conversation) {
        // 50% chance to end if conditions met
        return Math.random() < 0.5;
      }
    }

    // 2. Force end after 12 turns (conversation too long)
    if (currentTurn >= 12) {
      return true;
    }

    // 3. Stale conversation (no activity in 5 minutes)
    const timeSinceLastActivity = Date.now() - new Date(conversation.last_activity).getTime();
    if (timeSinceLastActivity > 5 * 60 * 1000) {
      return true;
    }

    return false;
  },

  /**
   * End conversation and apply mood changes
   */
  async endConversation(conversation) {
    const participants = conversation.participants;
    const sentimentScores = conversation.sentiment_scores || {};

    // Get topic for audit log
    const topic = await db.query('SELECT topic_text FROM trending_topics WHERE id = $1', [conversation.topic_id]);

    // Get messages from conversation
    const messages = conversation.messages || [];

    // Calculate mood changes based on sentiment scores
    const moodChanges = {};
    for (const participant of participants) {
      const score = sentimentScores[participant.creature_id] || 0;
      const currentMood = await db.query(
        'SELECT mood_status, unhappy_count FROM user_rewards WHERE user_id = $1 AND creature_id = $2',
        [conversation.user_id, participant.creature_id]
      );

      if (currentMood.rows.length === 0) continue;

      const { mood_status, unhappy_count } = currentMood.rows[0];
      let newMood = mood_status;
      let newUnhappyCount = unhappy_count;

      // Mood transition logic based on score
      if (score > 2) {
        // Positive conversation
        newMood = 'happy';
        newUnhappyCount = Math.max(0, unhappy_count - 1);
      } else if (score < -2) {
        // Negative conversation
        if (mood_status === 'happy') {
          newMood = 'neutral';
        } else if (mood_status === 'neutral') {
          newMood = 'unhappy';
          newUnhappyCount = 1;
        } else {
          newUnhappyCount = unhappy_count + 1;
        }
      }
      // else: neutral score, no mood change

      moodChanges[participant.creature_id] = {
        before: mood_status,
        after: newMood,
        score: score
      };

      // Update mood
      await db.query(
        `UPDATE user_rewards
         SET mood_status = $1, unhappy_count = $2
         WHERE user_id = $3 AND creature_id = $4`,
        [newMood, newUnhappyCount, conversation.user_id, participant.creature_id]
      );

      // Check if chatling should run away
      if (newUnhappyCount >= 3 && Math.random() < 0.1) {
        await this.chatlingRunsAway(conversation.user_id, participant.creature_id, newUnhappyCount);
      }
    }

    // Log to audit table
    await db.query(
      `INSERT INTO conversation_audit_log
       (user_id, topic, participants, messages, mood_changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        conversation.user_id,
        topic.rows[0]?.topic_text || 'Unknown',
        JSON.stringify(participants.map(p => ({ creature_id: p.creature_id, name: p.name }))),
        JSON.stringify(messages),
        JSON.stringify(moodChanges)
      ]
    );

    // Delete active conversation
    await db.query('DELETE FROM active_conversations WHERE id = $1', [conversation.id]);
  },

  /**
   * Handle chatling running away
   */
  async chatlingRunsAway(userId, creatureId, unhappyCount) {
    await db.query(
      `INSERT INTO runaway_chatlings (user_id, creature_id, final_mood_status, unhappy_count)
       VALUES ($1, $2, 'unhappy', $3)`,
      [userId, creatureId, unhappyCount]
    );

    await db.query(
      'DELETE FROM user_rewards WHERE user_id = $1 AND creature_id = $2',
      [userId, creatureId]
    );

    // TODO: Create notification
  },

  /**
   * Update sentiment scores for a chatling
   */
  updateSentimentScores(scores, creatureId, sentiment, intensity) {
    const current = scores[creatureId] || 0;
    const change = sentiment === 'positive' ? intensity : sentiment === 'negative' ? -intensity : 0;
    scores[creatureId] = current + change;
    return JSON.stringify(scores);
  },

  /**
   * Weighted participant count (2-5 chatlings)
   */
  weightedParticipantCount() {
    const rand = Math.random();
    if (rand < 0.4) return 2;
    if (rand < 0.7) return 3;
    if (rand < 0.9) return 4;
    return 5;
  },

  /**
   * Weighted random selection
   */
  weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.value;
      }
    }

    return items[items.length - 1].value;
  },

  /**
   * Shuffle array (Fisher-Yates)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

module.exports = ConversationEngine;
