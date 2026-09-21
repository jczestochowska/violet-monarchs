const { rateLimit } = require('express-rate-limit');

const MINUTE = 60 * 1000;
const TOO_MANY = 'Trop de tentatives, réessaie dans quelques instants.';

// Guests at the venue share one Wi-Fi/mobile IP, so per-IP limits are kept
// generous: they only stop scripted floods, not a room full of people typing.
// The pre-login routes (gate, login) add a smaller per-browser (cookie) budget
// underneath, so one person mashing the form only locks themselves out, not
// everyone behind the same IP. Once logged in, limits are per guest (the
// limiter must sit after requireAuth in the route).

const KEY = {
  user: (req) => `user:${req.session.userName}`,
  session: (req) => `session:${req.sessionID}`,
};

/**
 * @param {object} opts
 * @param {'user'|'session'} [opts.key] what to count by; default is the client IP
 * @param {boolean|function} [opts.refund] refund requests that count as
 *   "successful" once the response is sent, so only the rest eat the budget:
 *   true = status < 400, or a (req, res) => boolean of your own
 */
function createLimiter({ windowMs, limit, key, refund, onLimit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(key && { keyGenerator: KEY[key] }),
    ...(refund && { skipSuccessfulRequests: true }),
    ...(typeof refund === 'function' && { requestWasSuccessful: refund }),
    handler: (req, res) => {
      if (onLimit) return onLimit(req, res);
      res.status(429).json({ correct: false, ok: false, error: TOO_MANY });
    },
  });
}

// Without a saved session an anonymous visitor has no stable id to count
// against (saveUninitialized is off), so give them one. Placed after the IP
// limiter so a flood that's already refused never creates session rows.
function rememberVisitor(req, res, next) {
  req.session.visitor = true;
  next();
}

const passedGate = (req) => Boolean(req.session && req.session.gatePassed);
const wasLimited = (req, res) => res.statusCode === 429;

module.exports = {
  // Shared password. A wrong one can answer 302 -> /jumpscare, which also looks
  // "successful", so success means the session actually passed the gate.
  // Requests refused by the per-browser budget are refunded to the IP budget so
  // one person mashing the form can't drain it for everyone.
  gate: (onLimit) => [
    createLimiter({
      windowMs: 10 * MINUTE,
      limit: 120,
      refund: (req, res) => passedGate(req) || wasLimited(req, res),
      onLimit,
    }),
    rememberVisitor,
    createLimiter({ windowMs: 10 * MINUTE, limit: 30, key: 'session', refund: passedGate, onLimit }),
  ],
  adminLogin: (onLimit) => createLimiter({ windowMs: 15 * MINUTE, limit: 10, refund: true, onLimit }),
  // Counts successes too: each one claims a guest name, so a script could
  // otherwise grab every name in seconds. (After requireGate, so the session
  // already exists.) A guest only ever needs a handful of tries themselves.
  login: (onLimit) => [
    createLimiter({ windowMs: 10 * MINUTE, limit: 100, refund: wasLimited, onLimit }),
    createLimiter({ windowMs: 10 * MINUTE, limit: 15, key: 'session', onLimit }),
  ],
  puzzleAnswer: createLimiter({ windowMs: MINUTE, limit: 20, key: 'user' }),
  osintAnswer: createLimiter({ windowMs: MINUTE, limit: 20, key: 'user' }),
  memoryEntry: createLimiter({ windowMs: MINUTE, limit: 40, key: 'user' }),
  bingoUpload: createLimiter({ windowMs: 10 * MINUTE, limit: 30, key: 'user' }),
  help: createLimiter({ windowMs: 10 * MINUTE, limit: 10, key: 'user' }),
};
