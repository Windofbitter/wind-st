import crypto from "crypto";
import type { LorebookEntry } from "../../core/entities/LorebookEntry";
import type {
  CreateLorebookEntryInput,
  LorebookEntryRepository,
  UpdateLorebookEntryInput,
} from "../../core/ports/LorebookEntryRepository";
import type { SqliteDatabase } from "./db";

function mapRowToLorebookEntry(row: any): LorebookEntry {
  return {
    id: row.id,
    lorebookId: row.lorebook_id,
    keywords: JSON.parse(row.keywords) as string[],
    content: row.content,
    insertionOrder: row.insertion_order,
    isEnabled: row.is_enabled === 1,
  };
}

export class LorebookEntryRepositorySqlite implements LorebookEntryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateLorebookEntryInput): Promise<LorebookEntry> {
    const id = crypto.randomUUID();
    const isEnabled = data.isEnabled ?? true;

    const stmt = this.db.prepare(
      `
      INSERT INTO lorebook_entries (
        id,
        lorebook_id,
        keywords,
        content,
        insertion_order,
        is_enabled
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.lorebookId,
      JSON.stringify(data.keywords),
      data.content,
      data.insertionOrder,
      isEnabled ? 1 : 0,
    );

    return {
      id,
      lorebookId: data.lorebookId,
      keywords: data.keywords,
      content: data.content,
      insertionOrder: data.insertionOrder,
      isEnabled,
    };
  }

  async getById(id: string): Promise<LorebookEntry | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        lorebook_id,
        keywords,
        content,
        insertion_order,
        is_enabled
      FROM lorebook_entries
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToLorebookEntry(row);
  }

  async listByLorebook(lorebookId: string): Promise<LorebookEntry[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        lorebook_id,
        keywords,
        content,
        insertion_order,
        is_enabled
      FROM lorebook_entries
      WHERE lorebook_id = ?
      ORDER BY insertion_order ASC
    `.trim(),
    );

    const rows = stmt.all(lorebookId);
    return rows.map(mapRowToLorebookEntry);
  }

  async update(
    id: string,
    patch: UpdateLorebookEntryInput,
  ): Promise<LorebookEntry | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.keywords !== undefined) {
      sets.push("keywords = ?");
      params.push(JSON.stringify(patch.keywords));
    }
    if (patch.content !== undefined) {
      sets.push("content = ?");
      params.push(patch.content);
    }
    if (patch.insertionOrder !== undefined) {
      sets.push("insertion_order = ?");
      params.push(patch.insertionOrder);
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
      UPDATE lorebook_entries
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
    const stmt = this.db.prepare("DELETE FROM lorebook_entries WHERE id = ?");
    stmt.run(id);
  }
}

