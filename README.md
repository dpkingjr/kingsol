# Kingsol Solitaire

A Next.js solitaire collection with four games:

| Route       | Game     | Options                         |
| ----------- | -------- | ------------------------------- |
| `/klondike` | Klondike | Draw 1 / Draw 3                 |
| `/freecell` | FreeCell | Auto-play to foundations on/off |
| `/spider`   | Spider   | 1, 2 or 4 suits                 |
| `/pyramid`  | Pyramid  | Pairs totalling 13, 3 passes    |

Every game has undo (also Ctrl/⌘+Z), restart, new game, a move counter, a timer and a win screen.
**Auto-save** (on by default, toggle in the toolbar) keeps each game's progress, including undo history, timer and game options. Reopening a game picks up where you left off. Turning it off deletes all saved games.

## Accounts

Signing in is optional; guests can play everything, unless an admin turns **guest play** off under Guest access on the Manage users page. While it's off, visitors who aren't signed in see a sign-in prompt instead of the games (decided on the server, so the game isn't sent to them); signed-in players are unaffected. The setting is stored in the database (`settings` table) and takes effect on the next page load. For signed-in players:

- auto-saves are stored on the account, so a game continues in any browser (a guest save already in the browser moves to the account the first time)
- per-game statistics are kept: games played (counted at the first move), wins, best time, fewest moves (on **Account & stats**)

Accounts are **admin-created only**; there is no public sign-up. Admins use **Manage users** (`/admin/users`) to add users with a temporary password, edit display names and roles, reset passwords, unlock locked accounts, sign users out everywhere, and delete accounts (which deletes their saves and stats). New and reset accounts must choose their own password at their next sign-in.

Security notes: passwords are hashed with scrypt; sessions are random tokens in an httpOnly, SameSite=Lax cookie with only a SHA-256 of the token in the database (30-day lifetime); five wrong passwords lock an account for 15 minutes; every Server Action and API route re-checks the session and role. Statistics come from the player's browser, so treat them as honest-player numbers, not a tamper-proof leaderboard.

To move cards, click a card and then where it should go, drag and drop it, or double-click to send it to the best spot.

## Running

Requires Node.js and PostgreSQL. A local database is provided via Docker:

```bash
npm install
cp .env.example .env.local            # DATABASE_URL etc.
docker compose up -d                  # local Postgres on port 54329
npm run db:migrate                    # create/update tables (safe to re-run)
npm run user:admin -- admin "Admin"   # create the first admin (prompts for a password)
npm run dev                           # http://localhost:3000
```

`npm run user:admin -- <username>` also recovers access: on an existing account it sets a new password, makes it an admin and unlocks it. The password can be given non-interactively with `KINGSOL_PASSWORD=...`.

To serve under a sub-path such as `https://davidkingjr.com/kingsol`, put `NEXT_PUBLIC_BASE_PATH=/kingsol` in `.env.production.local` on the server before building (both `next build` and `next start` read it), and install the NGINX config [deploy/nginx/kingsol.conf](deploy/nginx/kingsol.conf) by symlink:

```bash
# once per server: a folder for the site's apps, included from the existing davidkingjr.com server block
sudo mkdir -p /etc/nginx/davidkingjr.com.d
#   ...and inside that server { } block add:  include /etc/nginx/davidkingjr.com.d/*.conf;

# install or update Kingsol
sudo ln -sfn "$PWD/deploy/nginx/kingsol.conf" /etc/nginx/davidkingjr.com.d/kingsol.conf
sudo nginx -t && sudo systemctl reload nginx
```

It isn't symlinked into `conf.d` because a `/kingsol` path has to live inside the domain's existing `server` block; `conf.d` files load at the `http` level.

For production, set `DATABASE_URL` (and `DATABASE_SSL=true` if your host requires TLS), run `npm run db:migrate`, then `npm run build && npm start` behind HTTPS. Session cookies are Secure in production; set `SESSION_COOKIE_SECURE=false` only when deliberately serving over plain HTTP.

### Docker

`docker-compose.yml` runs the whole app: PostgreSQL (`db`), a one-shot `migrate` service that applies the schema, and the app itself (`app`, a Next.js standalone image running as a non-root user, health-checked at `/api/health`).

```bash
docker compose up -d --build                                      # app on http://127.0.0.1:3000
docker compose run --rm migrate npm run user:admin -- admin "Admin"   # first admin (prompts for a password)
```

Settings go in a `.env` file next to `docker-compose.yml` (git-ignored): `POSTGRES_PASSWORD`, `KINGSOL_PORT` (host port, default 3000, bound to localhost only), `KINGSOL_BASE_PATH` (e.g. `/kingsol` behind the NGINX config; rebuild after changing it) and `SESSION_COOKIE_SECURE`. The comments at the top of `docker-compose.yml` explain each one.

## Layout

- `src/lib/cards.ts`: card model, seeded shuffle, shared stacking rules
- `src/lib/useGame.ts`: game state hook (undo history, moves, timer, win detection, auto-save)
- `src/lib/saveGame.ts`: localStorage save slots and the auto-save preference
- `src/games/*.ts`: rules for each game as pure functions (`deal`, `move`, `isWon`, …)
- `src/components/`: `CardView`, `Slot`, `Column` (nested so dragging a card drags the stack on it), `GameShell`
- `src/app/<game>/`: route page plus the client component for each game
- `db/schema.sql`, `scripts/`: database schema, migration and admin CLI
- `src/lib/session.ts`, `auth.ts`, `users.ts`, `gameData.ts`: server-only sessions, authorization helpers and data access
- `src/app/login`, `account`, `admin/users`, `actions/`: sign-in, account and user-management pages and their Server Actions
- `src/app/api/saves`, `api/stats`: JSON routes the games use to sync saves and record stats

Cards are drawn with CSS. There are no image assets, and card size scales with the viewport via `--cw`.
