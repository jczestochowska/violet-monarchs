const session = require('express-session');
const db = require('./connection');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires INTEGER
  );
`);

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const stmts = {
  get: db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?'),
  upsert: db.prepare(`
    INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
    ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires
  `),
  destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
  touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
};

function expiresAt(sess) {
  if (sess.cookie && sess.cookie.expires) {
    return new Date(sess.cookie.expires).getTime();
  }
  return Date.now() + DEFAULT_TTL_MS;
}

// A minimal express-session Store backed by the same better-sqlite3 file as
// the rest of the app's state, so sessions survive a process restart without
// pulling in the `sqlite3` native driver (and its vulnerable node-gyp/tar
// build toolchain) just for this.
class SqliteSessionStore extends session.Store {
  get(sid, callback) {
    try {
      const row = stmts.get.get(sid);
      if (!row) return callback(null, null);
      if (row.expires && row.expires < Date.now()) {
        stmts.destroy.run(sid);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.sess));
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sess, callback) {
    try {
      stmts.upsert.run(sid, JSON.stringify(sess), expiresAt(sess));
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      stmts.destroy.run(sid);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }

  touch(sid, sess, callback) {
    try {
      stmts.touch.run(expiresAt(sess), sid);
      callback && callback(null);
    } catch (err) {
      callback && callback(err);
    }
  }
}

module.exports = SqliteSessionStore;
