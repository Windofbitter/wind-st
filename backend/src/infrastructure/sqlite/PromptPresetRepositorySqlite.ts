import crypto from "crypto";
import type { PromptPreset, PromptRole } from "../../core/entities/PromptPreset";
import type {
  CreatePromptPresetInput,
  PromptPresetRepository,
  UpdatePromptPresetInput,
} from "../../core/ports/PromptPresetRepository";
import type { SqliteDatabase } from "./db";

function mapRowToPromptPreset(row: any): PromptPreset {
  return {
    id: row.id,
    characterId: row.character_id,
    presetId: row.preset_id,
    role: row.role as PromptRole,
    sortOrder: row.sort_order,
  };
}

export class PromptPresetRepositorySqlite implements PromptPresetRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreatePromptPresetInput): Promise<PromptPreset> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO prompt_presets (
        id,
        character_id,
        preset_id,
        role,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.characterId,
      data.presetId,
      data.role,
      data.sortOrder,
    );

    return {
      id,
      characterId: data.characterId,
      presetId: data.presetId,
      role: data.role,
      sortOrder: data.sortOrder,
    };
  }

  async getById(id: string): Promise<PromptPreset | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        preset_id,
        role,
        sort_order
      FROM prompt_presets
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToPromptPreset(row);
  }

  async listByCharacter(characterId: string): Promise<PromptPreset[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        preset_id,
        role,
        sort_order
      FROM prompt_presets
      WHERE character_id = ?
      ORDER BY sort_order ASC
    `.trim(),
    );

    const rows = stmt.all(characterId);
    return rows.map(mapRowToPromptPreset);
  }

  async update(
    id: string,
    patch: UpdatePromptPresetInput,
  ): Promise<PromptPreset | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.role !== undefined) {
      sets.push("role = ?");
      params.push(patch.role);
    }
    if (patch.sortOrder !== undefined) {
      sets.push("sort_order = ?");
      params.push(patch.sortOrder);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE prompt_presets
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
    const stmt = this.db.prepare("DELETE FROM prompt_presets WHERE id = ?");
    stmt.run(id);
  }
}

