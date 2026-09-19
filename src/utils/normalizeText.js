// Case- and accent-insensitive comparison for French text: "château"/"CHATEAU"/
// "chateau" and "gaïa"/"gaia" must all be treated as equal.
// U+0300-U+036F is the Unicode "Combining Diacritical Marks" block that
// NFD decomposition splits accented letters into (e.g. "é" -> "e" + U+0301).
const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizeText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .trim()
    .toLowerCase();
}

module.exports = { normalizeText };
