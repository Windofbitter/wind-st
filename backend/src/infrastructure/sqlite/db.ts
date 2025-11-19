import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { appConfig } from "../../config";
import { runMigrations } from "./migrations";

export type SqliteDatabase = BetterSqliteDatabase;

export function openDatabase(): SqliteDatabase {
  const dbPath = appConfig.database.sqlitePath;
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  // Improve concurrency and durability trade-offs for dev/typical usage.
  // - WAL allows readers during writes and reduces full-db locking.
  // - busy_timeout helps avoid immediate failures under brief contention.
  // - synchronous=NORMAL is a common pairing with WAL for performance.
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  return db;
}
