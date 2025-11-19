import crypto from "crypto";
import type { Preset, PresetKind } from "../../core/entities/Preset";
import type {
  CreatePresetInput,
  PresetFilter,
  PresetRepository,
  UpdatePresetInput,
} from "../../core/ports/PresetRepository";
import type { SqliteDatabase } from "./db";

function mapRowToPreset(row: any): Preset {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind as PresetKind,
    content: row.content,
    builtIn: row.built_in === 1,
  };
}

export class PresetRepositorySqlite implements PresetRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreatePresetInput): Promise<Preset> {
    const id = crypto.randomUUID();
    const builtIn = data.builtIn ?? false;

    const stmt = this.db.prepare(
      `
      INSERT INTO presets (
        id,
        title,
        description,
        kind,
        content,
        built_in
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.title,
      data.description,
      data.kind,
      data.content ?? null,
      builtIn ? 1 : 0,
    );

    return {
      id,
      title: data.title,
      description: data.description,
      kind: data.kind,
      content: data.content ?? null,
      builtIn,
    };
  }

  async getById(id: string): Promise<Preset | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        title,
        description,
        kind,
        content,
        built_in
      FROM presets
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToPreset(row);
  }

  async list(filter?: PresetFilter): Promise<Preset[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter?.kind) {
      where.push("kind = ?");
      params.push(filter.kind);
    }

    if (filter?.builtIn !== undefined) {
      where.push("built_in = ?");
      params.push(filter.builtIn ? 1 : 0);
    }

    if (filter?.titleContains) {
      where.push("title LIKE ?");
      params.push(`%${filter.titleContains}%`);
    }

    const sql =
      `
      SELECT
        id,
        title,
        description,
        kind,
        content,
        built_in
      FROM presets
    ` +
      (where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY title ASC";

    const stmt = this.db.prepare(sql.trim());
    const rows = stmt.all(...params);
    return rows.map(mapRowToPreset);
  }

  async update(id: string, patch: UpdatePresetInput): Promise<Preset | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.title !== undefined) {
      sets.push("title = ?");
      params.push(patch.title);
    }
    if (patch.description !== undefined) {
      sets.push("description = ?");
      params.push(patch.description);
    }
    if (patch.content !== undefined) {
      sets.push("content = ?");
      params.push(patch.content);
    }
    if (patch.builtIn !== undefined) {
      sets.push("built_in = ?");
      params.push(patch.builtIn ? 1 : 0);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE presets
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
    const stmt = this.db.prepare("DELETE FROM presets WHERE id = ?");
    stmt.run(id);
  }
}

