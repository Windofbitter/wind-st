import crypto from "crypto";
import type { UserPersona } from "../../core/entities/UserPersona";
import type {
  CreateUserPersonaInput,
  UpdateUserPersonaInput,
  UserPersonaFilter,
  UserPersonaRepository,
} from "../../core/ports/UserPersonaRepository";
import type { SqliteDatabase } from "./db";

function mapRow(row: any): UserPersona {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    prompt: row.prompt ?? null,
    isDefault: !!row.is_default,
  };
}

export class UserPersonaRepositorySqlite implements UserPersonaRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateUserPersonaInput): Promise<UserPersona> {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(
      `
      INSERT INTO user_personas (
        id,
        name,
        description,
        prompt,
        is_default
      )
      VALUES (?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.name,
      data.description ?? null,
      data.prompt ?? null,
      data.isDefault ? 1 : 0,
    );

    return {
      id,
      name: data.name,
      description: data.description ?? null,
      prompt: data.prompt ?? null,
      isDefault: !!data.isDefault,
    };
  }

  async getById(id: string): Promise<UserPersona | null> {
    const stmt = this.db.prepare(
      `
      SELECT id, name, description, prompt, is_default
      FROM user_personas
      WHERE id = ?
    `.trim(),
    );
    const row = stmt.get(id);
    return row ? mapRow(row) : null;
  }

  async list(filter?: UserPersonaFilter): Promise<UserPersona[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter?.isDefault !== undefined) {
      where.push("is_default = ?");
      params.push(filter.isDefault ? 1 : 0);
    }

    const sql =
      `
      SELECT id, name, description, prompt, is_default
      FROM user_personas
    ` +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY name ASC";

    const stmt = this.db.prepare(sql.trim());
    const rows = stmt.all(...params);
    return rows.map(mapRow);
  }

  async update(
    id: string,
    patch: UpdateUserPersonaInput,
  ): Promise<UserPersona | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      sets.push("name = ?");
      params.push(patch.name);
    }
    if (patch.description !== undefined) {
      sets.push("description = ?");
      params.push(patch.description);
    }
    if (patch.prompt !== undefined) {
      sets.push("prompt = ?");
      params.push(patch.prompt);
    }
    if (patch.isDefault !== undefined) {
      sets.push("is_default = ?");
      params.push(patch.isDefault ? 1 : 0);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE user_personas
      SET ${sets.join(", ")}
      WHERE id = ?
    `.trim();

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params, id);
    if (result.changes === 0) return null;
    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM user_personas WHERE id = ?");
    stmt.run(id);
  }
}
