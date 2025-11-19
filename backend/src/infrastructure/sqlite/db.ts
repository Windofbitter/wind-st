import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { runMigrations } from "./migrations";

export type SqliteDatabase = BetterSqliteDatabase;

// Use a fixed SQLite file under backend/data, independent of process.cwd().
const DB_PATH = path.resolve(__dirname, "..", "..", "data", "app.db");

export function openDatabase(): SqliteDatabase {
  const dir = path.dirname(DB_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  return db;
}
