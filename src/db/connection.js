const fs = require('fs');
const Database = require('better-sqlite3');
const env = require('../config/env');

fs.mkdirSync(env.DATA_DIR, { recursive: true });

const db = new Database(env.STATE_DB);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
