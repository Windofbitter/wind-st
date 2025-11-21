import type { ChatHistoryConfig } from "../../core/entities/ChatHistoryConfig";
import type {
  ChatHistoryConfigRepository,
  CreateChatHistoryConfigInput,
  UpdateChatHistoryConfigInput,
} from "../../core/ports/ChatHistoryConfigRepository";
import type { SqliteDatabase } from "./db";

function mapRowToChatHistoryConfig(row: any): ChatHistoryConfig {
  return {
    chatId: row.chat_id,
    historyEnabled: row.history_enabled === 1,
    messageLimit: row.message_limit,
    loreScanTokenLimit: row.lore_scan_token_limit ?? 1500,
  };
}

export class ChatHistoryConfigRepositorySqlite
  implements ChatHistoryConfigRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  async create(
    data: CreateChatHistoryConfigInput,
  ): Promise<ChatHistoryConfig> {
    const stmt = this.db.prepare(
      `
      INSERT INTO chat_history_configs (
        chat_id,
        history_enabled,
        message_limit,
        lore_scan_token_limit
      )
      VALUES (?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      data.chatId,
      data.historyEnabled ? 1 : 0,
      data.messageLimit,
      data.loreScanTokenLimit,
    );

    return {
      chatId: data.chatId,
      historyEnabled: data.historyEnabled,
      messageLimit: data.messageLimit,
      loreScanTokenLimit: data.loreScanTokenLimit,
    };
  }

  async getByChatId(chatId: string): Promise<ChatHistoryConfig | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        chat_id,
        history_enabled,
        message_limit,
        lore_scan_token_limit
      FROM chat_history_configs
      WHERE chat_id = ?
    `.trim(),
    );

    const row = stmt.get(chatId);
    if (!row) return null;
    return mapRowToChatHistoryConfig(row);
  }

  async updateByChatId(
    chatId: string,
    patch: UpdateChatHistoryConfigInput,
  ): Promise<ChatHistoryConfig | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.historyEnabled !== undefined) {
      sets.push("history_enabled = ?");
      params.push(patch.historyEnabled ? 1 : 0);
    }
    if (patch.messageLimit !== undefined) {
      sets.push("message_limit = ?");
      params.push(patch.messageLimit);
    }
    if (patch.loreScanTokenLimit !== undefined) {
      sets.push("lore_scan_token_limit = ?");
      params.push(patch.loreScanTokenLimit);
    }

    if (sets.length === 0) {
      return this.getByChatId(chatId);
    }

    const sql =
      `
      UPDATE chat_history_configs
      SET ${sets.join(", ")}
      WHERE chat_id = ?
    `.trim();

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params, chatId);
    if (result.changes === 0) {
      return null;
    }
    return this.getByChatId(chatId);
  }

  async deleteByChatId(chatId: string): Promise<void> {
    const stmt = this.db.prepare(
      "DELETE FROM chat_history_configs WHERE chat_id = ?",
    );
    stmt.run(chatId);
  }
}
