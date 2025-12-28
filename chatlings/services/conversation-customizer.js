/**
 * Conversation Customizer Service
 *
 * Personalizes AI-generated conversations for each user by:
 * - Assigning user's chatlings to comments
 * - Applying attitude transformations (Enthusiastic/Skeptical/Humorous/Balanced)
 * - Calculating glow changes based on comment sentiment
 *
 * All transformations are done via post-processing (no AI costs).
 */

class ConversationCustomizer {
  constructor() {
    // Sentiment to glow mapping
    this.sentimentGlowMap = {
      positive: 2,
      neutral: 1,
      negative: -1
    };
  }

  /**
   * Customize a conversation for a specific user
   * @param {Object} baseConversation - Original AI-generated conversation
   * @param {Object} user - User object with chatlings
   * @param {Object} attitude - User's chat attitude settings
   * @returns {Object} - Customized conversation with glow impact
   */
  async customizeConversation(baseConversation, user, attitude) {
    console.log(`\n🎨 Customizing conversation for user ${user.id}`);

    try {
      // Get user's active chatlings (max 10)
      const chatlings = await this.getUserChatlings(user.id);

      if (chatlings.length === 0) {
        throw new Error('User has no active chatlings');
      }

      console.log(`   Using ${chatlings.length} chatlings`);

      // Assign chatlings to comments
      const assignedComments = this.assignChatlings(
        baseConversation.conversationData.comments,
        chatlings
      );

      // Apply attitude transformations
      const customizedComments = this.applyAttitudeTransformations(
        assignedComments,
        attitude
      );

      // Calculate glow impact
      const glowImpact = this.calculateGlowImpact(customizedComments);

      console.log(`   Total glow change: ${glowImpact.totalGlowChange > 0 ? '+' : ''}${glowImpact.totalGlowChange}`);

      return {
        customizedContent: {
          comments: customizedComments,
          metadata: {
            ...baseConversation.conversationData.metadata,
            customizedAt: new Date().toISOString(),
            userId: user.id,
            attitudeApplied: attitude
          }
        },
        assignedChatlings: chatlings.map(c => ({
          id: c.id,
          name: c.name,
          bodyType: c.body_type
        })),
        glowImpact,
        totalGlowChange: glowImpact.totalGlowChange
      };

    } catch (error) {
      console.error('❌ Error customizing conversation:', error.message);
      throw new Error(`Conversation customization failed: ${error.message}`);
    }
  }

