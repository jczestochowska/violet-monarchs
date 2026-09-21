const fs = require('fs');
const { parse } = require('csv-parse/sync');
const env = require('./env');
const { normalizeText } = require('../utils/normalizeText');

// Not a real puzzle answer typed anywhere — inserted automatically the
// moment a guest picks their name, so the leaderboard has a "who got here
// first" column matching Enigme 1 (the gate password, checked separately).
const LOGIN_PUZZLE_ID = 'ENTER';
// Solved through the "Où sont les mariés ?" photo hunt (services/osintService.js),
// not by typing its answer into the main box, so puzzleService skips it.
const OSINT_PUZZLE_ID = 'OSINT';
const GRID_SIZE = 5;
const NAME_COLUMN = 'Nom si initiale';
// What the login and bingo dropdowns show ("Prénom Nom"). Only a label: the
// guest's identity everywhere else (session, database, leaderboard) stays the
// NAME_COLUMN value.
const FIRST_NAME_COLUMN = 'Prénom';
const LAST_NAME_COLUMN = 'Nom';
const ANSWER_PREFIX = 'Answer';

// "Souvenirs d'Islande" memory grid: fixed 15 (wide) x 17 (tall) size.
const MEMORY_GRID_COLS = 15;
const MEMORY_GRID_ROWS = 17;

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

  for (const column of [NAME_COLUMN, FIRST_NAME_COLUMN, LAST_NAME_COLUMN]) {
    if (!(column in records[0])) {
      throw new Error(`${env.GUEST_LIST_CSV}: colonne "${column}" introuvable`);
    }
  }

  const guests = [];
  const displayNames = new Map();
  const solutionsByUser = new Map();

  for (const row of records) {
    const name = row[NAME_COLUMN];
    if (!name) continue;
    guests.push(name);
    displayNames.set(
      name,
      `${row[FIRST_NAME_COLUMN]} ${row[LAST_NAME_COLUMN]}`.replace(/\s+/g, ' ').trim() || name
    );

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

  return { guests, displayNames, solutionsByUser, puzzleIds };
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

/**
 * data/GridMemory.csv: the finished 15x17 memory grid, one letter (or empty)
 * per cell, used only to sanity-check loadMemoryWords() below at boot — the
 * app never needs the full grid at runtime, only the per-word cell lists.
 */
function loadMemoryGrid() {
  const raw = fs.readFileSync(env.MEMORY_GRID_CSV, 'utf8');
  const rows = parse(raw, { skip_empty_lines: false, relax_column_count: true });

  if (rows.length !== MEMORY_GRID_ROWS) {
    throw new Error(
      `${env.MEMORY_GRID_CSV} doit contenir ${MEMORY_GRID_ROWS} lignes, ${rows.length} trouvées`
    );
  }

  return rows.map((row, rowIndex) => {
    if (row.length !== MEMORY_GRID_COLS) {
      throw new Error(
        `${env.MEMORY_GRID_CSV}: la ligne ${rowIndex} doit contenir ${MEMORY_GRID_COLS} colonnes, ${row.length} trouvées`
      );
    }
    return row.map((cell) => (cell || '').trim().toUpperCase());
  });
}

/**
 * data/MemoryWords.csv: one row per hidden word, telling us which cells of
 * the memory grid it fills in once a guest types it into the "Souvenirs
 * d'Islande" box. dir=0 lays the word along row `line_col`, columns
 * start..end; dir=1 lays it down column `line_col`, rows start..end.
 * Cross-checked letter-by-letter against loadMemoryGrid() so a typo in
 * either file fails the boot instead of silently drawing the wrong grid.
 */
function loadMemoryWords(memoryGrid) {
  const raw = fs.readFileSync(env.MEMORY_WORDS_CSV, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  return records.map((row) => {
    const dir = Number(row.dir);
    const lineCol = Number(row.line_col);
    const start = Number(row.start);
    const end = Number(row.end);
    const letters = row.word.toUpperCase().split('');

    if (dir !== 0 && dir !== 1) {
      throw new Error(`${env.MEMORY_WORDS_CSV}: "dir" invalide pour le mot "${row.word}"`);
    }
    if (end - start + 1 !== letters.length) {
      throw new Error(
        `${env.MEMORY_WORDS_CSV}: la longueur de "${row.word}" ne correspond pas à start/end`
      );
    }

    const cells = letters.map((letter, i) => {
      const cellRow = dir === 0 ? lineCol : start + i;
      const cellCol = dir === 0 ? start + i : lineCol;

      if (
        cellRow < 0 ||
        cellRow >= MEMORY_GRID_ROWS ||
        cellCol < 0 ||
        cellCol >= MEMORY_GRID_COLS
      ) {
        throw new Error(
          `${env.MEMORY_WORDS_CSV}: "${row.word}" sort de la grille (ligne ${cellRow}, colonne ${cellCol})`
        );
      }
      if (memoryGrid[cellRow][cellCol] !== letter) {
        throw new Error(
          `${env.MEMORY_WORDS_CSV}: "${row.word}" ne correspond pas à ${env.MEMORY_GRID_CSV} ` +
            `(ligne ${cellRow}, colonne ${cellCol}: attendu "${letter}", grille contient "${memoryGrid[cellRow][cellCol]}")`
        );
      }
      return { row: cellRow, col: cellCol, letter };
    });

    return {
      id: row.id,
      normalizedWord: normalizeText(row.word),
      cells,
    };
  });
}

function loadStaticData() {
  const { guests, displayNames, solutionsByUser, puzzleIds } = loadGuestList();
  const bingoCells = loadBingoCells();
  const memoryGrid = loadMemoryGrid();
  const memoryWords = loadMemoryWords(memoryGrid);

  return {
    guests,
    displayNames,
    solutionsByUser,
    puzzleIds,
    bingoCells,
    memoryWords,
    LOGIN_PUZZLE_ID,
    OSINT_PUZZLE_ID,
    GRID_SIZE,
    MEMORY_GRID_COLS,
    MEMORY_GRID_ROWS,
  };
}

module.exports = { loadStaticData, LOGIN_PUZZLE_ID, GRID_SIZE };
