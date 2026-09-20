const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const memoryService = require('../services/memoryService');

const router = express.Router();

// Distinct from /api/puzzles/solve: this is the dedicated "Souvenirs
// d'Islande" box inside the memory section, not the main puzzle box.
router.post('/api/memory/entry', requireAuth, (req, res) => {
  const text = (req.body.text || '').toString();
  const cells = memoryService.attemptFindWord(req.session.userName, text);
  res.json({ found: cells.length > 0, cells });
});

module.exports = router;
