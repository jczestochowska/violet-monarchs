require('dotenv').config();
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

module.exports = {
  PORT: process.env.PORT || 3000,
  // Entered on the very first page, before guests even pick their name —
  // same for everyone, gates access to the site at all. The second
  // "personal password" step (name + password) is NOT here: it's each
  // guest's answer to puzzle E1, read from data/puzzles.csv.
  GLOBAL_PASSWORD: (process.env.GLOBAL_PASSWORD || '').trim(),
  SESSION_SECRET: process.env.SESSION_SECRET || 'insecure-dev-secret',
  ROOT_DIR,
  DATA_DIR,
  GUESTS_CSV: path.join(DATA_DIR, 'guests.csv'),
  PUZZLES_CSV: path.join(DATA_DIR, 'puzzles.csv'),
  BINGO_CELLS_JSON: path.join(DATA_DIR, 'bingo-cells.json'),
  STATE_DB: path.join(DATA_DIR, 'state.sqlite3'),
  UPLOADS_DIR: path.join(DATA_DIR, 'uploads'),
};
