-- Migration 34: Add YouTube video-sharing chat lines
-- These lines are used when conversations start about YouTube videos

-- First, add column to track if line requires YouTube topic
ALTER TABLE chat_lines
ADD COLUMN IF NOT EXISTS requires_youtube_topic BOOLEAN DEFAULT false;

-- Add video-share starter lines
INSERT INTO chat_lines (text, line_type, responds_to, sentiment, intensity, requires_youtube_topic) VALUES

-- Video-share starters (chatling introduces the video)
('Did you see this video? {video_link} - it is about {video_title}', 'video-share', NULL, 'neutral', 1, true),
('I just watched this and it blew my mind! {video_link}', 'video-share', NULL, 'positive', 2, true),
('Check this out: {video_link} - super interesting', 'video-share', NULL, 'positive', 1, true),
('Has anyone else seen this video? {video_link}', 'video-share', NULL, 'neutral', 1, true),
('This video came up in my feed: {video_link} - thoughts?', 'video-share', NULL, 'neutral', 1, true),
('You have to watch this: {video_link}', 'video-share', NULL, 'positive', 2, true),
('I came across this video about {video_title}: {video_link}', 'video-share', NULL, 'neutral', 1, true)

ON CONFLICT DO NOTHING;

-- Update the newly inserted lines to require YouTube topic
UPDATE chat_lines
SET requires_youtube_topic = true
WHERE line_type = 'video-share';

-- Add more responses specifically for video topics
INSERT INTO chat_lines (text, line_type, responds_to, sentiment, intensity) VALUES

-- Positive responses to video shares
('Oh I saw that one! It was really good', 'agreement', ARRAY['video-share'], 'positive', 2),
('I have been meaning to watch that', 'agreement', ARRAY['video-share'], 'positive', 1),
('That channel is awesome', 'agreement', ARRAY['video-share'], 'positive', 2),
('I love videos like that', 'agreement', ARRAY['video-share'], 'positive', 1),

-- Neutral responses
('I will check it out later', 'neutral', ARRAY['video-share'], 'neutral', 1),
('What did you think about it?', 'question', ARRAY['video-share'], 'neutral', 1),
('I have not watched it yet', 'neutral', ARRAY['video-share'], 'neutral', 1),
('Is it worth watching?', 'question', ARRAY['video-share'], 'neutral', 1),

-- Skeptical/disagreement responses
('I am not really into that kind of content', 'disagreement', ARRAY['video-share'], 'negative', 1),
('I watched it but I was not convinced', 'disagreement', ARRAY['video-share'], 'negative', 1),
('That channel can be hit or miss', 'neutral', ARRAY['video-share'], 'neutral', 1),

-- Follow-up questions about video details
('What part stood out to you?', 'question', ARRAY['agreement', 'video-share'], 'neutral', 1),
('Did you see the part about {video_topic_detail}?', 'question', ARRAY['agreement'], 'neutral', 1),
('How long is it? I might watch later', 'question', ARRAY['video-share'], 'neutral', 1)

ON CONFLICT DO NOTHING;

-- Update flow rules to include video-share as a valid starter
INSERT INTO chat_flow_rules (from_type, to_type, weight, min_turn, max_turn) VALUES
('video-share', 'agreement', 30, 1, 5),
('video-share', 'disagreement', 15, 1, 5),
('video-share', 'question', 25, 1, 5),
('video-share', 'neutral', 20, 1, 5),
('video-share', 'closer', 5, 3, 10),

-- After responses to video-share
('agreement', 'question', 25, 2, 10),
('question', 'answer', 30, 2, 10)

ON CONFLICT (from_type, to_type) DO NOTHING;

-- Verify
SELECT
    COUNT(*) as total_lines,
    COUNT(CASE WHEN requires_youtube_topic = true THEN 1 END) as youtube_lines
FROM chat_lines;
