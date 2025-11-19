import crypto from "crypto";
import type { Chat } from "../../core/entities/Chat";
import type {
  ChatFilter,
  ChatRepository,
  CreateChatInput,
  UpdateChatInput,
} from "../../core/ports/ChatRepository";
import type { SqliteDatabase } from "./db";

function nowIso(): string {
  return new Date().toISOString();
}

function mapRowToChat(row: any): Chat {
  return {
    id: row.id,
    characterId: row.character_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ChatRepositorySqlite implements ChatRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateChatInput): Promise<Chat> {
    const id = crypto.randomUUID();
    const createdAt = nowIso();
    const updatedAt = createdAt;

    const stmt = this.db.prepare(
      `
      INSERT INTO chats (
        id,
        character_id,
        title,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(id, data.characterId, data.title, createdAt, updatedAt);

    return {
      id,
      characterId: data.characterId,
      title: data.title,
      createdAt,
      updatedAt,
    };
  }

  async getById(id: string): Promise<Chat | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        character_id,
        title,
        created_at,
        updated_at
      FROM chats
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToChat(row);
  }

  async list(filter?: ChatFilter): Promise<Chat[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter?.characterId) {
      where.push("character_id = ?");
      params.push(filter.characterId);
    }

    const sql =
      `
      SELECT
        id,
        character_id,
        title,
        created_at,
        updated_at
      FROM chats
    ` +
      (where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY created_at DESC";

    const stmt = this.db.prepare(sql.trim());
    const rows = stmt.all(...params);
    return rows.map(mapRowToChat);
  }

  async update(id: string, patch: UpdateChatInput): Promise<Chat | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.title !== undefined) {
      sets.push("title = ?");
      params.push(patch.title);
    }
    if (patch.updatedAt !== undefined) {
      sets.push("updated_at = ?");
      params.push(patch.updatedAt);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE chats
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
    const stmt = this.db.prepare("DELETE FROM chats WHERE id = ?");
    stmt.run(id);
  }
}

