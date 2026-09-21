const staticData = require('../config/staticData');
const repository = require('../db/repository');
const { normalizeText } = require('../utils/normalizeText');

const { solutionsByUser, puzzleIds } = staticData;

function getPuzzleIds() {
  return puzzleIds;
}

/**
 * Guests type one answer into a single box (no puzzle picker) — figure out
 * for ourselves which of this user's still-unsolved puzzles it solves, if
 * any. Comparison is case- and accent-insensitive (see normalizeText).
 * @returns {{correct: boolean, puzzleId: string|null, solvedAt: string|null}}
 */
function attemptSolveAny(userName, answer) {
  const normalizedAnswer = normalizeText(answer);
  if (!normalizedAnswer) {
    return { correct: false, puzzleId: null, solvedAt: null };
  }

  const userSolutions = solutionsByUser.get(userName);
  if (!userSolutions) {
    return { correct: false, puzzleId: null, solvedAt: null };
  }

  const alreadySolved = repository.getPuzzleProgress(userName);
  // Puzzles an admin blocked for this guest (suspected cheating) can never be
  // solved again, even with the right answer.
  const blocked = repository.getBlockedPuzzles(userName);

  for (const [puzzleId, expected] of userSolutions) {
    // OSINT is solved through the photo hunt (osintService), so its old
    // answer typed here must not do anything.
    if (puzzleId === staticData.OSINT_PUZZLE_ID) continue;
    if (alreadySolved.has(puzzleId) || blocked.has(puzzleId)) continue;
    if (expected === normalizedAnswer) {
      const solvedAt = new Date().toISOString();
      repository.recordPuzzleSolve(userName, puzzleId, solvedAt);
      return { correct: true, puzzleId, solvedAt };
    }
  }

  return { correct: false, puzzleId: null, solvedAt: null };
}

module.exports = { getPuzzleIds, attemptSolveAny };
