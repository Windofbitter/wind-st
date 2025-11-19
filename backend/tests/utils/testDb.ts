import Database from "better-sqlite3";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { runMigrations } from "../../src/infrastructure/sqlite/migrations";

export function createTestDatabase(): SqliteDatabase {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db as SqliteDatabase);
  return db as SqliteDatabase;
}
