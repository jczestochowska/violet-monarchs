const express = require('express');
const env = require('../config/env');
const { normalizeText } = require('../utils/normalizeText');

const router = express.Router();

router.get('/gate', (req, res) => {
  if (req.session && req.session.userName) {
    return res.redirect('/');
  }
  if (req.session && req.session.gatePassed) {
    return res.redirect('/login');
  }
  res.render('gate', { error: null });
});

router.post('/gate', (req, res) => {
  const password = (req.body.password || '').toString();
  const ok =
    env.GLOBAL_PASSWORD.length > 0 &&
    normalizeText(password) === normalizeText(env.GLOBAL_PASSWORD);

  if (!ok) {
    return res.status(401).render('gate', { error: 'Mot de passe incorrect.' });
  }

  req.session.gatePassed = true;
  res.redirect('/login');
});

module.exports = router;
