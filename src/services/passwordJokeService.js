const fs = require('fs');
const env = require('../config/env');
const { normalizeText } = require('../utils/normalizeText');

// Joke reactions to guests trying classic passwords on the gate page only
// (not the puzzle answer boxes that come after it).
const JUMPSCARE_WORDS = new Set(['admin', 'root']);

const commonPasswords = new Set(
  fs
    .readFileSync(env.COMMON_PASSWORDS_TXT, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map(normalizeText)
    .filter((word) => !JUMPSCARE_WORDS.has(word))
);

/**
 * @returns {'jumpscare'|'common'|null}
 */
function classify(text) {
  const normalized = normalizeText(text);
  if (JUMPSCARE_WORDS.has(normalized)) return 'jumpscare';
  if (commonPasswords.has(normalized)) return 'common';
  return null;
}

module.exports = { classify };
