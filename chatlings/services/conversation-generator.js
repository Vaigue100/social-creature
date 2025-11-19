/**
 * Conversation Generator
 *
 * Generates realistic chatling conversations based on:
 * - Trending topics
 * - Chatling personalities (inferred from traits)
 * - Random dynamics (agreement/conflict)
 */

class ConversationGenerator {
  constructor() {
    // Message templates by sentiment
    this.templates = {
      positive: [
        "I totally agree with {topic}!",
        "This is exactly what I've been thinking!",
        "You get it! This is so true!",
        "Finally someone said it!",
        "I'm here for this energy!",
        "This is the best take I've heard today",
        "Absolutely! Couldn't have said it better",
        "Yes! This! All of this!",
        "I'm so glad we're on the same page",
        "This is actually such a vibe"
      ],
      negative: [
        "I don't know about that...",
        "That's a terrible take, honestly",
        "Why would anyone think that?",
        "Hard disagree on this one",
        "This is exactly what's wrong with everything",
        "I can't believe people actually believe this",
        "That's the worst opinion I've heard today",
        "No way, this is completely wrong",
        "I'm so tired of hearing this take",
        "This is literally the opposite of the truth"
      ],
      neutral: [
        "I can see both sides of this",
        "Interesting perspective",
        "Not sure how I feel about this",
        "That's one way to look at it",
        "I never really thought about it that way",
        "Hmm, maybe?",
        "I guess that makes sense",
        "Fair point, I suppose",
        "I'm kind of in the middle on this",
        "It depends on how you look at it"
      ],
      reaction_positive: [
        "Right?! I'm so glad you see it too!",
        "Exactly! We're totally on the same wavelength!",
        "This is why we get along so well",
        "See, you understand!",
        "Finally, someone who gets it!",
        "Yes! Thank you!",
        "I knew you'd understand",
        "We're thinking the same thing!"
      ],
      reaction_negative: [
        "Wait, you actually think that?",
        "We're never going to agree on this",
        "I can't believe you just said that",
        "That's... an interesting take",
        "Okay, we clearly see this differently",
        "I'm just going to pretend I didn't hear that",
        "Wow, okay then",
        "I think we need to agree to disagree"
      ],
      reaction_neutral: [
        "I suppose that's fair",
        "I can see where you're coming from",
        "Maybe you have a point",
        "That's an interesting way to think about it",
        "I hadn't considered that angle",
        "Hmm, you might be right",
        "That's worth thinking about"
      ],
      question: [
        "What do you think about {topic}?",
        "Has anyone seen the latest about {topic}?",
        "Can we talk about {topic}?",
        "So... {topic}. Thoughts?",
        "I need to know what you all think about {topic}",
        "Am I the only one thinking about {topic}?",
        "Okay but seriously, {topic}?"
      ],
      closing_positive: [
        "Glad we talked about this!",
        "This was a good conversation",
        "Always good chatting with you all",
        "Love these kinds of talks!",
        "This made my day better",
        "Quality conversation right here"
      ],
      closing_negative: [
        "Well, that was... something",
        "I need to take a break after this",
        "I think I'm done with this topic",
        "That was exhausting",
        "Anyway, moving on...",
        "I'm just going to go now"
      ],
      closing_neutral: [
        "Interesting discussion",
        "Well, that's that I guess",
        "Food for thought",
        "Anyway, see you all later",
        "Always interesting to hear different views"
      ],
      inactivity_concern: [
        "I haven't seen them in days...",
        "Do you think something's wrong?",
        "Maybe they're just busy?",
        "I hope they come back soon",
        "This is getting worrying",
        "I miss having them around",
        "It's not the same without them here",
        "What if they never come back?",
        "I'm starting to feel abandoned",
        "They used to check on us every day..."
      ],
      inactivity_negative: [
        "They clearly don't care about us anymore",
        "We've been forgotten",
        "I knew this would happen eventually",
        "Why did they even create us if they were going to leave?",
        "This is so unfair to us",
        "I feel so neglected",
        "We're just sitting here waiting for nothing",
        "Maybe we should just give up hope"
      ],
      inactivity_optimistic: [
        "I'm sure they'll be back soon!",
        "Maybe they're on vacation?",
        "Everyone needs a break sometimes",
        "Let's stay positive, they'll return",
        "They've always come back before",
        "I believe in them!"
      ]
    };
  }

