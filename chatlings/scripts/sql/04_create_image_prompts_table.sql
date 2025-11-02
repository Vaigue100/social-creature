-- Create table for AI image generation prompts

\c chatlings;

CREATE TABLE IF NOT EXISTS creature_image_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    negative_prompt TEXT,
    style_tags VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(creature_id)
);

CREATE INDEX IF NOT EXISTS idx_creature_image_prompts_creature
ON creature_image_prompts(creature_id);

COMMENT ON TABLE creature_image_prompts IS 'AI image generation prompts for each creature';
COMMENT ON COLUMN creature_image_prompts.prompt_text IS 'Detailed prompt for Kaiber/Midjourney/etc';
COMMENT ON COLUMN creature_image_prompts.negative_prompt IS 'Things to avoid in generation';
COMMENT ON COLUMN creature_image_prompts.style_tags IS 'Comma-separated style tags';
