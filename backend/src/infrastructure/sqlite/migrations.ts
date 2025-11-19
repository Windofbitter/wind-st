import type { SqliteDatabase } from "./db";

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

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      kind TEXT NOT NULL,
      content TEXT,
      built_in INTEGER NOT NULL,
      config TEXT
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
      description TEXT NOT NULL,
      is_global INTEGER NOT NULL
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

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chats_character
      ON chats(character_id, created_at);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      token_count INTEGER,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat
      ON messages(chat_id, rowid);

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      args TEXT NOT NULL,
      env TEXT NOT NULL,
      is_enabled INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS llm_connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL,
      default_model TEXT NOT NULL,
      is_enabled INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_llm_configs (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      llm_connection_id TEXT NOT NULL,
      model TEXT NOT NULL,
      temperature REAL NOT NULL,
      max_output_tokens INTEGER NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (llm_connection_id) REFERENCES llm_connections(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_llm_configs_chat
      ON chat_llm_configs(chat_id);
  `);
}
