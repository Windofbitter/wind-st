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
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  return db;
}