  /**
   * Generate a complete conversation
   *
   * @param {Array} participants - Array of chatling objects with creature details
   * @param {Object} topic - Topic object with text and sentiment
   * @param {Boolean} isInactivityTopic - Whether this is an inactivity topic
   * @returns {Object} - { messages: [], moodImpact: {} }
   */
  generateConversation(participants, topic, isInactivityTopic = false) {
    const messages = [];
    let messageOrder = 0;

    // Check if this is an inactivity topic
    if (isInactivityTopic) {
      return this.generateInactivityConversation(participants, topic);
    }

    // Assign opinions to each participant (based on random dynamics)
    const opinions = this.assignOpinions(participants, topic);

    // 1. Opening: First chatling introduces topic
    const opener = participants[0];
    messages.push({
      creature_id: opener.id,
      message_text: this.getTemplate('question').replace('{topic}', topic.topic_text),
      message_order: messageOrder++,
      sentiment: 'neutral'
    });

    // 2. Initial reactions from each participant
    for (let i = 1; i < participants.length; i++) {
      const participant = participants[i];
      const opinion = opinions[participant.id];

      messages.push({
        creature_id: participant.id,
        message_text: this.getTemplate(opinion.sentiment),
        message_order: messageOrder++,
        sentiment: opinion.sentiment
      });
    }

    // 3. Opener responds to reactions
    const openerOpinion = opinions[opener.id];
    const agreementCount = Object.values(opinions).filter(o => o.sentiment === 'positive').length;
    const disagreementCount = Object.values(opinions).filter(o => o.sentiment === 'negative').length;

    if (agreementCount > disagreementCount) {
      messages.push({
        creature_id: opener.id,
        message_text: this.getTemplate('reaction_positive'),
        message_order: messageOrder++,
        sentiment: 'positive'
      });
    } else if (disagreementCount > agreementCount) {
      messages.push({
        creature_id: opener.id,
        message_text: this.getTemplate('reaction_negative'),
        message_order: messageOrder++,
        sentiment: 'negative'
      });
    } else {
      messages.push({
        creature_id: opener.id,
        message_text: this.getTemplate('reaction_neutral'),
        message_order: messageOrder++,
        sentiment: 'neutral'
      });
    }

    // 4. Back-and-forth between participants (1-2 more rounds)
    const rounds = Math.random() > 0.5 ? 2 : 1;
    for (let round = 0; round < rounds; round++) {
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
      const opinion = opinions[randomParticipant.id];

      // Pick reaction based on overall conversation tone
      let reactionType;
      if (agreementCount > disagreementCount) {
        reactionType = opinion.sentiment === 'positive' ? 'reaction_positive' : 'reaction_neutral';
      } else {
        reactionType = opinion.sentiment === 'negative' ? 'reaction_negative' : 'reaction_neutral';
      }

      messages.push({
        creature_id: randomParticipant.id,
        message_text: this.getTemplate(reactionType),
        message_order: messageOrder++,
        sentiment: opinion.sentiment
      });
    }

    // 5. Closing statement from someone
    const closer = participants[Math.floor(Math.random() * participants.length)];
    const closingOpinion = opinions[closer.id];
    let closingType;

    if (agreementCount > disagreementCount) {
      closingType = 'closing_positive';
    } else if (disagreementCount > agreementCount) {
      closingType = 'closing_negative';
    } else {
      closingType = 'closing_neutral';
    }

    messages.push({
      creature_id: closer.id,
      message_text: this.getTemplate(closingType),
      message_order: messageOrder++,
      sentiment: closingOpinion.sentiment
    });

    // Calculate mood impact
    const moodImpact = this.calculateMoodImpact(participants, opinions, agreementCount, disagreementCount);

    return {
      messages,
      moodImpact
    };
  }

  /**
   * Assign opinions to participants
   * Considers topic sentiment and random dynamics
   */
  assignOpinions(participants, topic) {
    const opinions = {};

    // First participant (opener) has random opinion
    const openerSentiment = this.randomSentiment();
    opinions[participants[0].id] = {
      sentiment: openerSentiment,
      strength: Math.random() // 0-1
    };

    // Other participants have opinions influenced by topic sentiment
    for (let i = 1; i < participants.length; i++) {
      const participant = participants[i];

      // 60% chance to have similar opinion to topic sentiment
      // 40% chance to have different opinion
      let sentiment;

      if (Math.random() < 0.6) {
        // Align with topic sentiment
        if (topic.sentiment === 'controversial') {
          sentiment = Math.random() < 0.5 ? 'positive' : 'negative';
        } else if (topic.sentiment === 'funny' || topic.sentiment === 'exciting') {
          sentiment = Math.random() < 0.7 ? 'positive' : 'neutral';
        } else {
          sentiment = this.randomSentiment();
        }
      } else {
        // Random opinion
        sentiment = this.randomSentiment();
      }

      opinions[participant.id] = {
        sentiment,
        strength: Math.random()
      };
    }

    return opinions;
  }

