/**
 * Chatroom Scheduler Service
 * Generates random daily chatroom schedules with advance notice
 */

const db = require('../db');
const glowCalculator = require('./glow-calculator');

class ChatroomScheduler {
  /**
   * Generate today's chatroom schedule
   * Call this at midnight each day
   */
  async generateDailySchedule(date = new Date()) {
    console.log(`Generating chatroom schedule for ${date.toDateString()}...`);

    const schedules = [];
    const numChatrooms = 3; // 3 chatrooms per day

    // Generate random time slots
    for (let i = 0; i < numChatrooms; i++) {
      const openTime = this.randomTimeSlot(date, 10, 22); // 10 AM - 10 PM

      schedules.push({
        schedule_date: this.formatDate(date),
        open_time: openTime,
        close_time: this.addHours(openTime, 1), // Open for 1 hour
        notification_time: this.subtractHours(openTime, 2), // 2 hours before
        reminder_time: this.subtractMinutes(openTime, 15), // 15 min before
        status: 'scheduled'
      });
    }

    // Sort by time
    schedules.sort((a, b) => a.open_time - b.open_time);

    // Save to database
    const savedSchedules = [];
    for (const schedule of schedules) {
      const saved = await this.saveSchedule(schedule);
      savedSchedules.push(saved);
    }

    console.log(`✅ Generated ${savedSchedules.length} chatroom schedules`);
    return savedSchedules;
  }

  /**
   * Assign video to scheduled chatroom
   */
  async assignVideoToSchedule(scheduleId, video) {
    const context = glowCalculator.analyzeVideoContext(video);
    const optimal = glowCalculator.getOptimalRanges(context);
    const hint = glowCalculator.getHint(context);

    await db.query(`
      UPDATE chatroom_schedules
      SET
        video_id = $1,
        video_title = $2,
        video_category = $3,
        video_subcategory = $4,
        video_thumbnail_url = $5,
        optimal_enthusiasm_min = $6,
        optimal_enthusiasm_max = $7,
        optimal_criticism_min = $8,
        optimal_criticism_max = $9,
        optimal_humor_min = $10,
        optimal_humor_max = $11,
        hint = $12
      WHERE id = $13
    `, [
      video.id?.videoId || video.id,
      video.snippet.title,
      context.category,
      context.subcategory,
      video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
      optimal.enthusiasm.min,
      optimal.enthusiasm.max,
      optimal.criticism.min,
      optimal.criticism.max,
      optimal.humor.min,
      optimal.humor.max,
      hint,
      scheduleId
    ]);

    console.log(`✅ Assigned video "${video.snippet.title}" to schedule ${scheduleId}`);
  }

  /**
   * Get upcoming chatrooms
   */
  async getUpcomingChatrooms() {
    const result = await db.query(`
      SELECT *
      FROM chatroom_schedules
      WHERE open_time > NOW()
        AND status IN ('scheduled', 'notified')
      ORDER BY open_time ASC
      LIMIT 10
    `);

    return result.rows;
  }

  /**
   * Get chatrooms that need notifications sent
   */
  async getChatroomsNeedingNotification() {
    const result = await db.query(`
      SELECT *
      FROM chatroom_schedules
      WHERE status = 'scheduled'
        AND notification_time <= NOW()
        AND open_time > NOW()
      ORDER BY open_time ASC
    `);

    return result.rows;
  }

  /**
   * Get chatrooms that need reminders sent
   */
  async getChatroomsNeedingReminder() {
    const result = await db.query(`
      SELECT *
      FROM chatroom_schedules
      WHERE status = 'notified'
        AND reminder_time <= NOW()
        AND open_time > NOW()
      ORDER BY open_time ASC
    `);

    return result.rows;
  }

  /**
   * Get chatrooms that should be opened now
   */
  async getChatroomsToOpen() {
    const result = await db.query(`
      SELECT *
      FROM chatroom_schedules
      WHERE status IN ('scheduled', 'notified')
        AND open_time <= NOW()
        AND close_time > NOW()
      ORDER BY open_time ASC
    `);

    return result.rows;
  }

  /**
   * Get chatrooms that should be closed now
   */
  async getChatroomsToClose() {
    const result = await db.query(`
      SELECT *
      FROM chatroom_schedules
      WHERE status = 'open'
        AND close_time <= NOW()
      ORDER BY open_time ASC
    `);

    return result.rows;
  }

  /**
   * Update chatroom status
   */
  async updateStatus(scheduleId, status) {
    await db.query(`
      UPDATE chatroom_schedules
      SET status = $1
      WHERE id = $2
    `, [status, scheduleId]);

    console.log(`Updated chatroom ${scheduleId} status to: ${status}`);
  }

  /**
   * Increment participant count
   */
  async incrementParticipantCount(scheduleId) {
    await db.query(`
      UPDATE chatroom_schedules
      SET participant_count = participant_count + 1
      WHERE id = $1
    `, [scheduleId]);
  }

  /**
   * Get active chatroom (currently open)
   */
  async getActiveChatroom() {
    const result = await db.query(`
      SELECT *
      FROM chatroom_schedules
      WHERE status = 'open'
        AND open_time <= NOW()
        AND close_time > NOW()
      ORDER BY open_time DESC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Save schedule to database
   */
  async saveSchedule(schedule) {
    const result = await db.query(`
      INSERT INTO chatroom_schedules (
        schedule_date,
        open_time,
        close_time,
        notification_time,
        reminder_time,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      schedule.schedule_date,
      schedule.open_time,
      schedule.close_time,
      schedule.notification_time,
      schedule.reminder_time,
      schedule.status
    ]);

    return result.rows[0];
  }

  /**
   * Generate random time slot within business hours
   */
  randomTimeSlot(baseDate, startHour, endHour) {
    const date = new Date(baseDate);
    date.setHours(startHour, 0, 0, 0);

    const hourRange = endHour - startHour;
    const randomHour = Math.floor(Math.random() * hourRange);
    const randomMinute = Math.random() < 0.5 ? 0 : 30; // On the hour or half past

    date.setHours(startHour + randomHour, randomMinute, 0, 0);
    return date;
  }

  /**
   * Add hours to date
   */
  addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
  }

  /**
   * Subtract hours from date
   */
  subtractHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() - hours);
    return newDate;
  }

  /**
   * Subtract minutes from date
   */
  subtractMinutes(date, minutes) {
    const newDate = new Date(date);
    newDate.setMinutes(newDate.getMinutes() - minutes);
    return newDate;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Cleanup old schedules (keep last 30 days)
   */
  async cleanupOldSchedules() {
    const result = await db.query(`
      DELETE FROM chatroom_schedules
      WHERE schedule_date < CURRENT_DATE - INTERVAL '30 days'
    `);

    console.log(`Cleaned up ${result.rowCount} old chatroom schedules`);
    return result.rowCount;
  }
}

module.exports = new ChatroomScheduler();
