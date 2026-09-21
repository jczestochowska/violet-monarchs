const { rateLimit } = require('express-rate-limit');

const MINUTE = 60 * 1000;
const TOO_MANY = 'Trop de tentatives, réessaie dans quelques instants.';

// Guests at the venue share one Wi-Fi/mobile IP, so per-IP limits are kept
// generous: they only stop scripted floods, not a room full of people typing.
// Once logged in, limits are per guest instead (the limiter must sit after
// requireAuth in the route).

function createLimiter({ windowMs, limit, perUser = false, failedOnly, onLimit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(perUser && { keyGenerator: (req) => `user:${req.session.userName}` }),
    // Successful requests (status < 400, or failedOnly's own test) are refunded
    // so only failed attempts eat the budget.
    ...(failedOnly && { skipSuccessfulRequests: true }),
    ...(typeof failedOnly === 'function' && { requestWasSuccessful: failedOnly }),
    handler: (req, res) => {
      if (onLimit) return onLimit(req, res);
      res.status(429).json({ correct: false, ok: false, error: TOO_MANY });
    },
  });
}

module.exports = {
  // Shared password; 302 -> /jumpscare on a wrong one also looks "successful",
  // so success means the session actually passed the gate.
  gate: (onLimit) =>
    createLimiter({
      windowMs: 10 * MINUTE,
      limit: 60,
      failedOnly: (req) => Boolean(req.session && req.session.gatePassed),
      onLimit,
    }),
  adminLogin: (onLimit) => createLimiter({ windowMs: 15 * MINUTE, limit: 10, failedOnly: true, onLimit }),
  // Counts successes too: each one claims a guest name, so a script could
  // otherwise grab every name in seconds.
  login: (onLimit) => createLimiter({ windowMs: 10 * MINUTE, limit: 50, onLimit }),
  puzzleAnswer: createLimiter({ windowMs: MINUTE, limit: 20, perUser: true }),
  osintAnswer: createLimiter({ windowMs: MINUTE, limit: 20, perUser: true }),
  memoryEntry: createLimiter({ windowMs: MINUTE, limit: 40, perUser: true }),
  bingoUpload: createLimiter({ windowMs: 10 * MINUTE, limit: 30, perUser: true }),
  help: createLimiter({ windowMs: 10 * MINUTE, limit: 10, perUser: true }),
};
