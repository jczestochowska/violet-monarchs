const staticData = require('../config/staticData');
const repository = require('../db/repository');
const { normalizeText } = require('../utils/normalizeText');

// Secret keyword, independent of the regular per-user puzzle solutions:
// typing it in the puzzle answer box unlocks the "Souvenirs d'Islande"
// section on the home page instead of solving a puzzle.
const SECRET_KEYWORD = normalizeText('Islande');

const memoryWordsByNormalizedText = new Map(
  staticData.memoryWords.map((word) => [word.normalizedWord, word])
);

function isUnlocked(userName) {
  return repository.isMemoryUnlocked(userName);
}

/**
 * @returns {boolean} true if `answer` is the secret keyword (whether or not
 * this is the first time), so the caller can reveal the section either way.
 */
function attemptUnlock(userName, answer) {
  if (normalizeText(answer) !== SECRET_KEYWORD) return false;
  if (!repository.isMemoryUnlocked(userName)) {
    repository.unlockMemory(userName, new Date().toISOString());
  }
  return true;
}

/**
 * Checks `text` (entered in the dedicated "Souvenirs d'Islande" box, not the
 * main puzzle box) against the memory-grid word list. On a match, records it
 * as found for this guest (first time only) and returns the cells it fills
 * in — the same cells every time, whether or not this is the first find, so
 * the caller can just redraw them.
 * @returns {Array<{row:number,col:number,letter:string}>}
 */
function attemptFindWord(userName, text) {
  const word = memoryWordsByNormalizedText.get(normalizeText(text));
  if (!word) return [];

  const found = repository.getMemoryWordsFound(userName);
  if (!found.has(word.id)) {
    repository.recordMemoryWordFound(userName, word.id, new Date().toISOString());
  }
  return word.cells;
}

/**
 * All grid cells revealed so far for this guest, across every word they've
 * found — what the memory grid should show on page load/refresh.
 */
function getRevealedCells(userName) {
  const found = repository.getMemoryWordsFound(userName);
  const cells = [];
  for (const word of staticData.memoryWords) {
    if (found.has(word.id)) cells.push(...word.cells);
  }
  return cells;
}

module.exports = { isUnlocked, attemptUnlock, attemptFindWord, getRevealedCells };
