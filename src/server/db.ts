// The admin area's database: Cloudflare D1 (SQLite). Only the small part of
// the D1 API this code uses is typed here, so tests can run the same code on
// Node's built-in SQLite (tests/server/d1-shim.ts).

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  meta?: { changes?: number; last_row_id?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

/**
 * Schema changes, applied in order the first time the service starts after a
 * deploy. Add new steps to the end; never edit one that has shipped.
 */
export const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      description TEXT NOT NULL DEFAULT '',
      permissions TEXT NOT NULL DEFAULT '[]',
      built_in INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      person_slug TEXT,
      status TEXT NOT NULL DEFAULT 'invited',
      password_hash TEXT,
      failed_logins INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at INTEGER NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS pending_edits (
      id TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      path TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      changes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      decided_by TEXT,
      decided_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS pending_status ON pending_edits(status)`,
  ],
  // Accounts sign in with a username instead of an email address. Existing
  // addresses become usernames, which their owners can then change.
  [`ALTER TABLE users RENAME COLUMN email TO username`],
];

const migrated = new WeakSet<D1Database>();

/** Brings the database up to date. Cheap after the first call in each worker. */
export async function migrate(db: D1Database): Promise<void> {
  if (migrated.has(db)) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)").run();
  const row = await db.prepare("SELECT MAX(version) AS v FROM schema_version").first<{ v: number | null }>();
  const current = row?.v ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    try {
      await db.batch([...MIGRATIONS[i].map((sql) => db.prepare(sql)), db.prepare("INSERT INTO schema_version (version) VALUES (?)").bind(i + 1)]);
    } catch (e) {
      // Another request may have applied this step at the same moment.
      const now = await db.prepare("SELECT MAX(version) AS v FROM schema_version").first<{ v: number | null }>();
      if ((now?.v ?? 0) <= i) throw e;
    }
  }
  migrated.add(db);
}
