/**
 * AI Conversation Generator Service
 *
 * Generates AI-powered conversations about YouTube videos using OpenAI API.
 * Uses a three-pass approach to create realistic comment threads.
 */

const { OpenAI } = require('openai');

class AIConversationGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.model = 'gpt-3.5-turbo';

    // Token pricing for GPT-3.5 Turbo
    this.pricing = {
      input: 0.0005 / 1000,   // $0.0005 per 1K tokens
      output: 0.0015 / 1000   // $0.0015 per 1K tokens
    };
  }

  /**
   * Generate a complete conversation about a YouTube video
   * @param {Object} video - YouTube video object
   * @returns {Object} - { conversationData, totalComments, cost, duration }
   */
  async generateConversation(video) {
    const startTime = Date.now();
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    console.log(`\n🤖 Generating AI conversation for: ${video.title}`);
    console.log(`   Video ID: ${video.youtube_video_id}`);
    console.log(`   Category: ${video.category || 'General'}`);

    try {
      // Pass 1: Generate initial comments
      console.log('\n📝 Pass 1: Generating initial comments...');
      const { comments: initialComments, tokens: pass1Tokens } = await this.generateInitialComments(video);
      totalInputTokens += pass1Tokens.input;
      totalOutputTokens += pass1Tokens.output;
      console.log(`   ✓ Generated ${initialComments.length} initial comments`);

      // Pass 2: Generate replies to top comments
      console.log('\n💬 Pass 2: Generating replies...');
      const topComments = this.selectTopComments(initialComments, 8);
      const { comments: withReplies, tokens: pass2Tokens } = await this.generateReplies(topComments, video);
      totalInputTokens += pass2Tokens.input;
      totalOutputTokens += pass2Tokens.output;
      console.log(`   ✓ Generated replies for ${topComments.length} comments`);

      // Pass 3: Generate deeper nested replies
      console.log('\n🔄 Pass 3: Generating nested replies...');
      const { comments: finalComments, tokens: pass3Tokens } = await this.generateNestedReplies(withReplies, video);
      totalInputTokens += pass3Tokens.input;
      totalOutputTokens += pass3Tokens.output;
      console.log(`   ✓ Generated nested replies`);

      // Calculate cost
      totalCost = (totalInputTokens * this.pricing.input) + (totalOutputTokens * this.pricing.output);
      const duration = Date.now() - startTime;

      // Count total comments (including all replies)
      const totalComments = this.countTotalComments(finalComments);

      console.log('\n✅ Conversation generation complete!');
      console.log(`   Total comments: ${totalComments}`);
      console.log(`   Total tokens: ${totalInputTokens + totalOutputTokens} (${totalInputTokens} in, ${totalOutputTokens} out)`);
      console.log(`   Cost: $${totalCost.toFixed(6)}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

      return {
        conversationData: {
          comments: finalComments,
          metadata: {
            videoId: video.youtube_video_id,
            videoTitle: video.title,
            category: video.category,
            generatedAt: new Date().toISOString(),
            model: this.model,
            totalTokens: totalInputTokens + totalOutputTokens,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens
          }
        },
        totalComments,
        cost: totalCost,
        duration
      };

    } catch (error) {
      console.error('❌ Error generating conversation:', error.message);
      throw new Error(`AI conversation generation failed: ${error.message}`);
    }
  }

  /**
   * Pass 1: Generate initial comments about the video
   */
  async generateInitialComments(video) {
    const prompt = this.buildInitialCommentsPrompt(video);

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a comment generator that creates realistic YouTube comments. Generate diverse perspectives ranging from highly positive to critical. Include different personality types: enthusiastic fans, critics, humorists, and balanced viewers. Make comments feel natural and varied in length and style.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9, // High temperature for diverse comments
      max_tokens: 2000
    });

    const comments = this.parseCommentsFromResponse(response.choices[0].message.content);

    return {
      comments,
      tokens: {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens
      }
    };
  }

  /**
   * Pass 2: Generate replies to top comments
   */
  async generateReplies(topComments, video) {
    const commentsWithReplies = [];

    for (const comment of topComments) {
      const prompt = this.buildRepliesPrompt(comment, video);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are generating replies to a YouTube comment. Create 2-3 realistic replies that continue the conversation. Replies should have different perspectives - some agreeing, some disagreeing, some adding humor or additional insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.85,
        max_tokens: 500
      });

      const replies = this.parseCommentsFromResponse(response.choices[0].message.content);

      commentsWithReplies.push({
        ...comment,
        replies: replies.map(reply => ({
          id: this.generateCommentId(),
          text: reply.text,
          sentiment: reply.sentiment,
          replies: []
        }))
      });
    }

    // Add comments without replies
    const remainingComments = topComments.slice(8).map(c => ({ ...c, replies: [] }));

    return {
      comments: [...commentsWithReplies, ...remainingComments],
      tokens: {
        input: topComments.length * 150, // Estimated
        output: topComments.length * 100  // Estimated
      }
    };
  }

  /**
   * Pass 3: Generate deeper nested replies
   */
  async generateNestedReplies(comments, video) {
    // Select a few comments with replies to add deeper nesting
    const targetComments = comments.filter(c => c.replies && c.replies.length > 0).slice(0, 3);

    for (const comment of targetComments) {
      if (comment.replies.length > 0) {
        const topReply = comment.replies[0];
        const prompt = this.buildNestedRepliesPrompt(comment, topReply, video);

        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are generating a nested reply in a YouTube comment thread. Create 1-2 short replies that continue this specific conversation thread.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 200
        });

        const nestedReplies = this.parseCommentsFromResponse(response.choices[0].message.content);

        comment.replies[0].replies = nestedReplies.map(reply => ({
          id: this.generateCommentId(),
          text: reply.text,
          sentiment: reply.sentiment,
          replies: []
        }));
      }
    }

    return {
      comments,
      tokens: {
        input: targetComments.length * 100,
        output: targetComments.length * 50
      }
    };
  }

  /**
   * Build prompt for initial comments
   */
  buildInitialCommentsPrompt(video) {
    return `Generate 20 diverse YouTube comments about this video:

Title: "${video.title}"
Category: ${video.category || 'General'}
Description: ${video.description ? video.description.substring(0, 200) : 'N/A'}

Requirements:
- Create 20 comments with varied perspectives
- Include positive (6 comments), neutral (8 comments), and negative (6 comments) sentiments
- Vary comment length from short (1 line) to longer (3-4 lines)
- Include different personality types:
  * Enthusiastic fans
  * Critical analysts
  * Humorists/jokers
  * Balanced/thoughtful viewers
- Make comments feel natural and realistic
- Use casual YouTube comment language

Format each comment as:
[SENTIMENT: positive/neutral/negative]
Comment text here

Example:
[SENTIMENT: positive]
This is exactly what I needed! Great explanation!

[SENTIMENT: negative]
Meh, nothing new here. Pretty disappointed tbh.

Generate all 20 comments now:`;
  }

  /**
   * Build prompt for replies to a comment
   */
  buildRepliesPrompt(comment, video) {
    return `Generate 2-3 replies to this YouTube comment:

Video: "${video.title}"

Original Comment:
"${comment.text}"
(Sentiment: ${comment.sentiment})

Requirements:
- Generate 2-3 realistic replies
- Include different perspectives (some agree, some disagree, some add humor)
- Keep replies shorter than original comment
- Match YouTube comment style
- Vary sentiment across replies

Format each reply as:
[SENTIMENT: positive/neutral/negative]
Reply text here`;
  }

  /**
   * Build prompt for nested replies
   */
  buildNestedRepliesPrompt(originalComment, reply, video) {
    return `Generate 1-2 short nested replies to continue this comment thread:

Video: "${video.title}"

Original Comment: "${originalComment.text}"
↳ Reply: "${reply.text}"

Generate 1-2 short replies that continue this specific thread. Keep them brief and natural.

Format:
[SENTIMENT: positive/neutral/negative]
Reply text`;
  }

  /**
   * Parse comments from AI response
   */
  parseCommentsFromResponse(responseText) {
    const comments = [];
    const lines = responseText.split('\n');

    let currentSentiment = null;
    let currentText = '';

    for (const line of lines) {
      const sentimentMatch = line.match(/\[SENTIMENT:\s*(positive|neutral|negative)\]/i);

      if (sentimentMatch) {
        // Save previous comment if exists
        if (currentSentiment && currentText.trim()) {
          comments.push({
            id: this.generateCommentId(),
            text: currentText.trim(),
            sentiment: currentSentiment,
            replies: []
          });
        }

        // Start new comment
        currentSentiment = sentimentMatch[1].toLowerCase();
        currentText = line.replace(/\[SENTIMENT:\s*\w+\]/i, '').trim();
      } else if (line.trim() && currentSentiment) {
        // Continue current comment
        currentText += (currentText ? ' ' : '') + line.trim();
      }
    }

    // Save last comment
    if (currentSentiment && currentText.trim()) {
      comments.push({
        id: this.generateCommentId(),
        text: currentText.trim(),
        sentiment: currentSentiment,
        replies: []
      });
    }

    return comments;
  }

  /**
   * Select top comments for replies (mix of sentiments)
   */
  selectTopComments(comments, count) {
    // Select a mix of sentiments
    const positive = comments.filter(c => c.sentiment === 'positive').slice(0, 3);
    const neutral = comments.filter(c => c.sentiment === 'neutral').slice(0, 3);
    const negative = comments.filter(c => c.sentiment === 'negative').slice(0, 2);

    return [...positive, ...neutral, ...negative].slice(0, count);
  }

  /**
   * Count total comments including all nested replies
   */
  countTotalComments(comments) {
    let count = comments.length;

    for (const comment of comments) {
      if (comment.replies && comment.replies.length > 0) {
        count += this.countTotalComments(comment.replies);
      }
    }

    return count;
  }

  /**
   * Generate unique comment ID
   */
  generateCommentId() {
    return `ai_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validate OpenAI configuration
   */
  async validateConfiguration() {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Say "AI setup successful!"' }],
        max_tokens: 10
      });

      return {
        success: true,
        message: 'OpenAI API connection successful',
        model: this.model,
        response: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        message: `OpenAI API connection failed: ${error.message}`,
        error
      };
    }
  }
}

module.exports = AIConversationGenerator;
