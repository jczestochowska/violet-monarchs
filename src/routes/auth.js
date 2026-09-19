const express = require('express');
const staticData = require('../config/staticData');
const repository = require('../db/repository');
const requireGate = require('../middleware/requireGate');
const { normalizeText } = require('../utils/normalizeText');

const router = express.Router();

router.get('/login', requireGate, (req, res) => {
  if (req.session && req.session.userName) {
    return res.redirect('/');
  }
  res.render('login', { guests: staticData.guests, error: null });
});

router.post('/login', requireGate, (req, res) => {
  const name = (req.body.name || '').toString();
  const password = (req.body.password || '').toString();

  const matchedGuest = staticData.guests.find((g) => g === name);
  // The "personal password" is puzzle E1's answer for that specific guest —
  // read from puzzles.csv, same as every other puzzle — not a fixed secret.
  const expectedPassword = matchedGuest
    ? staticData.solutionsByUser.get(matchedGuest)?.get(staticData.LOGIN_PUZZLE_ID)
    : undefined;
  const passwordOk = Boolean(expectedPassword) && normalizeText(password) === expectedPassword;

  if (!matchedGuest || !passwordOk) {
    return res.status(401).render('login', {
      guests: staticData.guests,
      error: "Nom ou mot de passe incorrect.",
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('login', {
        guests: staticData.guests,
        error: "Une erreur est survenue, réessaie.",
      });
    }
    // regenerate() starts a brand new session, so the gate flag needs
    // re-setting alongside identity — it doesn't carry over automatically.
    req.session.gatePassed = true;
    req.session.userName = matchedGuest;
    const now = new Date().toISOString();
    repository.markLogin(matchedGuest, now, staticData.LOGIN_PUZZLE_ID);
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
