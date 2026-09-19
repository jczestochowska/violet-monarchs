const path = require('path');
const express = require('express');
const session = require('express-session');
const SqliteSessionStore = require('./db/sessionStore');

const env = require('./config/env');
require('./config/staticData'); // fail fast at boot if data/ files are missing/malformed
require('./db/migrate')(); // must run before anything prepares statements against these tables

const gateRoutes = require('./routes/gate');
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const bingoRoutes = require('./routes/bingo');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // needed so secure cookies work behind the Cloudflare Tunnel

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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

app.listen(env.PORT, () => {
  console.log(`violet-monarchs en écoute sur http://localhost:${env.PORT}`);
});