  /**
   * Calculate mood impact based on conversation dynamics
   */
  calculateMoodImpact(participants, opinions, agreementCount, disagreementCount) {
    const moodImpact = {
      happy: [],
      neutral: [],
      unhappy: []
    };

    participants.forEach(participant => {
      const opinion = opinions[participant.id];

      // If mostly agreement and participant was positive/neutral: happy
      if (agreementCount > disagreementCount) {
        if (opinion.sentiment === 'positive') {
          moodImpact.happy.push(participant.id);
        } else if (opinion.sentiment === 'neutral') {
          moodImpact.neutral.push(participant.id);
        } else {
          // Was negative in a positive conversation: unhappy
          moodImpact.unhappy.push(participant.id);
        }
      }
      // If mostly disagreement: conflict
      else if (disagreementCount > agreementCount) {
        if (opinion.sentiment === 'negative') {
          // Was negative in a negative conversation: neutral (not alone)
          moodImpact.neutral.push(participant.id);
        } else if (opinion.sentiment === 'positive') {
          // Was positive in a negative conversation: unhappy (outnumbered)
          moodImpact.unhappy.push(participant.id);
        } else {
          moodImpact.neutral.push(participant.id);
        }
      }
      // Balanced conversation: everyone neutral
      else {
        moodImpact.neutral.push(participant.id);
      }
    });

    return moodImpact;
  }

  /**
   * Get random template from category
   */
  getTemplate(category) {
    const templates = this.templates[category];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get random sentiment
   */
  randomSentiment() {
    const roll = Math.random();
    if (roll < 0.4) return 'positive';
    if (roll < 0.7) return 'neutral';
    return 'negative';
  }

  /**
   * Generate inactivity conversation
   * When user hasn't logged in for a while
   */
  generateInactivityConversation(participants, topic) {
    const messages = [];
    let messageOrder = 0;

    // 1. Opening: First chatling brings up the architect's absence
    const opener = participants[0];
    messages.push({
      creature_id: opener.id,
      message_text: topic.topic_text,
      message_order: messageOrder++,
      sentiment: 'negative'
    });

    // 2. Reactions: Mix of concern, negativity, and optimism
    // 60% negative/concerned, 40% optimistic
    for (let i = 1; i < participants.length; i++) {
      const participant = participants[i];
      const isNegative = Math.random() < 0.6;

      let sentiment, templateType;
      if (isNegative) {
        sentiment = 'negative';
        templateType = Math.random() < 0.5 ? 'inactivity_concern' : 'inactivity_negative';
      } else {
        sentiment = 'neutral';
        templateType = 'inactivity_optimistic';
      }

      messages.push({
        creature_id: participant.id,
        message_text: this.getTemplate(templateType),
        message_order: messageOrder++,
        sentiment: sentiment
      });
    }

    // 3. Back-and-forth (1-2 more exchanges)
    const rounds = Math.random() > 0.5 ? 2 : 1;
    for (let round = 0; round < rounds; round++) {
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
      const isNegative = Math.random() < 0.7; // Higher negative chance in later messages

      messages.push({
        creature_id: randomParticipant.id,
        message_text: this.getTemplate(
          isNegative ? 'inactivity_concern' : 'inactivity_optimistic'
        ),
        message_order: messageOrder++,
        sentiment: isNegative ? 'negative' : 'neutral'
      });
    }

    // 4. Closing: Usually negative/concerned
    const closer = participants[Math.floor(Math.random() * participants.length)];
    const closeNegative = Math.random() < 0.75;

    messages.push({
      creature_id: closer.id,
      message_text: this.getTemplate(
        closeNegative ? 'closing_negative' : 'closing_neutral'
      ),
      message_order: messageOrder++,
      sentiment: closeNegative ? 'negative' : 'neutral'
    });

    // Calculate mood impact: Most become unhappy due to neglect
    const moodImpact = {
      happy: [],
      neutral: [],
      unhappy: []
    };

    participants.forEach(participant => {
      // 70% chance to become unhappy, 30% neutral
      if (Math.random() < 0.7) {
        moodImpact.unhappy.push(participant.id);
      } else {
        moodImpact.neutral.push(participant.id);
      }
    });

    return {
      messages,
      moodImpact
    };
  }
}

module.exports = ConversationGenerator;
