import crypto from "crypto";
import type { CharacterMCPServer } from "../../core/entities/CharacterMCPServer";
import type {
  CharacterMCPServerRepository,
  CreateCharacterMCPServerInput,
} from "../../core/ports/CharacterMCPServerRepository";
import type { SqliteDatabase } from "./db";

function mapRowToCharacterMCPServer(row: any): CharacterMCPServer {
  return {
    id: row.id,
    characterId: row.character_id,
    mcpServerId: row.mcp_server_id,
  };
}

export class CharacterMCPServerRepositorySqlite
  implements CharacterMCPServerRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  async create(
    data: CreateCharacterMCPServerInput,
  ): Promise<CharacterMCPServer> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO character_mcp_servers (
        id,
        character_id,
        mcp_server_id
      )
      VALUES (?, ?, ?)
    `.trim(),
    );

    stmt.run(id, data.characterId, data.mcpServerId);

    return {
      id,
      characterId: data.characterId,
      mcpServerId: data.mcpServerId,
    };
  }

  async getById(id: string): Promise<CharacterMCPServer | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        mcp_server_id
      FROM character_mcp_servers
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToCharacterMCPServer(row);
  }

  async listByCharacter(
    characterId: string,
  ): Promise<CharacterMCPServer[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        mcp_server_id
      FROM character_mcp_servers
      WHERE character_id = ?
      ORDER BY id ASC
    `.trim(),
    );

    const rows = stmt.all(characterId);
    return rows.map(mapRowToCharacterMCPServer);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(
      "DELETE FROM character_mcp_servers WHERE id = ?",
    );
    stmt.run(id);
  }
}

