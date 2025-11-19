import crypto from "crypto";
import type { LLMConnection, LLMProvider } from "../../core/entities/LLMConnection";
import type {
  CreateLLMConnectionInput,
  LLMConnectionRepository,
  UpdateLLMConnectionInput,
} from "../../core/ports/LLMConnectionRepository";
import type { SqliteDatabase } from "./db";

function mapRowToLLMConnection(row: any): LLMConnection {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as LLMProvider,
    baseUrl: row.base_url,
    defaultModel: row.default_model,
    isEnabled: row.is_enabled === 1,
  };
}

export class LLMConnectionRepositorySqlite implements LLMConnectionRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateLLMConnectionInput): Promise<LLMConnection> {
    const id = crypto.randomUUID();
    const isEnabled = data.isEnabled ?? true;

    const stmt = this.db.prepare(
      `
      INSERT INTO llm_connections (
        id,
        name,
        provider,
        base_url,
        default_model,
        is_enabled
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.name,
      data.provider,
      data.baseUrl,
      data.defaultModel,
      isEnabled ? 1 : 0,
    );

    return {
      id,
      name: data.name,
      provider: data.provider,
      baseUrl: data.baseUrl,
      defaultModel: data.defaultModel,
      isEnabled,
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
        is_enabled
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
        is_enabled
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
    if (patch.isEnabled !== undefined) {
      sets.push("is_enabled = ?");
      params.push(patch.isEnabled ? 1 : 0);
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
        throw new Error(
          "Cannot delete LLM connection: it is used by one or more chats. Disable it or move those chats to another connection first.",
        );
      }
      throw err;
    }
  }
}
