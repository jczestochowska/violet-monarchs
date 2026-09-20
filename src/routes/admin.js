const express = require('express');
const env = require('../config/env');
const staticData = require('../config/staticData');
const repository = require('../db/repository');
const requireAdmin = require('../middleware/requireAdmin');
const { normalizeText } = require('../utils/normalizeText');

const router = express.Router();

const sortedGuests = [...staticData.guests].sort((a, b) => a.localeCompare(b, 'fr'));

function renderAdmin(res, message) {
  const claimed = repository.getClaimedUserNames();
  const guests = sortedGuests.map((name) => ({ name, claimed: claimed.has(name) }));
  res.render('admin', { guests, message });
}

router.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin-login', { error: null });
});

router.post('/admin/login', (req, res) => {
  const password = (req.body.password || '').toString();
  const ok =
    env.ADMIN_PASSWORD.length > 0 && normalizeText(password) === normalizeText(env.ADMIN_PASSWORD);

  if (!ok) {
    return res.status(401).render('admin-login', { error: 'Mot de passe incorrect.' });
  }

  req.session.isAdmin = true;
  res.redirect('/admin');
});

router.get('/admin', requireAdmin, (req, res) => {
  renderAdmin(res, null);
});

// Undoes a mistaken name pick: frees the name back into the login dropdown
// and wipes the progress that got recorded under it (see
// repository.deleteUserCompletely).
router.post('/admin/guests/:name/release', requireAdmin, (req, res) => {
  const matchedGuest = staticData.guests.find((g) => g === req.params.name);
  if (!matchedGuest) {
    return renderAdmin(res, 'Invité·e inconnu·e.');
  }

  repository.deleteUserCompletely(matchedGuest);
  renderAdmin(res, `${matchedGuest} a été libéré·e et peut de nouveau être choisi·e.`);
});

module.exports = router;
