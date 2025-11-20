import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { runMigrations } from "./migrations";

export type SqliteDatabase = BetterSqliteDatabase;

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const CONFIG_PATH = path.resolve(PROJECT_ROOT, "config.json");
const DEFAULT_DB_PATH = path.resolve(PROJECT_ROOT, "data", "app.db");

function resolveDbPath(): string {
  let configuredPath: string | undefined;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw) as {
        database?: { sqlitePath?: string };
      };
      const configured = parsed.database?.sqlitePath;
      if (configured && typeof configured === "string") {
        configuredPath = path.resolve(PROJECT_ROOT, configured);
      }
    }
  } catch {
    // ignore parse errors; fall back to defaults/migration below.
  }

  return configuredPath ?? DEFAULT_DB_PATH;
}

export function openDatabase(): SqliteDatabase {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  return db;
}
