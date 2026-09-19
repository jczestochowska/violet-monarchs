// Wipes all runtime/game state (logins, puzzle progress, bingo progress,
// uploaded selfies) so you can replay the full guest journey from scratch.
// Does NOT touch guests.csv / puzzles.csv / bingo-cells.json.
//
// Stop the server before running this — the sqlite files must not be open.
//
// Usage: npm run reset-state

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const dbFiles = ['state.sqlite3', 'state.sqlite3-wal', 'state.sqlite3-shm'].map((f) =>
  path.join(DATA_DIR, f)
);

for (const file of dbFiles) {
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`Supprimé: ${path.relative(process.cwd(), file)}`);
  }
}

if (fs.existsSync(UPLOADS_DIR)) {
  for (const entry of fs.readdirSync(UPLOADS_DIR)) {
    fs.rmSync(path.join(UPLOADS_DIR, entry), { recursive: true, force: true });
  }
  console.log('Vidé: data/uploads/');
}

console.log('État réinitialisé. Les cookies de session existants seront ignorés au prochain démarrage du serveur.');
