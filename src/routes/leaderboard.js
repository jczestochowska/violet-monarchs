const express = require('express');
const staticData = require('../config/staticData');
const requireAuth = require('../middleware/requireAuth');
const puzzleService = require('../services/puzzleService');
const rankingService = require('../services/rankingService');
const bingoService = require('../services/bingoService');
const memoryService = require('../services/memoryService');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const leaderboard = {
    currentUser: req.session.userName,
    ...rankingService.computeLeaderboard(),
  };
  const bingoGrid = bingoService.getGridForUser(req.session.userName);
  const memoryUnlocked = memoryService.isUnlocked(req.session.userName);
  const memoryCells = memoryService.getRevealedCells(req.session.userName);

  res.render('home', {
    currentUser: req.session.userName,
    allGuests: staticData.guests,
    leaderboard,
    bingoGrid,
    gridSize: staticData.GRID_SIZE,
    memoryUnlocked,
    memoryCells,
  });
});

router.get('/api/leaderboard', requireAuth, (req, res) => {
  const leaderboard = rankingService.computeLeaderboard();
  res.json({
    currentUser: req.session.userName,
    ...leaderboard,
  });
});

router.post('/api/puzzles/solve', requireAuth, (req, res) => {
  const answer = (req.body.answer || '').toString();
  const result = puzzleService.attemptSolveAny(req.session.userName, answer);
  const memoryUnlocked = memoryService.attemptUnlock(req.session.userName, answer);
  res.json({ ...result, memoryUnlocked });
});

module.exports = router;
