import crypto from "crypto";
import type { Message, MessageRole } from "../../core/entities/Message";
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
    toolCalls: row.tool_calls ? (JSON.parse(row.tool_calls) as unknown) : null,
    toolResults: row.tool_results
      ? (JSON.parse(row.tool_results) as unknown)
      : null,
    tokenCount: row.token_count ?? null,
  };
}

export class MessageRepositorySqlite implements MessageRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async append(data: CreateMessageInput): Promise<Message> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO messages (
        id,
        chat_id,
        role,
        content,
        tool_calls,
        tool_results,
        token_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.chatId,
      data.role,
      data.content,
      data.toolCalls === undefined || data.toolCalls === null
        ? null
        : JSON.stringify(data.toolCalls),
      data.toolResults === undefined || data.toolResults === null
        ? null
        : JSON.stringify(data.toolResults),
      data.tokenCount ?? null,
    );

    return {
      id,
      chatId: data.chatId,
      role: data.role,
      content: data.content,
      toolCalls: data.toolCalls ?? null,
      toolResults: data.toolResults ?? null,
      tokenCount: data.tokenCount ?? null,
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
        tool_calls,
        tool_results,
        token_count
      FROM messages
      WHERE chat_id = ?
      ORDER BY rowid ASC
    `.trim() + limitOffsetClause;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(chatId);
    return rows.map(mapRowToMessage);
  }
}
