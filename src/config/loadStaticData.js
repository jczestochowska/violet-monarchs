const fs = require('fs');
const { parse } = require('csv-parse/sync');
const env = require('./env');
const { normalizeText } = require('../utils/normalizeText');

// Not a real puzzle answer typed anywhere — inserted automatically the
// moment a guest picks their name, so the leaderboard has a "who got here
// first" column matching Enigme 1 (the gate password, checked separately).
const LOGIN_PUZZLE_ID = 'ENTER';
const GRID_SIZE = 5;
const NAME_COLUMN = 'Nom si initiale';
const ANSWER_PREFIX = 'Answer';

/**
 * Parses data/guest_list_final.csv (output of scripts/database_generation.py):
 * one row per guest, "Nom si initiale" as their unique display/login name,
 * and one "Answer<PUZZLE_ID>" column per puzzle (e.g. AnswerVOLCANO -> VOLCANO).
 * Guests missing a given Answer column/value simply have no entry for that
 * puzzle (e.g. the couple don't take part in the table-based puzzles).
 */
function loadGuestList() {
  const raw = fs.readFileSync(env.GUEST_LIST_CSV, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  if (records.length === 0) {
    throw new Error(`Aucun invité trouvé dans ${env.GUEST_LIST_CSV}`);
  }

  const answerColumns = Object.keys(records[0]).filter((col) => col.startsWith(ANSWER_PREFIX));
  const puzzleIds = [LOGIN_PUZZLE_ID, ...answerColumns.map((col) => col.slice(ANSWER_PREFIX.length))];

  const guests = [];
  const solutionsByUser = new Map();

  for (const row of records) {
    const name = row[NAME_COLUMN];
    if (!name) continue;
    guests.push(name);

    const solutions = new Map();
    for (const column of answerColumns) {
      const puzzleId = column.slice(ANSWER_PREFIX.length);
      const solution = normalizeText(row[column]);
      if (solution) solutions.set(puzzleId, solution);
    }
    solutionsByUser.set(name, solutions);
  }

  if (new Set(guests).size !== guests.length) {
    throw new Error(
      `${env.GUEST_LIST_CSV}: la colonne "${NAME_COLUMN}" doit être unique pour chaque invité (utilisée comme identifiant de connexion).`
    );
  }

  return { guests, solutionsByUser, puzzleIds };
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
  const { guests, solutionsByUser, puzzleIds } = loadGuestList();
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
