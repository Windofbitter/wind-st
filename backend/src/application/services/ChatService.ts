import type { Chat } from "../../core/entities/Chat";
import type { ChatLLMConfig } from "../../core/entities/ChatLLMConfig";
import type { CreateChatInput, ChatFilter } from "../../core/ports/ChatRepository";
import type {
  ChatLLMConfigRepository,
  CreateChatLLMConfigInput,
  UpdateChatLLMConfigInput,
} from "../../core/ports/ChatLLMConfigRepository";
import type { ChatRepository } from "../../core/ports/ChatRepository";
import {
  DEFAULT_MAX_TOOL_ITERATIONS,
  DEFAULT_TOOL_CALL_TIMEOUT_MS,
} from "../config/llmDefaults";

export class ChatService {
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly chatConfigRepo: ChatLLMConfigRepository,
  ) {}

  async createChat(
    data: CreateChatInput,
    initialConfig?: Omit<CreateChatLLMConfigInput, "chatId">,
  ): Promise<{ chat: Chat; llmConfig: ChatLLMConfig | null }> {
    const chat = await this.chatRepo.create(data);

    let llmConfig: ChatLLMConfig | null = null;
    if (initialConfig) {
      llmConfig = await this.chatConfigRepo.create({
        ...initialConfig,
        chatId: chat.id,
        maxToolIterations:
          initialConfig.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS,
        toolCallTimeoutMs:
          initialConfig.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
      });
    }

    return { chat, llmConfig };
  }

  async getChat(id: string): Promise<Chat | null> {
    return this.chatRepo.getById(id);
  }

  async listChats(filter?: ChatFilter): Promise<Chat[]> {
    return this.chatRepo.list(filter);
  }

  async deleteChat(id: string): Promise<void> {
    await this.chatRepo.delete(id);
    await this.chatConfigRepo.deleteByChatId(id);
  }

  async getChatLLMConfig(chatId: string): Promise<ChatLLMConfig | null> {
    return this.chatConfigRepo.getByChatId(chatId);
  }

  async updateChatLLMConfig(
    chatId: string,
    patch: UpdateChatLLMConfigInput,
  ): Promise<ChatLLMConfig | null> {
    return this.chatConfigRepo.updateByChatId(chatId, patch);
  }
}

