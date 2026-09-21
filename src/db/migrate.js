const db = require('./connection');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_state (
      user_name TEXT PRIMARY KEY,
      logged_in_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS puzzle_progress (
      user_name TEXT NOT NULL,
      puzzle_id TEXT NOT NULL,
      solved_at TEXT NOT NULL,
      PRIMARY KEY (user_name, puzzle_id)
    );

    CREATE TABLE IF NOT EXISTS bingo_progress (
      user_name TEXT NOT NULL,
      cell_id TEXT NOT NULL,
      solved_at TEXT NOT NULL,
      submitted_name TEXT NOT NULL,
      photo_path TEXT NOT NULL,
      PRIMARY KEY (user_name, cell_id)
    );

    CREATE TABLE IF NOT EXISTS bingo_lines_celebrated (
      user_name TEXT NOT NULL,
      line_id TEXT NOT NULL,
      celebrated_at TEXT NOT NULL,
      PRIMARY KEY (user_name, line_id)
    );

    CREATE TABLE IF NOT EXISTS memory_unlocks (
      user_name TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS puzzle_blocks (
      user_name TEXT NOT NULL,
      puzzle_id TEXT NOT NULL,
      blocked_at TEXT NOT NULL,
      PRIMARY KEY (user_name, puzzle_id)
    );

    CREATE TABLE IF NOT EXISTS help_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- "Où sont les mariés ?" photo hunt: how many photos this guest has revealed (1-3).
    CREATE TABLE IF NOT EXISTS osint_progress (
      user_name TEXT PRIMARY KEY,
      stage INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_word_progress (
      user_name TEXT NOT NULL,
      word_id TEXT NOT NULL,
      found_at TEXT NOT NULL,
      PRIMARY KEY (user_name, word_id)
    );
  `);
}

module.exports = migrate;
