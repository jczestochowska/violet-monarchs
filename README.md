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

Self-hosted from a laptop: pm2 keeps the app running on port 3000, and [Tailscale Funnel](https://tailscale.com/kb/1223/funnel) publishes it on a **permanent** public HTTPS URL, `https://violet-monarchs.lyrebird-gentoo.ts.net` (`https://<machine>.<tailnet>.ts.net`). The URL depends only on the machine name and the tailnet name, so it survives restarts and reboots and the QR code can be printed in advance. Guests need nothing installed.

### One-time setup

1. Install Tailscale and log in: `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up`
2. In the [admin console](https://login.tailscale.com/admin) → DNS: make sure **MagicDNS** and **HTTPS Certificates** are enabled, and optionally rename the tailnet (it is part of the public URL, so do this **before** printing anything).
3. Machines page → this machine → menu → **Disable key expiry**, otherwise the machine drops off the tailnet when its key expires and the funnel goes offline.
4. Pick the machine name that will appear in the URL (don't rename it afterwards):
   ```bash
   sudo tailscale set --hostname=violet-monarchs
   ```
5. Install pm2: `npm install -g pm2`

### Start the app (pm2)

```bash
pm2 start ecosystem.config.js --only violet-monarchs
curl -I http://localhost:3000     # should answer
```

### Publish it (Tailscale Funnel)

```bash
tailscale funnel --bg 3000        # first run prints a link to approve Funnel in the browser
tailscale funnel status           # shows the public URL
```

The funnel configuration persists across reboots. DNS can take up to ~10 minutes to work the first time. Recreate or change it:

```bash
tailscale funnel reset            # remove the funnel config (site goes offline)
tailscale funnel --bg 3000        # recreate it (use the new port if the app's PORT changed)
tailscale status                  # check the machine is logged in / connected
```

### Restart the app after a reboot (pm2 startup daemon)

Run once, after the app is online and `pm2 status` looks right:

```bash
pm2 save                          # snapshot the current process list to ~/.pm2/dump.pm2
pm2 startup                       # prints a `sudo env PATH=... pm2 startup systemd ...` line: copy and run it
```

Afterwards the machine restores the saved process list on every boot. Verify with `systemctl status pm2-$USER`, then reboot and check `pm2 status`, `curl -I http://localhost:3000` and `tailscale funnel status`.

- Only `pm2 save` changes what is restored at boot. `pm2 stop/start/restart` don't, but **never `pm2 save` while the app is stopped** (it would be saved as stopped).
- Rerun `pm2 save` after any change to the process list or config.
- Tailscale restores the funnel by itself; pm2 doesn't manage it.
- Also disable suspend on lid close / idle and keep the laptop plugged in on the day.

### Day-to-day pm2 commands

```bash
pm2 status                        # list processes
pm2 logs violet-monarchs          # tail logs (Ctrl+C stops watching, not the app)
pm2 restart violet-monarchs
pm2 stop violet-monarchs
pm2 start violet-monarchs
pm2 delete violet-monarchs        # remove from pm2 (then start again from ecosystem.config.js)
```

**Resetting guest state** (before the event only: it deletes logins, progress, sessions and uploaded selfies). The server keeps the sqlite file open, so stop it first:

```bash
pm2 stop violet-monarchs
npm run reset-state
pm2 start violet-monarchs
```

### Generate the QR code

Once the final URL is known (`tailscale funnel status`):

```bash
uv run --with segno scripts/generate_qr.py https://violet-monarchs.lyrebird-gentoo.ts.net
# without uv: python3 -m pip install --user segno && python3 scripts/generate_qr.py <url>
```

This writes `qr/qr.svg`, `qr/qr.png` and `qr/qr.pdf` fully offline (options: `--out DIR`, `--error L|M|Q|H`, `--name NAME`). It is a static code that encodes the URL directly, so it never expires. Give the printer the SVG or PDF, print at 2.5 cm or larger with the white border kept, and scan a printed proof with both an iPhone and an Android phone before printing the booklet.

### Testing before the event

Open the public URL on a **phone on cellular data** (not the laptop's WiFi): this proves an external device can reach the laptop through the funnel. Check the gate/login flow, staying logged in, and a bingo photo upload.

## Security notes

- Puzzle solutions and the bingo answer key are loaded once into server memory at boot; they are never sent to the client in any API/page response, regardless of whether `data/` itself is committed.
- A guest can only submit answers/bingo cells for their own session identity — no route accepts a client-supplied "which user" parameter, and identity can't be changed once picked (no logout).
- Uploaded bingo selfies (`data/uploads/`) are never served over HTTP by the app; retrieve them by copying the folder off the host machine after the event.
