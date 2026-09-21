const path = require('path');
const express = require('express');
const env = require('../config/env');
const staticData = require('../config/staticData');
const repository = require('../db/repository');
const requireAdmin = require('../middleware/requireAdmin');
const rankingService = require('../services/rankingService');
const bingoService = require('../services/bingoService');
const { normalizeText } = require('../utils/normalizeText');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const sortedGuests = [...staticData.guests].sort((a, b) => a.localeCompare(b, 'fr'));

// ENTER is recorded automatically at login, not a puzzle a guest can cheat on.
const ADMIN_PUZZLE_IDS = staticData.puzzleIds.filter((id) => id !== staticData.LOGIN_PUZZLE_ID);

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Post/Redirect/Get: a flash message survives the redirect so refreshing
// /admin never re-submits an action.
function redirectWithMessage(req, res, message) {
  req.session.adminMessage = message;
  res.redirect('/admin');
}

router.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin-login', { error: null });
});

const adminLoginLimiter = rateLimit.adminLogin((req, res) =>
  res.status(429).render('admin-login', {
    error: 'Trop de tentatives, réessaie dans quelques minutes.',
  })
);

router.post('/admin/login', adminLoginLimiter, (req, res) => {
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
  res.set('Cache-Control', 'no-store');
  const message = req.session.adminMessage || null;
  delete req.session.adminMessage;

  const claimed = repository.getClaimedUserNames();
  const guests = sortedGuests.map((name) => ({ name, claimed: claimed.has(name) }));

  const leaderboard = rankingService.computeLeaderboard();
  const rowsByUser = new Map(leaderboard.rows.map((r) => [r.user, r]));
  const players = leaderboard.rankedOrder.map((user) => {
    const row = rowsByUser.get(user);
    return {
      name: user,
      cells: ADMIN_PUZZLE_IDS.map((puzzleId) => ({
        puzzleId,
        solvedAt: row.solves[puzzleId] ? formatTime(row.solves[puzzleId]) : null,
        blocked: Boolean(row.blocks[puzzleId]),
      })),
    };
  });

  const helpMessages = repository.getHelpMessages().map((m) => ({
    id: m.id,
    userName: m.user_name,
    message: m.message,
    createdAt: formatDateTime(m.created_at),
  }));

  const allBingoProgress = repository.getAllBingoProgress();
  const bingoPlayers = [...allBingoProgress.keys()]
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((name) => ({
      name,
      lines: bingoService.getCompletedLineDetails(allBingoProgress.get(name)),
    }))
    .filter((player) => player.lines.length > 0);

  res.render('admin', {
    bingoPlayers,
    guests,
    players,
    puzzleIds: ADMIN_PUZZLE_IDS,
    helpMessages,
    message,
  });
});

// Selfies are only sent when the admin actually opens a guest's bingo
// review (the <img> tags are lazy and sit inside a closed <details>). The
// file is looked up from the database, never from the URL, so the request
// can't be pointed at arbitrary paths.
router.get('/admin/photos/:user/:cellId', requireAdmin, (req, res) => {
  const user = staticData.guests.find((g) => g === req.params.user);
  const entry = user && repository.getBingoProgress(user).get(req.params.cellId);
  if (!entry) return res.status(404).send('Photo introuvable');

  const uploadsRoot = path.resolve(env.UPLOADS_DIR);
  const file = path.resolve(uploadsRoot, entry.photoPath);
  if (!file.startsWith(uploadsRoot + path.sep)) return res.status(404).send('Photo introuvable');

  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).send('Photo introuvable');
  });
});

// Undoes a mistaken name pick: frees the name back into the login dropdown
// and wipes the progress that got recorded under it (see
// repository.deleteUserCompletely).
router.post('/admin/guests/:name/release', requireAdmin, (req, res) => {
  const matchedGuest = staticData.guests.find((g) => g === req.params.name);
  if (!matchedGuest) {
    return redirectWithMessage(req, res, 'Invité·e inconnu·e.');
  }

  repository.deleteUserCompletely(matchedGuest);
  redirectWithMessage(req, res, `${matchedGuest} a été libéré·e et peut de nouveau être choisi·e.`);
});

function parsePlayerAndPuzzle(req) {
  const user = staticData.guests.find((g) => g === (req.body.user || '').toString());
  const puzzleId = ADMIN_PUZZLE_IDS.find((id) => id === (req.body.puzzleId || '').toString());
  return user && puzzleId ? { user, puzzleId } : null;
}

// The leaderboard/ranking are computed from puzzle_progress on every request,
// so removing or blocking a solve re-ranks everyone else automatically.
router.post('/admin/progress/remove', requireAdmin, (req, res) => {
  const target = parsePlayerAndPuzzle(req);
  if (!target) return redirectWithMessage(req, res, 'Requête invalide.');

  repository.removePuzzleSolve(target.user, target.puzzleId);
  redirectWithMessage(req, res, `Case ${target.puzzleId} retirée pour ${target.user}.`);
});

router.post('/admin/progress/block', requireAdmin, (req, res) => {
  const target = parsePlayerAndPuzzle(req);
  if (!target) return redirectWithMessage(req, res, 'Requête invalide.');

  repository.blockPuzzle(target.user, target.puzzleId, new Date().toISOString());
  redirectWithMessage(req, res, `${target.user} est bloqué·e sur ${target.puzzleId}.`);
});

router.post('/admin/progress/unblock', requireAdmin, (req, res) => {
  const target = parsePlayerAndPuzzle(req);
  if (!target) return redirectWithMessage(req, res, 'Requête invalide.');

  repository.unblockPuzzle(target.user, target.puzzleId);
  redirectWithMessage(req, res, `${target.user} est débloqué·e sur ${target.puzzleId}.`);
});

module.exports = router;
