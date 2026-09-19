const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');
const staticData = require('../config/staticData');
const requireAuth = require('../middleware/requireAuth');
const repository = require('../db/repository');
const bingoService = require('../services/bingoService');

const router = express.Router();

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!MIME_TO_EXT[file.mimetype]) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

function uploadSingleSelfie(req, res, next) {
  upload.single('selfie')(req, res, (err) => {
    if (err) {
      const message =
        err.message === 'INVALID_FILE_TYPE'
          ? 'Le fichier doit être une photo (jpg, png ou webp).'
          : 'Le fichier est trop volumineux (8 Mo maximum).';
      return res.status(400).json({ correct: false, error: message });
    }
    next();
  });
}

router.post('/api/bingo/:cellId/solve', requireAuth, uploadSingleSelfie, (req, res) => {
  const { cellId } = req.params;
  const userName = req.session.userName;

  if (!bingoService.cellExists(cellId)) {
    return res.status(404).json({ correct: false, error: 'Case de bingo inconnue.' });
  }

  if (repository.isBingoCellSolved(userName, cellId)) {
    const cell = staticData.bingoCells.get(cellId);
    return res.json({ correct: true, letter: cell.letter, lineCompleted: [] });
  }

  const personName = (req.body.personName || '').toString().trim();
  if (!personName) {
    return res.status(400).json({ correct: false, error: 'Indique le nom de la personne.' });
  }
  if (!req.file) {
    return res.status(400).json({ correct: false, error: 'Ajoute une photo avec cette personne.' });
  }

  if (bingoService.isNameAlreadyUsedByUser(userName, personName)) {
    return res.json({
      correct: false,
      error: 'Tu as déjà utilisé ce nom pour une autre case, choisis quelqu\'un d\'autre.',
    });
  }

  if (!bingoService.matchesName(cellId, personName)) {
    return res.json({ correct: false });
  }

  const progressBefore = repository.getBingoProgress(userName);
  const solvedBeforeSet = new Set(progressBefore.keys());

  const userDir = path.join(env.UPLOADS_DIR, bingoService.sanitizeForFilename(userName));
  fs.mkdirSync(userDir, { recursive: true });
  const ext = MIME_TO_EXT[req.file.mimetype];
  const filename = `${cellId}_${bingoService.sanitizeForFilename(personName)}.${ext}`;
  fs.writeFileSync(path.join(userDir, filename), req.file.buffer);

  const solvedAt = new Date().toISOString();
  const relativePhotoPath = path.join(bingoService.sanitizeForFilename(userName), filename);
  repository.recordBingoSolve(userName, cellId, solvedAt, personName, relativePhotoPath);

  const newlyCompletedLines = bingoService.getNewlyCompletedLines(solvedBeforeSet, cellId);
  if (newlyCompletedLines.length > 0) {
    repository.recordLinesCelebrated(
      userName,
      newlyCompletedLines.map((l) => `${l.type}${l.index}`),
      solvedAt
    );
  }

  const cell = staticData.bingoCells.get(cellId);
  res.json({ correct: true, letter: cell.letter, solvedAt, lineCompleted: newlyCompletedLines });
});

module.exports = router;
