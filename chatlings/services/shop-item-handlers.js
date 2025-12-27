/**
 * Shop Item Handlers
 * Each purchase type has its own handler function
 * This keeps the purchase logic organized and scalable
 */

/**
 * Avatar Reset Handler
 * - Deletes avatar generation queue
 * - KEEPS the current picked avatar (it's copied to [userId]_picked.png)
 * - Allows user to generate 9 new options
 * - Sends notification
 */
async function handleAvatarReset(client, userId, item) {
  // Delete any existing avatar queue item
  await client.query(`
    DELETE FROM avatar_generation_queue WHERE user_id = $1
  `, [userId]);

  // Note: We do NOT delete the picked avatar file
  // The picked avatar is stored as [userId]_picked.png
  // The new generation will create [userId]_1.png through [userId]_9.png
  // So the current picked avatar remains safe

  // Clear the avatar_selected_number since it's no longer relevant
  // (the new generation will have different images in positions 1-9)
  await client.query(`
    UPDATE users
    SET avatar_selected_number = NULL
    WHERE id = $1
  `, [userId]);

  // Send notification
  await client.query(`
    INSERT INTO notifications (user_id, notification_type, title, message, link, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
  `, [
    userId,
    'avatar_ready',
    '🎨 Avatar Reset Complete',
    'Your avatar has been reset. You can now create a new one!',
    '/user/avatar-create.html'
  ]);

  return {
    success: true,
    message: 'You can now create a new avatar from your account menu!'
  };
}

/**
 * Example: Motes Pack Handler (for future use)
 */
async function handleMotesPack(client, userId, item) {
  // Parse metadata to get how many motes to add
  const motesToAdd = item.metadata?.motes_amount || 1000;

  await client.query(`
    UPDATE users SET motes = motes + $1 WHERE id = $2
  `, [motesToAdd, userId]);

  return {
    success: true,
    message: `You received ${motesToAdd.toLocaleString()} Motes!`
  };
}

/**
 * Example: Premium Subscription Handler (for future use)
 */
async function handlePremiumSubscription(client, userId, item) {
  // Add premium status with expiry date
  const durationDays = item.metadata?.duration_days || 30;

  await client.query(`
    UPDATE users
    SET premium_until = NOW() + INTERVAL '${durationDays} days'
    WHERE id = $1
  `, [userId]);

  return {
    success: true,
    message: `You now have ${durationDays} days of Premium access!`
  };
}

/**
 * Main handler dispatcher
 * Routes to the appropriate handler based on item_type
 */
async function handlePurchase(client, userId, item) {
  const handlers = {
    'avatar_reset': handleAvatarReset,
    'motes_pack': handleMotesPack,
    'premium': handlePremiumSubscription,
    // Add new handlers here as you add new shop items
  };

  const handler = handlers[item.item_type];

  if (!handler) {
    console.warn(`No handler found for item type: ${item.item_type}`);
    return {
      success: true,
      message: 'Purchase completed successfully!'
    };
  }

  return await handler(client, userId, item);
}

module.exports = {
  handlePurchase,
  handleAvatarReset,
  handleMotesPack,
  handlePremiumSubscription
};
