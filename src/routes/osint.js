const path = require('path');
const express = require('express');
const env = require('../config/env');
const requireAuth = require('../middleware/requireAuth');
const osintService = require('../services/osintService');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

router.post('/api/osint/answer', requireAuth, rateLimit.osintAnswer, (req, res) => {
  const text = (req.body.text || '').toString();
  res.json(osintService.attempt(req.session.userName, text));
});

// Photos live in assets/ but are blocked there (see server.js): a guest only
// gets photo n once they've revealed it.
router.get('/osint/photo/:n', requireAuth, (req, res) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 1 || n > osintService.PHOTO_COUNT) {
    return res.status(404).send('Photo introuvable');
  }
  if (n > osintService.getStage(req.session.userName)) {
    return res.status(404).send('Photo introuvable');
  }

  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(path.join(env.ROOT_DIR, 'assets', `picture${n}.png`), (err) => {
    if (err && !res.headersSent) res.status(404).send('Photo introuvable');
  });
});

module.exports = router;
