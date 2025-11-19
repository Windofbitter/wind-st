import type { ChatLLMConfig } from "../entities/ChatLLMConfig";

export interface CreateChatLLMConfigInput {
  chatId: string;
  llmConnectionId: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface UpdateChatLLMConfigInput {
  llmConnectionId?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ChatLLMConfigRepository {
  create(data: CreateChatLLMConfigInput): Promise<ChatLLMConfig>;
  getByChatId(chatId: string): Promise<ChatLLMConfig | null>;
  updateByChatId(
    chatId: string,
    patch: UpdateChatLLMConfigInput,
  ): Promise<ChatLLMConfig | null>;
  deleteByChatId(chatId: string): Promise<void>;
}

