const db = require('./connection');

const stmts = {
  insertUserState: db.prepare(
    'INSERT OR IGNORE INTO user_state (user_name, logged_in_at) VALUES (?, ?)'
  ),
  getClaimedUserNames: db.prepare('SELECT user_name FROM user_state'),
  insertPuzzleProgress: db.prepare(
    'INSERT OR IGNORE INTO puzzle_progress (user_name, puzzle_id, solved_at) VALUES (?, ?, ?)'
  ),
  getPuzzleProgressForUser: db.prepare(
    'SELECT puzzle_id, solved_at FROM puzzle_progress WHERE user_name = ?'
  ),
  getAllPuzzleProgress: db.prepare(
    'SELECT user_name, puzzle_id, solved_at FROM puzzle_progress'
  ),
  hasPuzzleSolved: db.prepare(
    'SELECT 1 FROM puzzle_progress WHERE user_name = ? AND puzzle_id = ?'
  ),
  getBingoProgressForUser: db.prepare(
    'SELECT cell_id, solved_at, submitted_name, photo_path FROM bingo_progress WHERE user_name = ?'
  ),
  getAllBingoProgress: db.prepare(
    'SELECT user_name, cell_id, solved_at, submitted_name, photo_path FROM bingo_progress'
  ),
  hasBingoCellSolved: db.prepare(
    'SELECT 1 FROM bingo_progress WHERE user_name = ? AND cell_id = ?'
  ),
  insertBingoProgress: db.prepare(
    `INSERT INTO bingo_progress (user_name, cell_id, solved_at, submitted_name, photo_path)
     VALUES (?, ?, ?, ?, ?)`
  ),
  insertLineCelebrated: db.prepare(
    'INSERT OR IGNORE INTO bingo_lines_celebrated (user_name, line_id, celebrated_at) VALUES (?, ?, ?)'
  ),
  getMemoryUnlock: db.prepare('SELECT 1 FROM memory_unlocks WHERE user_name = ?'),
  insertMemoryUnlock: db.prepare(
    'INSERT OR IGNORE INTO memory_unlocks (user_name, unlocked_at) VALUES (?, ?)'
  ),
  deleteUserState: db.prepare('DELETE FROM user_state WHERE user_name = ?'),
  deletePuzzleProgress: db.prepare('DELETE FROM puzzle_progress WHERE user_name = ?'),
  deleteBingoProgress: db.prepare('DELETE FROM bingo_progress WHERE user_name = ?'),
  deleteLinesCelebrated: db.prepare('DELETE FROM bingo_lines_celebrated WHERE user_name = ?'),
  deleteMemoryUnlock: db.prepare('DELETE FROM memory_unlocks WHERE user_name = ?'),
  getMemoryWordsFound: db.prepare('SELECT word_id FROM memory_word_progress WHERE user_name = ?'),
  insertMemoryWordFound: db.prepare(
    'INSERT OR IGNORE INTO memory_word_progress (user_name, word_id, found_at) VALUES (?, ?, ?)'
  ),
  deleteMemoryWordProgress: db.prepare('DELETE FROM memory_word_progress WHERE user_name = ?'),
  getOsintStage: db.prepare('SELECT stage FROM osint_progress WHERE user_name = ?'),
  upsertOsintStage: db.prepare(
    `INSERT INTO osint_progress (user_name, stage, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_name) DO UPDATE SET stage = excluded.stage, updated_at = excluded.updated_at`
  ),
  deleteOsintProgress: db.prepare('DELETE FROM osint_progress WHERE user_name = ?'),
  deletePuzzleSolve: db.prepare('DELETE FROM puzzle_progress WHERE user_name = ? AND puzzle_id = ?'),
  insertPuzzleBlock: db.prepare(
    'INSERT OR IGNORE INTO puzzle_blocks (user_name, puzzle_id, blocked_at) VALUES (?, ?, ?)'
  ),
  deletePuzzleBlock: db.prepare('DELETE FROM puzzle_blocks WHERE user_name = ? AND puzzle_id = ?'),
  getBlocksForUser: db.prepare('SELECT puzzle_id FROM puzzle_blocks WHERE user_name = ?'),
  getAllPuzzleBlocks: db.prepare('SELECT user_name, puzzle_id FROM puzzle_blocks'),
  deletePuzzleBlocksForUser: db.prepare('DELETE FROM puzzle_blocks WHERE user_name = ?'),
  insertHelpMessage: db.prepare(
    'INSERT INTO help_messages (user_name, message, created_at) VALUES (?, ?, ?)'
  ),
  getHelpMessages: db.prepare(
    'SELECT id, user_name, message, created_at FROM help_messages ORDER BY id DESC'
  ),
  getAllSessions: db.prepare('SELECT sid, sess FROM sessions'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE sid = ?'),
};

/**
 * Atomically claims userName for login, if nobody already has. Returns
 * true if this call actually claimed it, false if it was already taken
 * (user_name is the PRIMARY KEY of user_state, so this is race-safe even
 * across two near-simultaneous requests — whichever's INSERT lands first
 * wins, the other gets changes === 0).
 */
function markLogin(userName, timestamp, loginPuzzleId) {
  const claim = db.transaction((user, ts, puzzleId) => {
    const result = stmts.insertUserState.run(user, ts);
    if (result.changes === 0) return false;
    stmts.insertPuzzleProgress.run(user, puzzleId, ts);
    return true;
  });
  return claim(userName, timestamp, loginPuzzleId);
}

function getClaimedUserNames() {
  return new Set(stmts.getClaimedUserNames.all().map((row) => row.user_name));
}

function getPuzzleProgress(userName) {
  const rows = stmts.getPuzzleProgressForUser.all(userName);
  const progress = new Map();
  for (const row of rows) progress.set(row.puzzle_id, row.solved_at);
  return progress;
}

function getAllPuzzleProgress() {
  const rows = stmts.getAllPuzzleProgress.all();
  const progressByUser = new Map();
  for (const row of rows) {
    if (!progressByUser.has(row.user_name)) progressByUser.set(row.user_name, new Map());
    progressByUser.get(row.user_name).set(row.puzzle_id, row.solved_at);
  }
  return progressByUser;
}

function isPuzzleSolved(userName, puzzleId) {
  return Boolean(stmts.hasPuzzleSolved.get(userName, puzzleId));
}

function recordPuzzleSolve(userName, puzzleId, timestamp) {
  stmts.insertPuzzleProgress.run(userName, puzzleId, timestamp);
}

function removePuzzleSolve(userName, puzzleId) {
  stmts.deletePuzzleSolve.run(userName, puzzleId);
}

/**
 * Blocks a guest from ever solving puzzleId: any existing solve is removed in
 * the same transaction so the leaderboard/ranking drop it immediately.
 */
function blockPuzzle(userName, puzzleId, timestamp) {
  db.transaction(() => {
    stmts.deletePuzzleSolve.run(userName, puzzleId);
    stmts.insertPuzzleBlock.run(userName, puzzleId, timestamp);
  })();
}

function unblockPuzzle(userName, puzzleId) {
  stmts.deletePuzzleBlock.run(userName, puzzleId);
}

function getBlockedPuzzles(userName) {
  return new Set(stmts.getBlocksForUser.all(userName).map((row) => row.puzzle_id));
}

function getAllPuzzleBlocks() {
  const blocksByUser = new Map();
  for (const row of stmts.getAllPuzzleBlocks.all()) {
    if (!blocksByUser.has(row.user_name)) blocksByUser.set(row.user_name, new Set());
    blocksByUser.get(row.user_name).add(row.puzzle_id);
  }
  return blocksByUser;
}

function addHelpMessage(userName, message, timestamp) {
  stmts.insertHelpMessage.run(userName, message, timestamp);
}

function getHelpMessages() {
  return stmts.getHelpMessages.all();
}

function getBingoProgress(userName) {
  const rows = stmts.getBingoProgressForUser.all(userName);
  const progress = new Map();
  for (const row of rows) {
    progress.set(row.cell_id, {
      solvedAt: row.solved_at,
      submittedName: row.submitted_name,
      photoPath: row.photo_path,
    });
  }
  return progress;
}

function getAllBingoProgress() {
  const progressByUser = new Map();
  for (const row of stmts.getAllBingoProgress.all()) {
    if (!progressByUser.has(row.user_name)) progressByUser.set(row.user_name, new Map());
    progressByUser.get(row.user_name).set(row.cell_id, {
      solvedAt: row.solved_at,
      submittedName: row.submitted_name,
      photoPath: row.photo_path,
    });
  }
  return progressByUser;
}

function isBingoCellSolved(userName, cellId) {
  return Boolean(stmts.hasBingoCellSolved.get(userName, cellId));
}

function recordBingoSolve(userName, cellId, timestamp, submittedName, photoPath) {
  stmts.insertBingoProgress.run(userName, cellId, timestamp, submittedName, photoPath);
}

function recordLinesCelebrated(userName, lineIds, timestamp) {
  const insertMany = db.transaction((user, ids, ts) => {
    for (const lineId of ids) stmts.insertLineCelebrated.run(user, lineId, ts);
  });
  insertMany(userName, lineIds, timestamp);
}

function isMemoryUnlocked(userName) {
  return Boolean(stmts.getMemoryUnlock.get(userName));
}

function unlockMemory(userName, timestamp) {
  stmts.insertMemoryUnlock.run(userName, timestamp);
}

function getMemoryWordsFound(userName) {
  return new Set(stmts.getMemoryWordsFound.all(userName).map((row) => row.word_id));
}

function recordMemoryWordFound(userName, wordId, timestamp) {
  stmts.insertMemoryWordFound.run(userName, wordId, timestamp);
}

/** Number of photos revealed so far in the "Où sont les mariés ?" hunt (1 by default). */
function getOsintStage(userName) {
  const row = stmts.getOsintStage.get(userName);
  return row ? row.stage : 1;
}

function setOsintStage(userName, stage, timestamp) {
  stmts.upsertOsintStage.run(userName, stage, timestamp);
}

/**
 * Frees a guest name so it can be claimed again from the login dropdown —
 * used by the admin panel when someone picked the wrong name by mistake.
 * Wipes every trace of that identity's progress (it belonged to a mistaken
 * claim, not a real guest) and kicks out any browser currently holding a
 * session under that name, so the mistaken user is sent back to /login too.
 */
function deleteUserCompletely(userName) {
  const wipe = db.transaction((user) => {
    stmts.deleteUserState.run(user);
    stmts.deletePuzzleProgress.run(user);
    stmts.deleteBingoProgress.run(user);
    stmts.deleteLinesCelebrated.run(user);
    stmts.deleteMemoryUnlock.run(user);
    stmts.deleteMemoryWordProgress.run(user);
    stmts.deleteOsintProgress.run(user);
    stmts.deletePuzzleBlocksForUser.run(user);

    for (const row of stmts.getAllSessions.all()) {
      let sess;
      try {
        sess = JSON.parse(row.sess);
      } catch (err) {
        continue;
      }
      if (sess.userName === user) {
        stmts.deleteSession.run(row.sid);
      }
    }
  });
  wipe(userName);
}

module.exports = {
  markLogin,
  getClaimedUserNames,
  getPuzzleProgress,
  getAllPuzzleProgress,
  isPuzzleSolved,
  recordPuzzleSolve,
  removePuzzleSolve,
  blockPuzzle,
  unblockPuzzle,
  getBlockedPuzzles,
  getAllPuzzleBlocks,
  addHelpMessage,
  getHelpMessages,
  getBingoProgress,
  getAllBingoProgress,
  isBingoCellSolved,
  recordBingoSolve,
  recordLinesCelebrated,
  isMemoryUnlocked,
  unlockMemory,
  getMemoryWordsFound,
  recordMemoryWordFound,
  getOsintStage,
  setOsintStage,
  deleteUserCompletely,
};
