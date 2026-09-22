const staticData = require('../config/staticData');
const repository = require('../db/repository');
const { normalizeText } = require('../utils/normalizeText');

// "Où sont les mariés ?": three photos, only the first one visible at the
// start. KEYWORDS[i] is the one-word place name of photo i + 1; finding it
// reveals photo i + 2, and the last one completes the OSINT puzzle. Stays
// server-side so the answers never reach the browser.
const KEYWORDS = ['canard', 'Boulingrin', 'Carmes'].map(normalizeText);
const PHOTO_COUNT = KEYWORDS.length;

// Near-miss answers that deserve an encouraging nudge instead of a flat
// "wrong answer" — the guest has clearly found the right spot, just not
// under the exact word we're expecting. Keyed by the stage they apply to.
const NEAR_MISS_HINTS = new Map([
  [
    2,
    {
      match: normalizeText('Grand Rond'),
      message: "Tu y es presque, mais la réponse tient en un seul mot !",
    },
  ],
]);

function getStage(userName) {
  return repository.getOsintStage(userName);
}

/**
 * Only the keyword of the newest revealed photo counts: typing an earlier
 * one again, or a later one early, is just a wrong answer.
 * @returns {{result: 'wrong'|'advanced'|'solved'|'hint', stage: number, message?: string}}
 */
function attempt(userName, text) {
  const stage = getStage(userName);
  const normalizedText = normalizeText(text);

  const hint = NEAR_MISS_HINTS.get(stage);
  if (hint && normalizedText === hint.match) {
    return { result: 'hint', stage, message: hint.message };
  }

  if (normalizedText !== KEYWORDS[stage - 1]) return { result: 'wrong', stage };

  const now = new Date().toISOString();

  if (stage < PHOTO_COUNT) {
    repository.setOsintStage(userName, stage + 1, now);
    return { result: 'advanced', stage: stage + 1 };
  }

  // Last keyword: same rules as a regular puzzle — an admin block is final,
  // and re-typing it after an admin removed the solve simply records it again.
  const puzzleId = staticData.OSINT_PUZZLE_ID;
  if (repository.getBlockedPuzzles(userName).has(puzzleId)) return { result: 'wrong', stage };
  if (!repository.isPuzzleSolved(userName, puzzleId)) {
    repository.recordPuzzleSolve(userName, puzzleId, now);
  }
  return { result: 'solved', stage };
}

function isSolved(userName) {
  return repository.isPuzzleSolved(userName, staticData.OSINT_PUZZLE_ID);
}

module.exports = { PHOTO_COUNT, getStage, isSolved, attempt };
