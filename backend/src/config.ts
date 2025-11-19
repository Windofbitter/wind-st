import fs from "fs";
import path from "path";

export interface DatabaseConfig {
  sqlitePath: string;
}

export interface AppConfig {
  database: DatabaseConfig;
}

const CONFIG_FILENAME = "config.json";

function loadRawConfig(): unknown {
  const cwd = process.cwd();
  const configPath = path.resolve(cwd, CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file "${CONFIG_FILENAME}" not found in ${cwd}. ` +
        `Create it based on backend/config.json.`,
    );
  }

  const contents = fs.readFileSync(configPath, "utf8");
  return JSON.parse(contents) as unknown;
}

function normalizeConfig(raw: unknown): AppConfig {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("database" in raw) ||
    typeof (raw as any).database !== "object"
  ) {
    throw new Error("Invalid config: missing database section");
  }

  const db = (raw as any).database;
  if (typeof db.sqlitePath !== "string" || db.sqlitePath.trim() === "") {
    throw new Error("Invalid config: database.sqlitePath must be a non-empty string");
  }

  const sqlitePath = path.resolve(process.cwd(), db.sqlitePath);

  return {
    database: {
      sqlitePath,
    },
  };
}

export const appConfig: AppConfig = normalizeConfig(loadRawConfig());

