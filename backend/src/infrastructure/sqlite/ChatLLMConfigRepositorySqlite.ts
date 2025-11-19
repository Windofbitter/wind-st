import crypto from "crypto";
import type { ChatLLMConfig } from "../../core/entities/ChatLLMConfig";
import type {
  ChatLLMConfigRepository,
  CreateChatLLMConfigInput,
  UpdateChatLLMConfigInput,
} from "../../core/ports/ChatLLMConfigRepository";
import type { SqliteDatabase } from "./db";

function mapRowToChatLLMConfig(row: any): ChatLLMConfig {
  return {
    id: row.id,
    chatId: row.chat_id,
    llmConnectionId: row.llm_connection_id,
    model: row.model,
    temperature: row.temperature,
    maxOutputTokens: row.max_output_tokens,
  };
}

export class ChatLLMConfigRepositorySqlite
  implements ChatLLMConfigRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateChatLLMConfigInput): Promise<ChatLLMConfig> {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(
      `
      INSERT INTO chat_llm_configs (
        id,
        chat_id,
        llm_connection_id,
        model,
        temperature,
        max_output_tokens
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.chatId,
      data.llmConnectionId,
      data.model,
      data.temperature,
      data.maxOutputTokens,
    );

    return {
      id,
      chatId: data.chatId,
      llmConnectionId: data.llmConnectionId,
      model: data.model,
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens,
    };
  }

  async getByChatId(chatId: string): Promise<ChatLLMConfig | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        chat_id,
        llm_connection_id,
        model,
        temperature,
        max_output_tokens
      FROM chat_llm_configs
      WHERE chat_id = ?
    `.trim(),
    );

    const row = stmt.get(chatId);
    if (!row) return null;
    return mapRowToChatLLMConfig(row);
  }

  async updateByChatId(
    chatId: string,
    patch: UpdateChatLLMConfigInput,
  ): Promise<ChatLLMConfig | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.llmConnectionId !== undefined) {
      sets.push("llm_connection_id = ?");
      params.push(patch.llmConnectionId);
    }
    if (patch.model !== undefined) {
      sets.push("model = ?");
      params.push(patch.model);
    }
    if (patch.temperature !== undefined) {
      sets.push("temperature = ?");
      params.push(patch.temperature);
    }
    if (patch.maxOutputTokens !== undefined) {
      sets.push("max_output_tokens = ?");
      params.push(patch.maxOutputTokens);
    }

    if (sets.length === 0) {
      return this.getByChatId(chatId);
    }

    const sql =
      `
      UPDATE chat_llm_configs
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
      "DELETE FROM chat_llm_configs WHERE chat_id = ?",
    );
    stmt.run(chatId);
  }
}

