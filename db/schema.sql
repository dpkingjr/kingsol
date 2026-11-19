-- Kingsol database schema. Safe to run repeatedly: `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS users (
  id                    BIGSERIAL PRIMARY KEY,
  username              TEXT NOT NULL,
  display_name          TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  -- set when an admin creates the account or resets its password
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  failed_logins         INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at         TIMESTAMPTZ
);

-- usernames are unique regardless of case
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));

-- Database sessions. The cookie holds a random token; only its SHA-256 hash is stored here.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- One in-progress game per user per game type (auto-save).
CREATE TABLE IF NOT EXISTS game_saves (
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game        TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game)
);

CREATE TABLE IF NOT EXISTS game_stats (
  user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game          TEXT NOT NULL,
  played        INTEGER NOT NULL DEFAULT 0,
  won           INTEGER NOT NULL DEFAULT 0,
  best_seconds  INTEGER,
  best_moves    INTEGER,
  PRIMARY KEY (user_id, game)
);

-- Site-wide settings set by admins, e.g. guest_play = true/false.
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  BIGINT REFERENCES users (id) ON DELETE SET NULL
);
