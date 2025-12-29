/**
 * Admin Conversation Routes
 * For viewing and comparing AI conversations
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const YouTubeConversationService = require('../services/youtube-conversation-service');

const conversationService = new YouTubeConversationService();

/**
 * GET /api/admin/users
 * Get all users for admin selection
 */
router.get('/users', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                u.id,
                u.email,
                u.username,
                u.created_at,
                COUNT(DISTINCT tp.id) as team_size
            FROM users u
            LEFT JOIN team_positions tp ON u.id = tp.user_id AND tp.is_active = true
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            users: result.rows
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/conversation/base/:id
 * Get base AI conversation by ID
 */
router.get('/conversation/base/:id', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                bc.id,
                bc.topic_id,
                bc.youtube_video_id as "youtubeVideoId",
                bc.conversation_data as "conversationData",
                bc.total_comments as "totalComments",
                bc.generated_at as "generatedAt",
                bc.ai_model as "aiModel",
                bc.generation_cost_usd as "generationCost",
                bc.generation_duration_ms as "generationDuration"
            FROM youtube_base_conversations bc
            WHERE bc.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({
            success: true,
            conversation: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching base conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

/**
 * GET /api/admin/conversation/user/:conversationId/:userId
 * Get or generate user's personalized conversation
 */
router.get('/conversation/user/:conversationId/:userId', async (req, res) => {
    try {
        const { conversationId, userId } = req.params;

        // Check if user already has a personalized version
        const existingResult = await db.query(`
            SELECT
                uc.id,
                uc.base_conversation_id as "baseConversationId",
                uc.topic_id as "topicId",
                uc.assigned_chatlings as "assignedChatlings",
                uc.customized_content as "customizedContent",
                uc.glow_impact as "glowImpact",
                uc.total_glow_change as "totalGlowChange",
                uc.viewed_at as "viewedAt",
                bc.youtube_video_id as "youtubeVideoId"
            FROM user_youtube_conversations uc
            JOIN youtube_base_conversations bc ON uc.base_conversation_id = bc.id
            WHERE uc.user_id = $1 AND uc.base_conversation_id = $2
        `, [userId, conversationId]);

        if (existingResult.rows.length > 0) {
            return res.json({
                success: true,
                conversation: existingResult.rows[0],
                fromCache: true
            });
        }

        // Generate new personalized conversation
        const baseConvResult = await db.query(`
            SELECT
                bc.id,
                bc.topic_id,
                bc.youtube_video_id,
                bc.conversation_data
            FROM youtube_base_conversations bc
            WHERE bc.id = $1
        `, [conversationId]);

        if (baseConvResult.rows.length === 0) {
            return res.status(404).json({ error: 'Base conversation not found' });
        }

        const baseConv = baseConvResult.rows[0];

        // Get user's attitude
        const attitudeResult = await db.query(
            `SELECT * FROM user_chat_attitudes WHERE user_id = $1`,
            [userId]
        );

        const attitude = attitudeResult.rows.length > 0
            ? attitudeResult.rows[0]
            : {
                enthusiasm_level: 5,
                criticism_level: 5,
                humor_level: 5,
                attitude_type: 'balanced'
            };

        // Customize conversation
        const customized = await conversationService.customizer.customizeConversation(
            baseConv,
            { id: userId },
            attitude
        );

        // Store personalized version
        const insertResult = await db.query(`
            INSERT INTO user_youtube_conversations (
                user_id,
                base_conversation_id,
                topic_id,
                assigned_chatlings,
                customized_content,
                glow_impact,
                total_glow_change
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [
            userId,
            conversationId,
            baseConv.topic_id,
            JSON.stringify(customized.assignedChatlings),
            JSON.stringify(customized.customizedContent),
            JSON.stringify(customized.glowImpact),
            customized.totalGlowChange
        ]);

        res.json({
            success: true,
            conversation: {
                id: insertResult.rows[0].id,
                baseConversationId: conversationId,
                topicId: baseConv.topic_id,
                youtubeVideoId: baseConv.youtube_video_id,
                assignedChatlings: customized.assignedChatlings,
                customizedContent: customized.customizedContent,
                glowImpact: customized.glowImpact,
                totalGlowChange: customized.totalGlowChange,
                viewedAt: new Date()
            },
            fromCache: false
        });

    } catch (error) {
        console.error('Error getting user conversation:', error);
        res.status(500).json({
            error: 'Failed to get user conversation',
            message: error.message
        });
    }
});

module.exports = router;
