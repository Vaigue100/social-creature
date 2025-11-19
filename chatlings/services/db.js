/**
 * Database connection module
 * Provides a simple query interface
 */

const { Client } = require('pg');
const config = require('../scripts/db-config');

const db = {
  async query(text, params) {
    const client = new Client({ ...config, database: 'chatlings' });
    try {
      await client.connect();
      const result = await client.query(text, params);
      return result;
    } finally {
      await client.end();
    }
  }
};

module.exports = db;
