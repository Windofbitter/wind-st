import crypto from "crypto";
import type { SqliteDatabase } from "./db";

function ensureColumn(
  db: SqliteDatabase,
  table: string,
  column: string,
  definition: string,
): void {
  const pragma = db.prepare(
    `PRAGMA table_info(${table})`,
  );
  const columns = pragma.all() as Array<{ name: string }>;
  if (columns.some((col) => col.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// SQLite cannot ADD COLUMN with a non-constant DEFAULT expression (e.g., datetime('now')).
// For legacy databases missing created_at, add a simple TEXT column and backfill to now.
function ensureTimestampColumn(
  db: SqliteDatabase,
  table: string,
  column: string,
): void {
  const pragma = db.prepare(`PRAGMA table_info(${table})`);
  const columns = pragma.all() as Array<{ name: string }>;
  if (columns.some((col) => col.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
  db.exec(
    `UPDATE ${table} SET ${column} = datetime('now') WHERE ${column} IS NULL`,
  );
}

function ensureDefaultUserPersona(db: SqliteDatabase): string {
  const existingDefault = db.prepare(
    `SELECT id FROM user_personas WHERE is_default = 1 LIMIT 1`,
  ).get() as { id: string } | undefined;
  if (existingDefault?.id) {
    return existingDefault.id;
  }

  const anyPersona = db.prepare(
    `SELECT id FROM user_personas ORDER BY rowid LIMIT 1`,
  ).get() as { id: string } | undefined;
  if (anyPersona?.id) {
    db.prepare(
      `UPDATE user_personas SET is_default = 1 WHERE id = ?`,
    ).run(anyPersona.id);
    return anyPersona.id;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `
    INSERT INTO user_personas (
      id,
      name,
      description,
      prompt,
      is_default
    )
    VALUES (?, ?, ?, ?, 1)
  `.trim(),
  ).run(id, "Default User", "Auto-created during migration", null);

  return id;
}

export function runMigrations(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      persona TEXT NOT NULL,
      avatar_path TEXT NOT NULL,
      creator_notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_characters_name
      ON characters(name);

    CREATE TABLE IF NOT EXISTS user_personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT,
      is_default INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      kind TEXT NOT NULL,
      content TEXT,
      built_in INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_presets_kind
      ON presets(kind);

    CREATE TABLE IF NOT EXISTS prompt_presets (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      preset_id TEXT NOT NULL,
      role TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_prompt_presets_character
      ON prompt_presets(character_id, sort_order);

    CREATE TABLE IF NOT EXISTS lorebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lorebook_entries (
      id TEXT PRIMARY KEY,
      lorebook_id TEXT NOT NULL,
      keywords TEXT NOT NULL,
      content TEXT NOT NULL,
      insertion_order INTEGER NOT NULL,
      is_enabled INTEGER NOT NULL,
      FOREIGN KEY (lorebook_id) REFERENCES lorebooks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lorebook_entries_lorebook
      ON lorebook_entries(lorebook_id, insertion_order);

    CREATE TABLE IF NOT EXISTS character_lorebooks (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      lorebook_id TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (lorebook_id) REFERENCES lorebooks(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_character_lorebooks_unique
      ON character_lorebooks(character_id, lorebook_id);

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      user_persona_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (user_persona_id) REFERENCES user_personas(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_chats_character
      ON chats(character_id, created_at);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_call_id TEXT,
      tool_calls TEXT,
      tool_results TEXT,
      token_count INTEGER,
      run_id TEXT,
      state TEXT NOT NULL DEFAULT 'ok',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat
      ON messages(chat_id);

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      args TEXT NOT NULL,
      env TEXT NOT NULL,
      is_enabled INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_checked_at TEXT,
      tool_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS character_mcp_servers (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      mcp_server_id TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (mcp_server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_character_mcp_servers_unique
      ON character_mcp_servers(character_id, mcp_server_id);

    CREATE TABLE IF NOT EXISTS llm_connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL,
      default_model TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_enabled INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_tested_at TEXT,
      models_available INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_llm_configs (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      llm_connection_id TEXT NOT NULL,
      model TEXT NOT NULL,
      temperature REAL NOT NULL,
      max_output_tokens INTEGER NOT NULL,
      max_tool_iterations INTEGER NOT NULL DEFAULT 3,
      tool_call_timeout_ms INTEGER NOT NULL DEFAULT 15000,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (llm_connection_id) REFERENCES llm_connections(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_llm_configs_chat
      ON chat_llm_configs(chat_id);

    CREATE TABLE IF NOT EXISTS chat_runs (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      status TEXT NOT NULL,
      user_message_id TEXT NOT NULL,
      assistant_message_id TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      error TEXT,
      token_usage TEXT,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_runs_chat_status
      ON chat_runs(chat_id, status, started_at);

    CREATE TABLE IF NOT EXISTS chat_history_configs (
      chat_id TEXT PRIMARY KEY,
      history_enabled INTEGER NOT NULL,
      message_limit INTEGER NOT NULL,
      lore_scan_token_limit INTEGER NOT NULL DEFAULT 1500,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );
  `);

  // Add new columns for existing databases without failing when they already exist.
  ensureColumn(db, "messages", "tool_call_id", "TEXT");
  ensureColumn(db, "messages", "run_id", "TEXT");
  ensureColumn(db, "messages", "state", "TEXT NOT NULL DEFAULT 'ok'");
  ensureTimestampColumn(db, "messages", "created_at");
  ensureColumn(db, "chat_llm_configs", "max_tool_iterations", "INTEGER NOT NULL DEFAULT 3");
  ensureColumn(db, "chat_llm_configs", "tool_call_timeout_ms", "INTEGER NOT NULL DEFAULT 15000");
  ensureColumn(db, "chats", "user_persona_id", "TEXT");
  ensureColumn(db, "llm_connections", "status", "TEXT NOT NULL DEFAULT 'unknown'");
  ensureColumn(db, "llm_connections", "last_tested_at", "TEXT");
  ensureColumn(db, "llm_connections", "models_available", "INTEGER");

  ensureColumn(db, "chat_history_configs", "lore_scan_token_limit", "INTEGER NOT NULL DEFAULT 1500");

  ensureColumn(db, "mcp_servers", "status", "TEXT NOT NULL DEFAULT 'unknown'");
  ensureColumn(db, "mcp_servers", "last_checked_at", "TEXT");
  ensureColumn(db, "mcp_servers", "tool_count", "INTEGER");

  const defaultUserPersonaId = ensureDefaultUserPersona(db);
  db.prepare(
    `UPDATE chats SET user_persona_id = ? WHERE user_persona_id IS NULL`,
  ).run(defaultUserPersonaId);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_chats_user_persona
      ON chats(user_persona_id, created_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at
      ON messages(chat_id, created_at)`,
  );
}
