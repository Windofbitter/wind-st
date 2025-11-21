import Database from "better-sqlite3";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { runMigrations } from "../../src/infrastructure/sqlite/migrations";
import { UserPersonaRepositorySqlite } from "../../src/infrastructure/sqlite/UserPersonaRepositorySqlite";

export function createTestDatabase(): SqliteDatabase {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db as SqliteDatabase);
  return db as SqliteDatabase;
}

export async function createDefaultUserPersona(
  db: SqliteDatabase,
): Promise<{ id: string }> {
  const repo = new UserPersonaRepositorySqlite(db);
  const existing = await repo.list({ isDefault: true });
  if (existing.length > 0) {
    return { id: existing[0].id };
  }
  const persona = await repo.create({
    name: "Default User",
    description: "Default persona for tests",
    prompt: null,
    isDefault: true,
  });
  return { id: persona.id };
}
