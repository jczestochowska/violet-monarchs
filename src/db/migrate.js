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
  `);
}

module.exports = migrate;
