require('dotenv').config();
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

module.exports = {
  PORT: process.env.PORT || 3000,
  // Entered on the one gate page before guests even pick their name — same
  // for everyone, gates access to the site at all (== ANSWER_ENTER in
  // scripts/database_generation.py).
  GLOBAL_PASSWORD: (process.env.GLOBAL_PASSWORD || '').trim(),
  // Gates /admin, where a wrong name pick can be undone (see routes/admin.js).
  ADMIN_PASSWORD: (process.env.ADMIN_PASSWORD || '').trim(),
  SESSION_SECRET: process.env.SESSION_SECRET || 'insecure-dev-secret',
  ROOT_DIR,
  DATA_DIR,
  // Output of scripts/database_generation.py: one row per guest, with
  // "Nom si initiale" as their unique display/login name and one "Answer*"
  // column per puzzle.
  GUEST_LIST_CSV: path.join(DATA_DIR, 'guest_list_final.csv'),
  BINGO_CELLS_JSON: path.join(DATA_DIR, 'bingo-cells.json'),
  // Answer key for the "Souvenirs d'Islande" memory grid (see
  // config/loadStaticData.js#loadMemoryWords).
  MEMORY_GRID_CSV: path.join(DATA_DIR, 'GridMemory.csv'),
  MEMORY_WORDS_CSV: path.join(DATA_DIR, 'MemoryWords.csv'),
  STATE_DB: path.join(DATA_DIR, 'state.sqlite3'),
  UPLOADS_DIR: path.join(DATA_DIR, 'uploads'),
};
