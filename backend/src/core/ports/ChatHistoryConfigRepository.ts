import type { ChatHistoryConfig } from "../entities/ChatHistoryConfig";

export interface CreateChatHistoryConfigInput {
  chatId: string;
  historyEnabled: boolean;
  messageLimit: number;
}

export interface UpdateChatHistoryConfigInput {
  historyEnabled?: boolean;
  messageLimit?: number;
}

export interface ChatHistoryConfigRepository {
  create(data: CreateChatHistoryConfigInput): Promise<ChatHistoryConfig>;
  getByChatId(chatId: string): Promise<ChatHistoryConfig | null>;
  updateByChatId(
    chatId: string,
    patch: UpdateChatHistoryConfigInput,
  ): Promise<ChatHistoryConfig | null>;
  deleteByChatId(chatId: string): Promise<void>;
}

