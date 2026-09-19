const express = require('express');
const staticData = require('../config/staticData');
const repository = require('../db/repository');
const requireGate = require('../middleware/requireGate');

const router = express.Router();

// Computed once at boot (guest list is static for the process lifetime) so
// the dropdown always shows names alphabetically rather than CSV row order.
const sortedGuests = [...staticData.guests].sort((a, b) => a.localeCompare(b, 'fr'));

router.get('/login', requireGate, (req, res) => {
  if (req.session && req.session.userName) {
    return res.redirect('/');
  }
  res.render('login', { guests: sortedGuests, error: null });
});

router.post('/login', requireGate, (req, res) => {
  // Once a name is picked it's locked in for the session — there's no
  // logout, so re-posting here can't be used to switch identity and submit
  // answers as someone else.
  if (req.session.userName) {
    return res.redirect('/');
  }

  const name = (req.body.name || '').toString();
  const matchedGuest = staticData.guests.find((g) => g === name);

  if (!matchedGuest) {
    return res.status(401).render('login', {
      guests: sortedGuests,
      error: 'Choisis ton prénom dans la liste.',
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('login', {
        guests: sortedGuests,
        error: 'Une erreur est survenue, réessaie.',
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

module.exports = router;
