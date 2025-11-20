import crypto from "crypto";
import type { Message, MessageRole, MessageState } from "../../core/entities/Message";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../../core/ports/MessageRepository";
import type { SqliteDatabase } from "./db";

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role as MessageRole,
    content: row.content,
    toolCallId: row.tool_call_id ?? null,
    toolCalls: row.tool_calls ? (JSON.parse(row.tool_calls) as unknown) : null,
    toolResults: row.tool_results
      ? (JSON.parse(row.tool_results) as unknown)
      : null,
    tokenCount: row.token_count ?? null,
    runId: row.run_id ?? null,
    state: (row.state as MessageState | null) ?? "ok",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export class MessageRepositorySqlite implements MessageRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async append(data: CreateMessageInput): Promise<Message> {
    const id = crypto.randomUUID();
    const createdAt = data.createdAt ?? new Date().toISOString();
    const state: MessageState = data.state ?? "ok";

    const stmt = this.db.prepare(
      `
      INSERT INTO messages (
        id,
        chat_id,
        role,
        content,
        tool_call_id,
        tool_calls,
        tool_results,
        token_count,
        run_id,
        state,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.chatId,
      data.role,
      data.content,
      data.toolCallId ?? null,
      data.toolCalls === undefined || data.toolCalls === null
        ? null
        : JSON.stringify(data.toolCalls),
      data.toolResults === undefined || data.toolResults === null
        ? null
        : JSON.stringify(data.toolResults),
      data.tokenCount ?? null,
      data.runId ?? null,
      state,
      createdAt,
    );

    return {
      id,
      chatId: data.chatId,
      role: data.role,
      content: data.content,
      toolCallId: data.toolCallId ?? null,
      toolCalls: data.toolCalls ?? null,
      toolResults: data.toolResults ?? null,
      tokenCount: data.tokenCount ?? null,
      runId: data.runId ?? null,
      state,
      createdAt,
    };
  }

  async listForChat(
    chatId: string,
    options?: ListMessagesOptions,
  ): Promise<Message[]> {
    let limitOffsetClause = "";
    const hasLimit = options?.limit !== undefined && options.limit > 0;
    const hasOffset = options?.offset !== undefined && options.offset > 0;

    if (hasLimit) {
      limitOffsetClause += ` LIMIT ${options!.limit}`;
      if (hasOffset) {
        limitOffsetClause += ` OFFSET ${options!.offset}`;
      }
    } else if (hasOffset) {
      // SQLite requires LIMIT when OFFSET is used; LIMIT -1 means "no limit".
      limitOffsetClause += ` LIMIT -1 OFFSET ${options!.offset}`;
    }

    const sql =
      `
      SELECT
        id,
        chat_id,
        role,
        content,
        tool_call_id,
        tool_calls,
        tool_results,
        token_count,
        run_id,
        state,
        created_at
      FROM messages
      WHERE chat_id = ?
      ORDER BY created_at ASC, rowid ASC
    `.trim() + limitOffsetClause;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(chatId);
    return rows.map(mapRowToMessage);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    const stmt = this.db.prepare(
      `DELETE FROM messages WHERE id IN (${placeholders})`,
    );
    stmt.run(...ids);
  }
}
