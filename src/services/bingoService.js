const staticData = require('../config/staticData');
const repository = require('../db/repository');
const { normalizeText } = require('../utils/normalizeText');

const { bingoCells, GRID_SIZE } = staticData;

function getCellIds() {
  return [...bingoCells.keys()];
}

function cellExists(cellId) {
  return bingoCells.has(cellId);
}

function matchesName(cellId, name) {
  const cell = bingoCells.get(cellId);
  if (!cell) return false;
  return cell.validNames.has(normalizeText(name));
}

function rowLineId(row) {
  return `row${row}`;
}
function colLineId(col) {
  return `col${col}`;
}

function computeCompletedLines(solvedCellIdSet) {
  const completed = new Set();
  for (let row = 0; row < GRID_SIZE; row++) {
    let full = true;
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!solvedCellIdSet.has(`r${row}c${col}`)) {
        full = false;
        break;
      }
    }
    if (full) completed.add(rowLineId(row));
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    let full = true;
    for (let row = 0; row < GRID_SIZE; row++) {
      if (!solvedCellIdSet.has(`r${row}c${col}`)) {
        full = false;
        break;
      }
    }
    if (full) completed.add(colLineId(col));
  }
  return completed;
}

function hasCompletedLine(solvedCellIdSet) {
  return computeCompletedLines(solvedCellIdSet).size > 0;
}

/**
 * Cells belonging to any fully-solved row/column, for green-tile rendering.
 */
function getCellsInCompletedLines(solvedCellIdSet) {
  const completedLines = computeCompletedLines(solvedCellIdSet);
  const cellIds = new Set();
  for (const lineId of completedLines) {
    if (lineId.startsWith('row')) {
      const row = Number(lineId.slice(3));
      for (let col = 0; col < GRID_SIZE; col++) cellIds.add(`r${row}c${col}`);
    } else {
      const col = Number(lineId.slice(3));
      for (let row = 0; row < GRID_SIZE; row++) cellIds.add(`r${row}c${col}`);
    }
  }
  return cellIds;
}

/**
 * Lines that become fully solved specifically because of newCellId, i.e. were
 * not already complete before it. Used only to decide whether to fire the
 * one-shot "you won a prize" popup in the direct API response — never
 * consulted on page load/refresh.
 */
function getNewlyCompletedLines(solvedCellIdsBeforeSet, newCellId) {
  const before = computeCompletedLines(solvedCellIdsBeforeSet);
  const after = computeCompletedLines(new Set([...solvedCellIdsBeforeSet, newCellId]));

  const newly = [];
  for (const lineId of after) {
    if (!before.has(lineId)) {
      newly.push(
        lineId.startsWith('row')
          ? { type: 'row', index: Number(lineId.slice(3)) }
          : { type: 'col', index: Number(lineId.slice(3)) }
      );
    }
  }
  return newly;
}

/**
 * Completed rows/columns with, for each of their cells, the task description
 * and the person the guest picked — what an admin needs to check the guest
 * filled them in honestly. `progress` is repository.getBingoProgress() output.
 */
function getCompletedLineDetails(progress) {
  const lines = [];
  for (const lineId of computeCompletedLines(new Set(progress.keys()))) {
    const isRow = lineId.startsWith('row');
    const index = Number(lineId.slice(3));
    const cells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const cellId = isRow ? `r${index}c${i}` : `r${i}c${index}`;
      cells.push({
        id: cellId,
        description: bingoCells.get(cellId).description,
        submittedName: progress.get(cellId).submittedName,
      });
    }
    lines.push({ label: `${isRow ? 'Ligne' : 'Colonne'} ${index + 1}`, cells });
  }
  return lines;
}

/**
 * Full per-user grid view for rendering: never includes validNames.
 */
function getGridForUser(userName) {
  const progress = repository.getBingoProgress(userName); // Map<cellId, {solvedAt,...}>
  const solvedCellIds = new Set(progress.keys());
  const cellsInCompletedLines = getCellsInCompletedLines(solvedCellIds);

  const cells = [];
  for (const [cellId, cell] of bingoCells) {
    const solved = progress.has(cellId);
    cells.push({
      id: cellId,
      row: cell.row,
      col: cell.col,
      description: cell.description,
      letter: solved ? cell.letter : null,
      solved,
      solvedAt: solved ? progress.get(cellId).solvedAt : null,
      submittedName: solved ? progress.get(cellId).submittedName : null,
      lineComplete: cellsInCompletedLines.has(cellId),
    });
  }
  return cells;
}

/**
 * A guest may only use a given person once across their whole grid (per the
 * game rules), even though the same person can satisfy multiple cells.
 */
function isNameAlreadyUsedByUser(userName, name) {
  const normalized = normalizeText(name);
  const progress = repository.getBingoProgress(userName);
  for (const { submittedName } of progress.values()) {
    if (normalizeText(submittedName) === normalized) return true;
  }
  return false;
}

function sanitizeForFilename(text) {
  return (text || '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'invite';
}

module.exports = {
  getCellIds,
  cellExists,
  matchesName,
  isNameAlreadyUsedByUser,
  getNewlyCompletedLines,
  hasCompletedLine,
  getCompletedLineDetails,
  getGridForUser,
  sanitizeForFilename,
};
