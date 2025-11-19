/**
 * Conversation Engine Testing Suite
 * Validates that procedurally generated conversations make sense
 */

const db = require('../services/db');
const conversationEngine = require('../services/conversation-engine');

const TestSuite = {
  results: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    conversations: []
  },

  /**
   * Run full test suite
   */
  async runAll() {
    console.log('🧪 Starting Conversation Engine Test Suite\n');

    await this.setupTestData();

    // Generate 50 test conversations
    console.log('📝 Generating 50 test conversations...\n');
    for (let i = 0; i < 50; i++) {
      await this.testSingleConversation(i + 1);
    }

    this.printResults();
    await this.cleanup();
  },

  /**
   * Set up test user and chatlings
   */
  async setupTestData() {
    console.log('🔧 Setting up test data...');

    // Create test user if doesn't exist
    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', ['test@chatroom.test']);
    let testUserId;

    if (userCheck.rows.length === 0) {
      const newUser = await db.query(
        `INSERT INTO users (email, username) VALUES ($1, $2) RETURNING id`,
        ['test@chatroom.test', 'TestUser']
      );
      testUserId = newUser.rows[0].id;
    } else {
      testUserId = userCheck.rows[0].id;
    }

    // Give test user 5 chatlings if they don't have any
    const chatlings = await db.query(
      'SELECT COUNT(*) FROM user_rewards WHERE user_id = $1',
      [testUserId]
    );

    if (chatlings.rows[0].count < 5) {
      const creatures = await db.query('SELECT id FROM creatures LIMIT 5');
      for (const creature of creatures.rows) {
        await db.query(
          `INSERT INTO user_rewards (user_id, creature_id, mood_status, unhappy_count)
           VALUES ($1, $2, 'neutral', 0)
           ON CONFLICT DO NOTHING`,
          [testUserId, creature.id]
        );
      }
    }

    // Ensure trending topics exist
    const topics = await db.query('SELECT COUNT(*) FROM trending_topics WHERE is_active = true');
    if (topics.rows[0].count === 0) {
      await db.query(
        `INSERT INTO trending_topics (topic_text, category, is_active) VALUES
         ('Should pineapple be on pizza?', 'food', true),
         ('Are cats better than dogs?', 'pets', true),
         ('Is working from home better?', 'lifestyle', true)`
      );
    }

    // Set up chat likelihood
    await db.query(
      `INSERT INTO chat_likelihood (user_id, likelihood_multiplier)
       VALUES ($1, 999.99) -- Always trigger for testing
       ON CONFLICT (user_id) DO UPDATE SET likelihood_multiplier = 999.99`,
      [testUserId]
    );

    this.testUserId = testUserId;
    console.log(`✅ Test user ID: ${testUserId}\n`);
  },

  /**
   * Test a single conversation generation
   */
  async testSingleConversation(testNum) {
    console.log(`\n--- Test Conversation #${testNum} ---`);

    const conversation = [];
    let turn = 0;
    let continues = true;

    try {
      // Start conversation
      let line = await conversationEngine.getNextLine(this.testUserId);

      if (!line) {
        this.fail(testNum, 'Failed to start conversation');
        return;
      }

      conversation.push({
        turn: ++turn,
        speaker: line.speaker,
        text: line.text,
        topic: line.topic
      });

      console.log(`Topic: ${line.topic}`);
      console.log(`${turn}. ${line.speaker}: "${line.text}"`);

      // Continue conversation
      while (continues && turn < 20) { // Safety limit
        await this.sleep(100); // Small delay to simulate polling

        line = await conversationEngine.getNextLine(this.testUserId);

        if (!line) {
          this.fail(testNum, 'Engine returned null mid-conversation');
          break;
        }

        if (line.conversationEnded) {
          console.log(`\n✅ Conversation ended naturally after ${turn} turns`);
          continues = false;
          break;
        }

        conversation.push({
          turn: ++turn,
          speaker: line.speaker,
          text: line.text
        });

        console.log(`${turn}. ${line.speaker}: "${line.text}"`);
      }

      if (turn >= 20) {
        this.warn(testNum, 'Conversation exceeded 20 turns');
      }

      // Validate conversation
      this.validateConversation(testNum, conversation);

    } catch (error) {
      this.fail(testNum, `Error: ${error.message}`);
      console.error(error);
    } finally {
      // Clean up active conversation for this user after each test
      try {
        await db.query('DELETE FROM active_conversations WHERE user_id = $1', [this.testUserId]);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError.message);
      }
    }
  },

  /**
   * Validate conversation for common issues
   */
  validateConversation(testNum, conversation) {
    const issues = [];

    // Check 1: Minimum length (should have at least 3 turns)
    if (conversation.length < 3) {
      issues.push('Conversation too short (< 3 turns)');
    }

    // Check 2: No duplicate consecutive speakers
    for (let i = 1; i < conversation.length; i++) {
      if (conversation[i].speaker === conversation[i - 1].speaker) {
        issues.push(`Duplicate speaker at turns ${i} and ${i + 1}`);
      }
    }

    // Check 3: All participants spoke at least once
    const speakers = new Set(conversation.map(c => c.speaker));
    if (speakers.size < 2) {
      issues.push('Only one chatling spoke');
    }

    // Check 4: Reasonable length (4-12 turns ideal)
    if (conversation.length > 12) {
      issues.push(`Conversation too long (${conversation.length} turns)`);
    }

    // Check 5: No empty text
    const emptyLines = conversation.filter(c => !c.text || c.text.trim() === '');
    if (emptyLines.length > 0) {
      issues.push('Empty chat lines detected');
    }

    // Record results
    this.results.conversations.push({
      testNum,
      length: conversation.length,
      speakers: speakers.size,
      conversation,
      issues
    });

    if (issues.length === 0) {
      this.pass(testNum);
    } else {
      this.warn(testNum, issues.join(', '));
    }
  },

  /**
   * Mark test as passed
   */
  pass(testNum) {
    this.results.totalTests++;
    this.results.passed++;
    console.log(`✅ Test #${testNum} PASSED`);
  },

  /**
   * Mark test as failed
   */
  fail(testNum, reason) {
    this.results.totalTests++;
    this.results.failed++;
    console.log(`❌ Test #${testNum} FAILED: ${reason}`);
  },

  /**
   * Mark test with warning
   */
  warn(testNum, reason) {
    this.results.totalTests++;
    this.results.warnings++;
    console.log(`⚠️  Test #${testNum} WARNING: ${reason}`);
  },

  /**
   * Print final results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log('='.repeat(60));

    // Statistics
    const lengths = this.results.conversations.map(c => c.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);

    console.log('\n📈 STATISTICS');
    console.log(`Average conversation length: ${avgLength.toFixed(1)} turns`);
    console.log(`Min length: ${minLength} turns`);
    console.log(`Max length: ${maxLength} turns`);

    // Most common issues
    const allIssues = this.results.conversations.flatMap(c => c.issues);
    const issueFrequency = {};
    allIssues.forEach(issue => {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
    });

    if (Object.keys(issueFrequency).length > 0) {
      console.log('\n⚠️  COMMON ISSUES:');
      Object.entries(issueFrequency)
        .sort((a, b) => b[1] - a[1])
        .forEach(([issue, count]) => {
          console.log(`  - ${issue}: ${count} times`);
        });
    }

    // Sample conversations for manual review
    console.log('\n📝 SAMPLE CONVERSATIONS FOR MANUAL REVIEW:');
    const samples = this.results.conversations.slice(0, 3);
    samples.forEach((conv, idx) => {
      console.log(`\nSample ${idx + 1}:`);
      conv.conversation.forEach(line => {
        console.log(`  ${line.turn}. ${line.speaker}: "${line.text}"`);
      });
    });
  },

  /**
   * Clean up test data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    await db.query('DELETE FROM active_conversations WHERE user_id = $1', [this.testUserId]);
    await db.query('UPDATE chat_likelihood SET likelihood_multiplier = 1.0 WHERE user_id = $1', [this.testUserId]);
    console.log('✅ Cleanup complete');
  },

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Run tests if called directly
if (require.main === module) {
  TestSuite.runAll()
    .then(() => {
      console.log('\n✅ Test suite complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = TestSuite;
