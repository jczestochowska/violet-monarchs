const repository = require('../db/repository');
const puzzleService = require('./puzzleService');

const MEDAL_RANKS = ['gold', 'silver', 'bronze'];

/**
 * For each puzzle, who was 1st/2nd/3rd to solve it: { [puzzleId]: { [user]: 'gold'|'silver'|'bronze' } }
 */
function computeMedals(rows, puzzleIds) {
  const medalsByPuzzle = {};
  for (const puzzleId of puzzleIds) {
    const solvers = rows
      .filter((r) => r.solves[puzzleId])
      .sort((a, b) => (a.solves[puzzleId] < b.solves[puzzleId] ? -1 : 1));

    const medalsForPuzzle = {};
    solvers.slice(0, MEDAL_RANKS.length).forEach((r, index) => {
      medalsForPuzzle[r.user] = MEDAL_RANKS[index];
    });
    medalsByPuzzle[puzzleId] = medalsForPuzzle;
  }
  return medalsByPuzzle;
}

/**
 * Ranking rule: most puzzles solved first; ties broken by whoever reached
 * that count soonest (their latest solve timestamp, ascending).
 *
 * Only guests who have actually entered the site appear at all — most of
 * the wedding's guest list won't play, so there's no point listing everyone
 * from the start. "Entered" == has any puzzle_progress row at all, which is
 * guaranteed the moment they log in (that's when ENTER gets recorded).
 */
function computeLeaderboard() {
  const puzzleIds = puzzleService.getPuzzleIds();
  const allProgress = repository.getAllPuzzleProgress();

  const rows = [...allProgress.keys()].map((user) => {
    const progress = allProgress.get(user);
    const solves = {};
    let solvedCount = 0;
    let latestTimestamp = null;

    for (const puzzleId of puzzleIds) {
      const ts = progress.get(puzzleId) || null;
      solves[puzzleId] = ts;
      if (ts) {
        solvedCount += 1;
        if (!latestTimestamp || ts > latestTimestamp) latestTimestamp = ts;
      }
    }

    return { user, solves, solvedCount, latestTimestamp };
  });

  const rankedOrder = [...rows]
    .sort((a, b) => {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      if (a.latestTimestamp === b.latestTimestamp) return a.user.localeCompare(b.user);
      if (!a.latestTimestamp) return 1;
      if (!b.latestTimestamp) return -1;
      return a.latestTimestamp < b.latestTimestamp ? -1 : 1;
    })
    .map((r) => r.user);

  const medalsByPuzzle = computeMedals(rows, puzzleIds);

  return { puzzleIds, rows, rankedOrder, medalsByPuzzle };
}

module.exports = { computeLeaderboard };
