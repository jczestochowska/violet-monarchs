const express = require('express');
const env = require('../config/env');
const { normalizeText } = require('../utils/normalizeText');
const passwordJokeService = require('../services/passwordJokeService');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// ?restart=1 (from the jumpscare page's "Retour à la case départ") shows the
// gate even to someone already logged in. Their session is untouched, so
// re-entering the password just bounces them through /login back to '/'.
router.get('/gate', (req, res) => {
  // Same reasoning as /login: without this, a phone's back button/gesture
  // can restore this page straight from cache (bfcache) after the gate (or
  // login) has already been passed, skipping the redirects below entirely.
  res.set('Cache-Control', 'no-store');
  if (req.query.restart === undefined) {
    if (req.session && req.session.userName) {
      return res.redirect('/');
    }
    if (req.session && req.session.gatePassed) {
      return res.redirect('/login');
    }
  }
  res.render('gate', { error: null, commonPassword: null });
});

const gateLimiter = rateLimit.gate((req, res) =>
  res.status(429).render('gate', {
    error: 'Trop de tentatives, réessaie dans quelques minutes.',
    commonPassword: null,
  })
);

router.post('/gate', gateLimiter, (req, res) => {
  res.set('Cache-Control', 'no-store');

  const password = (req.body.password || '').toString();
  const ok =
    env.GLOBAL_PASSWORD.length > 0 &&
    normalizeText(password) === normalizeText(env.GLOBAL_PASSWORD);

  if (!ok) {
    const joke = passwordJokeService.classify(password);
    if (joke === 'jumpscare') {
      req.session.jumpscarePending = true;
      return res.redirect('/jumpscare');
    }
    return res.status(401).render('gate', {
      error: 'Mot de passe incorrect.',
      commonPassword: joke === 'common' ? password.trim() : null,
    });
  }

  req.session.gatePassed = true;
  res.redirect('/login');
});

// Only reachable straight after typing a forbidden word on the gate: the flag
// is spent on the first view, so typing /jumpscare in the address bar (or
// reloading) just sends you back to the gate.
router.get('/jumpscare', (req, res) => {
  if (!req.session.jumpscarePending) {
    return res.redirect('/gate');
  }
  delete req.session.jumpscarePending;
  res.set('Cache-Control', 'no-store');
  res.render('jumpscare');
});

module.exports = router;
