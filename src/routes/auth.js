const express = require('express');
const staticData = require('../config/staticData');
const repository = require('../db/repository');
const requireGate = require('../middleware/requireGate');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Computed once at boot (guest list is static for the process lifetime) so
// the dropdown always shows names alphabetically rather than CSV row order.
const sortedGuests = [...staticData.guests].sort((a, b) => a.localeCompare(b, 'fr'));

// Names already claimed by someone (logged in) don't show up as choices for
// anyone else.
function getAvailableGuests() {
  const claimed = repository.getClaimedUserNames();
  return sortedGuests.filter((g) => !claimed.has(g));
}

router.get('/login', requireGate, (req, res) => {
  if (req.session && req.session.userName) {
    return res.redirect('/');
  }
  res.render('login', { guests: getAvailableGuests(), error: null });
});

const loginLimiter = rateLimit.login((req, res) =>
  res.status(429).render('login', {
    guests: getAvailableGuests(),
    error: 'Trop de tentatives, réessaie dans quelques minutes.',
  })
);

router.post('/login', requireGate, loginLimiter, (req, res) => {
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
      guests: getAvailableGuests(),
      error: 'Choisis ton prénom dans la liste.',
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('login', {
        guests: getAvailableGuests(),
        error: 'Une erreur est survenue, réessaie.',
      });
    }
    const now = new Date().toISOString();
    // Atomic claim: whoever's INSERT actually lands first wins, even if two
    // people submit the same name within milliseconds of each other.
    const claimed = repository.markLogin(matchedGuest, now, staticData.LOGIN_PUZZLE_ID);
    if (!claimed) {
      return res.status(409).render('login', {
        guests: getAvailableGuests(),
        error: 'Ce prénom vient d\'être pris par quelqu\'un d\'autre, choisis-en un autre.',
      });
    }
    // regenerate() starts a brand new session, so the gate flag needs
    // re-setting alongside identity — it doesn't carry over automatically.
    req.session.gatePassed = true;
    req.session.userName = matchedGuest;
    res.redirect('/');
  });
});

module.exports = router;
