const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const repository = require('../db/repository');

const router = express.Router();

const MAX_MESSAGE_LENGTH = 1000;

router.post('/api/help', requireAuth, (req, res) => {
  const message = (req.body.message || '').toString().trim();
  if (!message) {
    return res.status(400).json({ ok: false, error: 'Écris un message avant d\'envoyer.' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ ok: false, error: 'Message trop long.' });
  }

  repository.addHelpMessage(req.session.userName, message, new Date().toISOString());
  res.json({ ok: true });
});

module.exports = router;
