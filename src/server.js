const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const SqliteSessionStore = require('./db/sessionStore');

const env = require('./config/env');
require('./config/staticData'); // fail fast at boot if data/ files are missing/malformed
require('./db/migrate')(); // must run before anything prepares statements against these tables

const gateRoutes = require('./routes/gate');
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const bingoRoutes = require('./routes/bingo');
const adminRoutes = require('./routes/admin');
const memoryRoutes = require('./routes/memory');
const helpRoutes = require('./routes/help');
const osintRoutes = require('./routes/osint');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // needed so secure cookies work behind the Tailscale Funnel proxy

// Inline <script> blocks (home + jumpscare views) carry this per-request nonce;
// everything else must come from our own origin. Inline style="" attributes
// are used for CSS variables, hence 'unsafe-inline' for styles only.
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null, // would break plain-http local testing
      },
    },
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
// The "Où sont les mariés ?" photos are only served through /osint/photo/:n,
// once the guest has unlocked them, so they can't be fetched from here.
app.use('/assets', (req, res, next) => {
  if (/^\/picture\d/i.test(req.path)) return res.status(404).send('Page introuvable');
  next();
});
app.use('/assets', express.static('assets'));
app.use(
  session({
    store: new SqliteSessionStore(),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(gateRoutes);
app.use(authRoutes);
app.use(leaderboardRoutes);
app.use(bingoRoutes);
app.use(adminRoutes);
app.use(memoryRoutes);
app.use(helpRoutes);
app.use(osintRoutes);

app.use((req, res) => {
  res.status(404).send('Page introuvable');
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ correct: false, error: 'Erreur serveur.' });
  }
  res.status(500).send('Erreur serveur.');
});

app.listen(env.PORT, env.HOST, () => {
  console.log(`violet-monarchs en écoute sur http://${env.HOST}:${env.PORT}`);
});
