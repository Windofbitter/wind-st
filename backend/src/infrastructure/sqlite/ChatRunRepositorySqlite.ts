import crypto from "crypto";
import type {
  ChatRun,
  ChatRunStatus,
  ChatRunTokenUsage,
} from "../../core/entities/ChatRun";
import type {
  ChatRunRepository,
  CreateChatRunInput,
  UpdateChatRunInput,
} from "../../core/ports/ChatRunRepository";
import type { SqliteDatabase } from "./db";

function mapRowToChatRun(row: any): ChatRun {
  return {
    id: row.id,
    chatId: row.chat_id,
    status: row.status as ChatRunStatus,
    userMessageId: row.user_message_id,
    assistantMessageId: row.assistant_message_id ?? null,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? null,
    error: row.error ?? null,
    tokenUsage: row.token_usage
      ? (JSON.parse(row.token_usage) as ChatRunTokenUsage)
      : null,
  };
}

export class ChatRunRepositorySqlite implements ChatRunRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateChatRunInput): Promise<ChatRun> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO chat_runs (
        id,
        chat_id,
        status,
        user_message_id,
        assistant_message_id,
        started_at,
        finished_at,
        error,
        token_usage
      )
      VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL, NULL)
    `.trim(),
    );

    stmt.run(id, data.chatId, data.status, data.userMessageId, data.startedAt);

    return {
      id,
      chatId: data.chatId,
      status: data.status,
      userMessageId: data.userMessageId,
      assistantMessageId: null,
      startedAt: data.startedAt,
      finishedAt: null,
      error: null,
      tokenUsage: null,
    };
  }

  async getById(id: string): Promise<ChatRun | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        chat_id,
        status,
        user_message_id,
        assistant_message_id,
        started_at,
        finished_at,
        error,
        token_usage
      FROM chat_runs
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToChatRun(row);
  }

  async listByChat(chatId: string): Promise<ChatRun[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        chat_id,
        status,
        user_message_id,
        assistant_message_id,
        started_at,
        finished_at,
        error,
        token_usage
      FROM chat_runs
      WHERE chat_id = ?
      ORDER BY started_at DESC
    `.trim(),
    );

    const rows = stmt.all(chatId);
    return rows.map(mapRowToChatRun);
  }

  async update(id: string, patch: UpdateChatRunInput): Promise<ChatRun | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.status !== undefined) {
      sets.push("status = ?");
      params.push(patch.status);
    }
    if (patch.assistantMessageId !== undefined) {
      sets.push("assistant_message_id = ?");
      params.push(patch.assistantMessageId);
    }
    if (patch.finishedAt !== undefined) {
      sets.push("finished_at = ?");
      params.push(patch.finishedAt);
    }
    if (patch.error !== undefined) {
      sets.push("error = ?");
      params.push(patch.error);
    }
    if (patch.tokenUsage !== undefined) {
      sets.push("token_usage = ?");
      params.push(
        patch.tokenUsage ? JSON.stringify(patch.tokenUsage) : null,
      );
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE chat_runs
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

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    const stmt = this.db.prepare(
      `DELETE FROM chat_runs WHERE id IN (${placeholders})`,
    );
    stmt.run(...ids);
  }

  async deleteByMessageIds(
    chatId: string,
    messageIds: string[],
  ): Promise<void> {
    if (messageIds.length === 0) return;
    const placeholders = messageIds.map(() => "?").join(",");
    const stmt = this.db.prepare(
      `
        DELETE FROM chat_runs
        WHERE chat_id = ?
          AND (
            user_message_id IN (${placeholders})
            OR assistant_message_id IN (${placeholders})
          )
      `.trim(),
    );
    stmt.run(chatId, ...messageIds, ...messageIds);
  }
}

