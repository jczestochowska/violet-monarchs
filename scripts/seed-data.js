// Copies the example config files from data-templates/ into data/ (which is
// gitignored) so there's something to run against on a fresh checkout.
// Skips files that already exist unless --force is passed, so this is safe
// to re-run without clobbering real guest/puzzle/bingo data.
//
// Usage: npm run seed-data [-- --force]

const fs = require('fs');
const path = require('path');

const force = process.argv.includes('--force');
const TEMPLATES_DIR = path.join(__dirname, '..', 'data-templates');
const DATA_DIR = path.join(__dirname, '..', 'data');

const files = [
  ['guests.example.csv', 'guests.csv'],
  ['puzzles.example.csv', 'puzzles.csv'],
  ['bingo-cells.example.json', 'bingo-cells.json'],
];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

for (const [templateName, destName] of files) {
  const dest = path.join(DATA_DIR, destName);
  if (fs.existsSync(dest) && !force) {
    console.log(`Ignoré (existe déjà): data/${destName}`);
    continue;
  }
  fs.copyFileSync(path.join(TEMPLATES_DIR, templateName), dest);
  console.log(`Copié: data/${destName}`);
}
