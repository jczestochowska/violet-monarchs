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

module.exports = {
  markLogin,
  getClaimedUserNames,
  getPuzzleProgress,
  getAllPuzzleProgress,
  isPuzzleSolved,
  recordPuzzleSolve,
  getBingoProgress,
  isBingoCellSolved,
  recordBingoSolve,
  recordLinesCelebrated,
};
