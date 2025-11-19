import crypto from "crypto";
import type { CharacterLorebook } from "../../core/entities/CharacterLorebook";
import type {
  CharacterLorebookRepository,
  CreateCharacterLorebookInput,
} from "../../core/ports/CharacterLorebookRepository";
import type { SqliteDatabase } from "./db";

function mapRowToCharacterLorebook(row: any): CharacterLorebook {
  return {
    id: row.id,
    characterId: row.character_id,
    lorebookId: row.lorebook_id,
  };
}

export class CharacterLorebookRepositorySqlite
  implements CharacterLorebookRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  async create(
    data: CreateCharacterLorebookInput,
  ): Promise<CharacterLorebook> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO character_lorebooks (
        id,
        character_id,
        lorebook_id
      )
      VALUES (?, ?, ?)
    `.trim(),
    );

    stmt.run(id, data.characterId, data.lorebookId);

    return {
      id,
      characterId: data.characterId,
      lorebookId: data.lorebookId,
    };
  }

  async getById(id: string): Promise<CharacterLorebook | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        lorebook_id
      FROM character_lorebooks
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToCharacterLorebook(row);
  }

  async listByCharacter(characterId: string): Promise<CharacterLorebook[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        lorebook_id
      FROM character_lorebooks
      WHERE character_id = ?
      ORDER BY id ASC
    `.trim(),
    );

    const rows = stmt.all(characterId);
    return rows.map(mapRowToCharacterLorebook);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(
      "DELETE FROM character_lorebooks WHERE id = ?",
    );
    stmt.run(id);
  }
}