  /**
   * Get user's active chatlings from team
   */
  async getUserChatlings(userId) {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
      const result = await pool.query(`
        SELECT
          c.id,
          c.name,
          c.body_type,
          tp.position_id,
          tp.role
        FROM user_creatures uc
        JOIN creatures c ON uc.creature_id = c.id
        LEFT JOIN team_positions tp ON tp.creature_id = c.id
        WHERE uc.user_id = $1
          AND tp.user_id = $1
          AND tp.is_active = true
        ORDER BY tp.position_id
        LIMIT 10
      `, [userId]);

      return result.rows;
    } finally {
      await pool.end();
    }
  }

  /**
   * Assign chatlings to comments randomly but evenly
   */
  assignChatlings(comments, chatlings) {
    const assignedComments = [];
    let chatlingIndex = 0;

    for (const comment of comments) {
      // Assign chatling to this comment
      const chatling = chatlings[chatlingIndex % chatlings.length];

      const assignedComment = {
        ...comment,
        chatlingId: chatling.id,
        chatlingName: chatling.name,
        bodyType: chatling.body_type,
        role: chatling.role
      };

      // Recursively assign chatlings to replies
      if (comment.replies && comment.replies.length > 0) {
        assignedComment.replies = this.assignChatlings(comment.replies, chatlings);
      }

      assignedComments.push(assignedComment);
      chatlingIndex++;
    }

    return assignedComments;
  }

  /**
   * Apply attitude transformations to comments
   */
  applyAttitudeTransformations(comments, attitude) {
    const attitudeType = this.determineAttitudeType(attitude);

    return comments.map(comment => {
      const transformedComment = {
        ...comment,
        originalText: comment.text,
        text: this.transformCommentText(comment.text, comment.sentiment, attitudeType, attitude),
        attitudeType
      };

      // Recursively transform replies
      if (comment.replies && comment.replies.length > 0) {
        transformedComment.replies = this.applyAttitudeTransformations(comment.replies, attitude);
      }

      return transformedComment;
    });
  }

  /**
   * Determine attitude type from settings
   */
  determineAttitudeType(attitude) {
    const enthusiasm = attitude.enthusiasm_level || 5;
    const criticism = attitude.criticism_level || 5;
    const humor = attitude.humor_level || 5;

    // Check for dominant attitude (>= 8)
    if (enthusiasm >= 8) return 'enthusiastic';
    if (criticism >= 8) return 'skeptical';
    if (humor >= 8) return 'humorous';

    // Check for balanced
    const avg = (enthusiasm + criticism + humor) / 3;
    const variance = Math.max(
      Math.abs(enthusiasm - avg),
      Math.abs(criticism - avg),
      Math.abs(humor - avg)
    );

    if (variance <= 2) return 'balanced';

    // Default to most prominent
    const max = Math.max(enthusiasm, criticism, humor);
    if (enthusiasm === max) return 'enthusiastic';
    if (criticism === max) return 'skeptical';
    if (humor === max) return 'humorous';

    return 'balanced';
  }

  /**
   * Transform comment text based on attitude
   */
  transformCommentText(text, sentiment, attitudeType, attitude) {
    switch (attitudeType) {
      case 'enthusiastic':
        return this.makeEnthusiastic(text, sentiment, attitude.enthusiasm_level);

      case 'skeptical':
        return this.makeSkeptical(text, sentiment, attitude.criticism_level);

      case 'humorous':
        return this.makeHumorous(text, sentiment, attitude.humor_level);

      case 'balanced':
      default:
        return text; // Keep original for balanced
    }
  }

  /**
   * Make comment more enthusiastic
   */
  makeEnthusiastic(text, sentiment, level) {
    if (sentiment === 'negative') {
      // Soften negative comments
      return text.replace(/terrible|awful|bad|worst/gi, match => {
        if (level >= 9) return 'not perfect';
        if (level >= 7) return 'could be better';
        return match;
      });
    }

    if (sentiment === 'positive') {
      // Amplify positive comments
      if (level >= 9) {
        text = text.replace(/good|great|nice/gi, match => {
          if (match.toLowerCase() === 'good') return 'AMAZING';
          if (match.toLowerCase() === 'great') return 'INCREDIBLE';
          if (match.toLowerCase() === 'nice') return 'AWESOME';
          return match;
        });
        // Add enthusiasm markers
        if (!text.endsWith('!')) {
          text += level >= 10 ? '!!' : '!';
        }
      }
    }

    return text;
  }

  /**
   * Make comment more skeptical/critical
   */
  makeSkeptical(text, sentiment, level) {
    if (sentiment === 'positive') {
      // Add skepticism to positive comments
      if (level >= 9) {
        const skepticalPhrases = [
          ', but...',
          ', though...',
          'I guess...',
          'Maybe, but...'
        ];
        const phrase = skepticalPhrases[Math.floor(Math.random() * skepticalPhrases.length)];

        // Add skeptical phrase to beginning or end
        if (Math.random() > 0.5) {
          text = 'I guess ' + text.charAt(0).toLowerCase() + text.slice(1);
        } else {
          text = text.replace(/[.!]$/, phrase);
        }
      }
    }

    if (sentiment === 'negative') {
      // Amplify negative comments
      if (level >= 8) {
        text = text.replace(/not good|meh|okay/gi, match => {
          if (level >= 10) return 'pretty disappointing';
          return 'not great';
        });
      }
    }

    return text;
  }

  /**
   * Make comment more humorous
   */
  makeHumorous(text, sentiment, level) {
    if (level >= 9) {
      const humorMarkers = ['lol', 'lmao', 'haha'];
      const marker = humorMarkers[Math.floor(Math.random() * humorMarkers.length)];

      // Add humor marker
      if (!text.toLowerCase().includes('lol') && !text.toLowerCase().includes('lmao')) {
        if (Math.random() > 0.5) {
          text += ` ${marker}`;
        } else {
          text = `${marker} ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
        }
      }
    }

    return text;
  }

  /**
   * Calculate total glow impact from conversation
   */
  calculateGlowImpact(comments) {
    const impact = {
      totalGlowChange: 0,
      bySentiment: {
        positive: { count: 0, glow: 0 },
        neutral: { count: 0, glow: 0 },
        negative: { count: 0, glow: 0 }
      },
      byChatling: {},
      breakdown: []
    };

    this.calculateGlowRecursive(comments, impact);

    return impact;
  }

  /**
   * Recursively calculate glow from comments and replies
   */
  calculateGlowRecursive(comments, impact) {
    for (const comment of comments) {
      const glow = this.sentimentGlowMap[comment.sentiment] || 0;

      // Update totals
      impact.totalGlowChange += glow;
      impact.bySentiment[comment.sentiment].count++;
      impact.bySentiment[comment.sentiment].glow += glow;

      // Track by chatling
      if (!impact.byChatling[comment.chatlingId]) {
        impact.byChatling[comment.chatlingId] = {
          name: comment.chatlingName,
          totalGlow: 0,
          comments: 0
        };
      }
      impact.byChatling[comment.chatlingId].totalGlow += glow;
      impact.byChatling[comment.chatlingId].comments++;

      // Add to breakdown
      impact.breakdown.push({
        commentId: comment.id,
        chatlingName: comment.chatlingName,
        sentiment: comment.sentiment,
        glow: glow,
        text: comment.text.substring(0, 50) + (comment.text.length > 50 ? '...' : '')
      });

      // Process replies
      if (comment.replies && comment.replies.length > 0) {
        this.calculateGlowRecursive(comment.replies, impact);
      }
    }
  }

  /**
   * Get default attitude settings
   */
  getDefaultAttitude() {
    return {
      enthusiasm_level: 5,
      criticism_level: 5,
      humor_level: 5,
      attitude_type: 'balanced'
    };
  }
}

module.exports = ConversationCustomizer;
