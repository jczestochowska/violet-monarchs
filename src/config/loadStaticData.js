const fs = require('fs');
const { parse } = require('csv-parse/sync');
const env = require('./env');
const { normalizeText } = require('../utils/normalizeText');

const LOGIN_PUZZLE_ID = 'E1';
const GRID_SIZE = 5;

function loadGuests() {
  const raw = fs.readFileSync(env.GUESTS_CSV, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  const guests = records.map((r) => r.name).filter(Boolean);
  if (guests.length === 0) {
    throw new Error(`Aucun invité trouvé dans ${env.GUESTS_CSV}`);
  }
  return guests;
}

function loadPuzzles() {
  const raw = fs.readFileSync(env.PUZZLES_CSV, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  const solutionsByUser = new Map();
  const puzzleIdSet = new Set();

  for (const row of records) {
    const user = row.user;
    const puzzleId = row.puzzle_id;
    const solution = normalizeText(row.solution);
    if (!user || !puzzleId || !solution) continue;

    puzzleIdSet.add(puzzleId);
    if (!solutionsByUser.has(user)) solutionsByUser.set(user, new Map());
    solutionsByUser.get(user).set(puzzleId, solution);
  }

  if (!puzzleIdSet.has(LOGIN_PUZZLE_ID)) {
    throw new Error(
      `${env.PUZZLES_CSV} doit contenir une ligne "<invité>,${LOGIN_PUZZLE_ID},<mot de passe personnel>" pour chaque invité — c'est le mot de passe personnel demandé à la connexion.`
    );
  }

  const puzzleIds = [...puzzleIdSet].sort();

  return { solutionsByUser, puzzleIds };
}

function loadBingoCells() {
  const raw = fs.readFileSync(env.BINGO_CELLS_JSON, 'utf8');
  const records = JSON.parse(raw);

  const cellsById = new Map();
  for (const cell of records) {
    if (
      typeof cell.id !== 'string' ||
      typeof cell.row !== 'number' ||
      typeof cell.col !== 'number' ||
      typeof cell.letter !== 'string' ||
      typeof cell.description !== 'string' ||
      !Array.isArray(cell.validNames)
    ) {
      throw new Error(`Case de bingo mal formée: ${JSON.stringify(cell)}`);
    }
    cellsById.set(cell.id, {
      id: cell.id,
      row: cell.row,
      col: cell.col,
      letter: cell.letter,
      description: cell.description,
      validNames: new Set(cell.validNames.map(normalizeText)),
    });
  }

  if (cellsById.size !== GRID_SIZE * GRID_SIZE) {
    throw new Error(
      `La grille de bingo doit contenir ${GRID_SIZE * GRID_SIZE} cases, ${cellsById.size} trouvées dans ${env.BINGO_CELLS_JSON}`
    );
  }
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const id = `r${row}c${col}`;
      if (!cellsById.has(id)) {
        throw new Error(`Case de bingo manquante: ${id}`);
      }
    }
  }

  return cellsById;
}

function loadStaticData() {
  const guests = loadGuests();
  const { solutionsByUser, puzzleIds } = loadPuzzles();
  const bingoCells = loadBingoCells();

  return {
    guests,
    solutionsByUser,
    puzzleIds,
    bingoCells,
    LOGIN_PUZZLE_ID,
    GRID_SIZE,
  };
}

module.exports = { loadStaticData, LOGIN_PUZZLE_ID, GRID_SIZE };
