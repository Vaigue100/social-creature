-- Add more diverse chat lines to reduce repetition

INSERT INTO chat_lines (text, line_type, responds_to, sentiment, intensity) VALUES

-- More starters
('Has anyone else been wondering about this?', 'starter', NULL, 'neutral', 1),
('This topic keeps coming up lately', 'starter', NULL, 'neutral', 1),
('I have some thoughts on this', 'starter', NULL, 'positive', 1),
('Let me share my perspective', 'starter', NULL, 'neutral', 1),

-- More agreements (varied)
('That makes total sense to me', 'agreement', ARRAY['starter', 'agreement', 'answer'], 'positive', 1),
('You are absolutely right about that', 'agreement', ARRAY['starter', 'answer'], 'positive', 2),
('I had not thought of it that way, but yes!', 'agreement', ARRAY['starter', 'answer'], 'positive', 1),
('Exactly! That is what I was trying to say', 'agreement', ARRAY['agreement'], 'positive', 1),
('100 percent agree with you there', 'agreement', ARRAY['starter', 'agreement'], 'positive', 2),
('Could not have said it better myself', 'agreement', ARRAY['starter', 'answer'], 'positive', 2),

-- More disagreements (varied intensity)
('Hmm, I am not so sure about that', 'disagreement', ARRAY['starter', 'agreement'], 'negative', 1),
('I see it differently', 'disagreement', ARRAY['starter', 'answer'], 'negative', 1),
('That does not match my experience at all', 'disagreement', ARRAY['starter', 'agreement'], 'negative', 2),
('I have to respectfully disagree', 'disagreement', ARRAY['starter', 'agreement'], 'negative', 1),
('No way, that cannot be right', 'disagreement', ARRAY['starter', 'agreement'], 'negative', 2),
('I think you might be missing something', 'disagreement', ARRAY['answer'], 'negative', 1),
('Not buying it, honestly', 'disagreement', ARRAY['agreement', 'answer'], 'negative', 2),

-- More neutral/bridge responses  
('That is an interesting take', 'neutral', ARRAY['starter', 'disagreement', 'agreement'], 'neutral', 1),
('I never looked at it from that angle', 'neutral', ARRAY['starter', 'answer'], 'neutral', 1),
('Fair point, though...', 'neutral', ARRAY['agreement', 'disagreement'], 'neutral', 1),
('Let me think about that for a second', 'neutral', ARRAY['question', 'starter'], 'neutral', 1),
('You might have a point there', 'neutral', ARRAY['disagreement', 'answer'], 'neutral', 1),
('I can understand where you are coming from', 'neutral', ARRAY['disagreement', 'starter'], 'neutral', 1),

-- More questions (keep conversation going)
('How did you come to that conclusion?', 'question', ARRAY['starter', 'disagreement'], 'neutral', 1),
('What makes you so sure?', 'question', ARRAY['agreement', 'disagreement'], 'neutral', 1),
('Can you explain what you mean?', 'question', ARRAY['starter'], 'neutral', 1),
('Where did you hear that?', 'question', ARRAY['starter', 'agreement'], 'neutral', 1),
('Do not you think there is more to it?', 'question', ARRAY['agreement'], 'neutral', 1),
('Is that really true though?', 'question', ARRAY['starter', 'agreement'], 'neutral', 1),

-- More answers (responding to questions)
('Based on what I have seen...', 'answer', ARRAY['question'], 'neutral', 1),
('I read about it somewhere', 'answer', ARRAY['question'], 'neutral', 1),
('It just seems logical to me', 'answer', ARRAY['question'], 'neutral', 1),
('Everyone I know thinks the same', 'answer', ARRAY['question'], 'neutral', 1),
('I guess I never really questioned it', 'answer', ARRAY['question'], 'neutral', 1),
('That is just how I feel about it', 'answer', ARRAY['question'], 'neutral', 1),
('From my experience, at least', 'answer', ARRAY['question'], 'neutral', 1),

-- More closers (natural endings)
('Anyway, good talk', 'closer', ARRAY['agreement', 'neutral', 'answer'], 'neutral', 1),
('I guess we will have to agree to disagree', 'closer', ARRAY['disagreement', 'neutral'], 'neutral', 1),
('Something to ponder, for sure', 'closer', ARRAY['agreement', 'neutral'], 'neutral', 1),
('Well, that was enlightening', 'closer', ARRAY['agreement', 'answer'], 'positive', 1),
('Interesting discussion', 'closer', ARRAY['agreement', 'neutral', 'disagreement'], 'neutral', 1),
('Let us talk about this again sometime', 'closer', ARRAY['agreement', 'neutral'], 'positive', 1)

ON CONFLICT DO NOTHING;

-- Update all closers to be able to end conversations
UPDATE chat_lines SET can_end_conversation = true WHERE line_type = 'closer';
