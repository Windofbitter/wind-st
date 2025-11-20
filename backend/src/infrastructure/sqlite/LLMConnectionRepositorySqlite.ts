import crypto from "crypto";
import type {
  LLMConnection,
  LLMProvider,
} from "../../core/entities/LLMConnection";
import type {
  CreateLLMConnectionInput,
  LLMConnectionRepository,
  UpdateLLMConnectionInput,
} from "../../core/ports/LLMConnectionRepository";
import type { SqliteDatabase } from "./db";
import { AppError } from "../../application/errors/AppError";

function mapRowToLLMConnection(row: any): LLMConnection {
  const rawStatus = row.status as LLMConnection["status"];
  const status =
    rawStatus === "ok" || rawStatus === "error" ? rawStatus : "unknown";
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as LLMProvider,
    baseUrl: row.base_url,
    defaultModel: row.default_model,
    apiKey: row.api_key,
    isEnabled: row.is_enabled === 1,
    status,
    lastTestedAt: row.last_tested_at ?? null,
    modelsAvailable:
      row.models_available === null || row.models_available === undefined
        ? null
        : Number(row.models_available),
  };
}

export class LLMConnectionRepositorySqlite implements LLMConnectionRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateLLMConnectionInput): Promise<LLMConnection> {
    const id = crypto.randomUUID();
    const isEnabled = data.isEnabled ?? true;
    const apiKey = data.apiKey;
    const status = data.status ?? "unknown";
    const lastTestedAt = data.lastTestedAt ?? null;
    const modelsAvailable =
      data.modelsAvailable === undefined ? null : data.modelsAvailable;

    const stmt = this.db.prepare(
      `
      INSERT INTO llm_connections (
        id,
        name,
        provider,
        base_url,
        default_model,
        api_key,
        is_enabled,
        status,
        last_tested_at,
        models_available
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.name,
      data.provider,
      data.baseUrl,
      data.defaultModel,
      apiKey,
      isEnabled ? 1 : 0,
      status,
    );

    return {
      id,
      name: data.name,
      provider: data.provider,
      baseUrl: data.baseUrl,
      defaultModel: data.defaultModel,
      apiKey,
      isEnabled,
      status,
      lastTestedAt,
    modelsAvailable,
    };
  }

  async getById(id: string): Promise<LLMConnection | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        name,
        provider,
        base_url,
        default_model,
        api_key,
        is_enabled,
        status,
        last_tested_at,
        models_available
      FROM llm_connections
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToLLMConnection(row);
  }

  async list(): Promise<LLMConnection[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        name,
        provider,
        base_url,
        default_model,
        api_key,
        is_enabled,
        status,
        last_tested_at,
        models_available
      FROM llm_connections
      ORDER BY name ASC
    `.trim(),
    );

    const rows = stmt.all();
    return rows.map(mapRowToLLMConnection);
  }

  async update(
    id: string,
    patch: UpdateLLMConnectionInput,
  ): Promise<LLMConnection | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      sets.push("name = ?");
      params.push(patch.name);
    }
    if (patch.baseUrl !== undefined) {
      sets.push("base_url = ?");
      params.push(patch.baseUrl);
    }
    if (patch.defaultModel !== undefined) {
      sets.push("default_model = ?");
      params.push(patch.defaultModel);
    }
    if (patch.apiKey !== undefined) {
      sets.push("api_key = ?");
      params.push(patch.apiKey);
    }
    if (patch.isEnabled !== undefined) {
      sets.push("is_enabled = ?");
      params.push(patch.isEnabled ? 1 : 0);
    }
    if (patch.status !== undefined) {
      sets.push("status = ?");
      params.push(patch.status);
    }
    if (patch.lastTestedAt !== undefined) {
      sets.push("last_tested_at = ?");
      params.push(patch.lastTestedAt);
    }
    if (patch.modelsAvailable !== undefined) {
      sets.push("models_available = ?");
      params.push(patch.modelsAvailable);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE llm_connections
      SET ${sets.join(", ")}
      WHERE id = ?
    `.trim();

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params, id);
    if (result.changes === 0) {
      return null;
    }
    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM llm_connections WHERE id = ?");
    try {
      stmt.run(id);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("FOREIGN KEY constraint failed")
      ) {
        throw new AppError(
          "CANNOT_DELETE_LLM_CONNECTION_IN_USE",
          "Cannot delete LLM connection: it is used by one or more chats. Disable it or move those chats to another connection first.",
        );
      }
      throw err;
    }
  }
}
