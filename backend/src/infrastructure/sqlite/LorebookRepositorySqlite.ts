import crypto from "crypto";
import type { Lorebook } from "../../core/entities/Lorebook";
import type {
  CreateLorebookInput,
  LorebookFilter,
  LorebookRepository,
  UpdateLorebookInput,
} from "../../core/ports/LorebookRepository";
import type { SqliteDatabase } from "./db";

function mapRowToLorebook(row: any): Lorebook {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
}

export class LorebookRepositorySqlite implements LorebookRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateLorebookInput): Promise<Lorebook> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO lorebooks (
        id,
        name,
        description
      )
      VALUES (?, ?, ?)
    `.trim(),
    );

    stmt.run(id, data.name, data.description);

    return {
      id,
      name: data.name,
      description: data.description,
    };
  }

  async getById(id: string): Promise<Lorebook | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        name,
        description
      FROM lorebooks
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToLorebook(row);
  }

  async list(filter?: LorebookFilter): Promise<Lorebook[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter?.nameContains) {
      where.push("name LIKE ?");
      params.push(`%${filter.nameContains}%`);
    }

    const sql =
      `
      SELECT
        id,
        name,
        description
      FROM lorebooks
    ` +
      (where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY name ASC";

    const stmt = this.db.prepare(sql.trim());
    const rows = stmt.all(...params);
    return rows.map(mapRowToLorebook);
  }

  async update(
    id: string,
    patch: UpdateLorebookInput,
  ): Promise<Lorebook | null> {
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

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE lorebooks
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
    const stmt = this.db.prepare("DELETE FROM lorebooks WHERE id = ?");
    stmt.run(id);
  }
}

