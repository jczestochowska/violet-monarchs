const express = require('express');
const env = require('../config/env');
const { normalizeText } = require('../utils/normalizeText');
const passwordJokeService = require('../services/passwordJokeService');

const router = express.Router();

// ?restart=1 (from the jumpscare page's "Retour à la case départ") shows the
// gate even to someone already logged in. Their session is untouched, so
// re-entering the password just bounces them through /login back to '/'.
router.get('/gate', (req, res) => {
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

router.post('/gate', (req, res) => {
  const password = (req.body.password || '').toString();
  const ok =
    env.GLOBAL_PASSWORD.length > 0 &&
    normalizeText(password) === normalizeText(env.GLOBAL_PASSWORD);

  if (!ok) {
    const joke = passwordJokeService.classify(password);
    if (joke === 'jumpscare') {
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

router.get('/jumpscare', (req, res) => {
  res.render('jumpscare');
});

module.exports = router;
