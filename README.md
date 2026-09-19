# violet-monarchs

Mobile web app for Alix & Baptiste's wedding cocktail: a puzzle race with a public leaderboard, plus a private bingo grid guests fill in by meeting other guests. See [docs/spec.md](docs/spec.md) for the full spec and [docs the implementation plan](../.claude/plans/hi-i-wrote-a-linear-dijkstra.md) for the architecture.

## Setup

```bash
npm install
cp .env.example .env        # then edit GLOBAL_PASSWORD and SESSION_SECRET
```

Real guest list / puzzle solutions / bingo answer key go under `data/`:

```bash
npm run seed-data     # copies data-templates/*.example.* into data/, skips files that already exist
```

- `data/guest_list_final.csv` — the output of `scripts/database_generation.py` (run that script against `data/guest_list.csv` to regenerate it). One row per guest; **`Nom si initiale`** is that guest's unique display name and login identity (first name alone when unambiguous, first name + last initial when two guests share a first name). Every `Answer<PUZZLE_ID>` column (e.g. `AnswerVOLCANO`) becomes one puzzle in the app — add/remove a puzzle by adding/removing that column, no code change needed. A guest with no value in a given `Answer*` column just isn't part of that puzzle (e.g. the couple don't do the table-based ones).
- `data/bingo-cells.json` — exactly 25 objects (5x5 grid), ids `r0c0`..`r4c4`, each with `letter`, `description`, and `validNames` (the list of guests who satisfy that cell, matched case-insensitively).

## Running locally

```bash
npm run dev      # nodemon, auto-reloads on file change
# or
npm start
```

To clean the db and test from a clean slate:

```
npm run reset-state
```

Open `http://localhost:3000/`. Auth is two steps: `GLOBAL_PASSWORD` on `/gate` (same for everyone, gets you into the site at all — this is `ANSWER_ENTER` in `database_generation.py`) then, on `/login`, just picking a name from the dropdown — no second password. Once picked, a guest's identity is locked in for the session (there's no logout), so it can't be used to submit answers as someone else. Runtime state (sessions, puzzle/bingo progress) persists to `data/state.sqlite3`, so restarting the server never loses guest progress.

## Hosting for the event

Self-hosted from a laptop, exposed via a free Cloudflare Tunnel (no domain currently available, so this uses a **Quick Tunnel** — see `ecosystem.config.js` for why `cloudflared` is deliberately *not* auto-restarted).

### One-time setup

Install `cloudflared` (Ubuntu/Debian, amd64):
```bash
curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version   # sanity check
```

### Manual test (recommended before the event, to see each piece working)

1. Terminal 1 — start the app: `npm start`. You should see `violet-monarchs en écoute sur http://localhost:3000`.
2. Terminal 2 — open the tunnel: `cloudflared tunnel --url http://localhost:3000`. After a few seconds it prints a box containing a URL like `https://some-random-words.trycloudflare.com` — that's the public link.
3. Open that URL on your **phone, on cellular data** (not the same WiFi as the laptop) — this is the real test, since it proves an external device can actually reach the laptop through the tunnel.
4. As long as terminal 2 stays open, the URL stays the same. `Ctrl+C` and rerunning it gives a **different, random** URL — this is why an unattended auto-restart would be dangerous (see below).

### Running it for real, via pm2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs cloudflared   # watch for the printed https://<random>.trycloudflare.com URL, Ctrl+C to stop watching (doesn't stop the process)
```

Generate the QR code from that URL right before the event starts (not in advance — the URL changes if `cloudflared` restarts). If `cloudflared` dies mid-event, restart it manually (`pm2 restart cloudflared`) and re-share the new URL — it will be different.

## Security notes

- Puzzle solutions and the bingo answer key are loaded once into server memory at boot; they are never sent to the client in any API/page response, regardless of whether `data/` itself is committed.
- A guest can only submit answers/bingo cells for their own session identity — no route accepts a client-supplied "which user" parameter, and identity can't be changed once picked (no logout).
- Uploaded bingo selfies (`data/uploads/`) are never served over HTTP by the app; retrieve them by copying the folder off the host machine after the event.
