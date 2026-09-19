# violet-monarchs

Mobile web app for Alix & Baptiste's wedding cocktail: a puzzle race with a public leaderboard, plus a private bingo grid guests fill in by meeting other guests. See [docs/spec.md](docs/spec.md) for the full spec and [docs the implementation plan](../.claude/plans/hi-i-wrote-a-linear-dijkstra.md) for the architecture.

## Setup

```bash
npm install
cp .env.example .env        # then edit GLOBAL_PASSWORD and SESSION_SECRET
```

Real guest list / puzzle solutions / bingo answer key go under `data/` (gitignored, never committed):

```bash
cp data-templates/guests.example.csv data/guests.csv
cp data-templates/puzzles.example.csv data/puzzles.csv
cp data-templates/bingo-cells.example.json data/bingo-cells.json
```

Edit those three files with the real content before the event:
- `data/guests.csv` — one name per line under a `name` header.
- `data/puzzles.csv` — long format `user,puzzle_id,solution`. The set of distinct `puzzle_id` values present *is* the puzzle list (add/remove a puzzle by adding/removing rows, no code change needed). **`E1` is required for every guest** — it's not solved through the in-app answer box, it's typed as that guest's "personal password" on `/login` (it can be the same value for everyone, or different per guest, since it's just another row in this file).
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

Open `http://localhost:3000/`. Auth is two steps: `GLOBAL_PASSWORD` on `/gate` (same for everyone, gets you into the site at all) then, on `/login`, picking a name and entering that guest's personal password — which is their answer to puzzle `E1` in `data/puzzles.csv`, not a separate config value. Runtime state (sessions, puzzle/bingo progress) persists to `data/state.sqlite3`, so restarting the server never loses guest progress.

## Hosting for the event

Self-hosted from a laptop, exposed via a free Cloudflare Tunnel (no domain currently available, so this uses a **Quick Tunnel** — see `ecosystem.config.js` for why `cloudflared` is deliberately *not* auto-restarted).

```bash
npm install -g pm2
# cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
pm2 start ecosystem.config.js
pm2 logs cloudflared   # copy the printed https://<random>.trycloudflare.com URL
```

Generate the QR code from that URL right before the event starts (not in advance — the URL changes if `cloudflared` restarts). If `cloudflared` dies mid-event, restart it manually (`pm2 restart cloudflared`) and re-share the new URL — it will be different.

## Security notes

- Puzzle solutions and the bingo answer key live only in `data/` (gitignored) and are loaded once into server memory; they are never sent to the client in any API/page response.
- A guest can only submit answers/bingo cells for their own session identity — no route accepts a client-supplied "which user" parameter.
- Uploaded bingo selfies (`data/uploads/`) are never served over HTTP by the app; retrieve them by copying the folder off the host machine after the event.
