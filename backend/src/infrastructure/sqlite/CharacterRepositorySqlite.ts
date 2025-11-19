import type { Character } from "../../core/entities/Character";
import type {
  CharacterFilter,
  CharacterRepository,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../../core/ports/CharacterRepository";
import type { SqliteDatabase } from "./db";
import crypto from "crypto";

function mapRowToCharacter(row: any): Character {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    persona: row.persona,
    avatarPath: row.avatar_path,
    creatorNotes: row.creator_notes,
  };
}

export class CharacterRepositorySqlite implements CharacterRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateCharacterInput): Promise<Character> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO characters (
        id,
        name,
        description,
        persona,
        avatar_path,
        creator_notes
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.name,
      data.description,
      data.persona,
      data.avatarPath,
      data.creatorNotes ?? null,
    );

    return {
      id,
      name: data.name,
      description: data.description,
      persona: data.persona,
      avatarPath: data.avatarPath,
      creatorNotes: data.creatorNotes ?? null,
    };
  }

  async getById(id: string): Promise<Character | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        name,
        description,
        persona,
        avatar_path,
        creator_notes
      FROM characters
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToCharacter(row);
  }

  async list(filter?: CharacterFilter): Promise<Character[]> {
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
        description,
        persona,
        avatar_path,
        creator_notes
      FROM characters
    ` +
      (where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY name ASC";

    const stmt = this.db.prepare(sql.trim());
    const rows = stmt.all(...params);
    return rows.map(mapRowToCharacter);
  }

  async update(id: string, patch: UpdateCharacterInput): Promise<Character | null> {
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
    if (patch.persona !== undefined) {
      sets.push("persona = ?");
      params.push(patch.persona);
    }
    if (patch.avatarPath !== undefined) {
      sets.push("avatar_path = ?");
      params.push(patch.avatarPath);
    }
    if (patch.creatorNotes !== undefined) {
      sets.push("creator_notes = ?");
      params.push(patch.creatorNotes);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE characters
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
    const stmt = this.db.prepare(`DELETE FROM characters WHERE id = ?`);
    stmt.run(id);
  }
}

