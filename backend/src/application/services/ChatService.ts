import type { Chat } from "../../core/entities/Chat";
import type { ChatLLMConfig } from "../../core/entities/ChatLLMConfig";
import type { CreateChatInput, ChatFilter } from "../../core/ports/ChatRepository";
import type {
  ChatLLMConfigRepository,
  CreateChatLLMConfigInput,
  UpdateChatLLMConfigInput,
} from "../../core/ports/ChatLLMConfigRepository";
import type { ChatRepository } from "../../core/ports/ChatRepository";
import type { UserPersonaService } from "./UserPersonaService";
import { LLMConnectionService } from "./LLMConnectionService";
import { AppError } from "../errors/AppError";
import {
  DEFAULT_MAX_TOOL_ITERATIONS,
  DEFAULT_TOOL_CALL_TIMEOUT_MS,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from "../config/llmDefaults";

export class ChatService {
  constructor(
    private readonly chatRepo: ChatRepository,
    private readonly chatConfigRepo: ChatLLMConfigRepository,
    private readonly llmConnectionService: LLMConnectionService,
    private readonly userPersonaService: UserPersonaService,
  ) {}

  private async resolveConfigInput(
    chatId: string,
    overrides?: Partial<CreateChatLLMConfigInput>,
  ): Promise<CreateChatLLMConfigInput | null> {
    const connection = await this.llmConnectionService.getDefaultConnection(
      overrides?.llmConnectionId,
    );
    if (!connection) return null;

    return {
      chatId,
      llmConnectionId: connection.id,
      model: overrides?.model ?? connection.defaultModel,
      temperature: overrides?.temperature ?? DEFAULT_TEMPERATURE,
      maxOutputTokens:
        overrides?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      maxToolIterations:
        overrides?.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS,
      toolCallTimeoutMs:
        overrides?.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
    };
  }

  async createChat(
    data: CreateChatInput,
    initialConfig?: Omit<CreateChatLLMConfigInput, "chatId">,
  ): Promise<{ chat: Chat; llmConfig: ChatLLMConfig | null }> {
    const persona = await this.userPersonaService.getById(
      data.userPersonaId,
    );
    if (!persona) {
      throw new AppError(
        "USER_PERSONA_NOT_FOUND",
        "User persona not found",
      );
    }

    const chat = await this.chatRepo.create(data);

    let llmConfig: ChatLLMConfig | null = null;
    const resolvedConfigInput = await this.resolveConfigInput(
      chat.id,
      initialConfig,
    );
    if (resolvedConfigInput) {
      llmConfig = await this.chatConfigRepo.create(resolvedConfigInput);
    }

    return { chat, llmConfig };
  }

  async getChat(id: string): Promise<Chat | null> {
    return this.chatRepo.getById(id);
  }

  async listChats(filter?: ChatFilter): Promise<Chat[]> {
    return this.chatRepo.list(filter);
  }

  async updateChat(
    id: string,
    patch: Partial<Omit<CreateChatInput, "characterId">>,
  ): Promise<Chat | null> {
    if (patch.userPersonaId) {
      const persona = await this.userPersonaService.getById(
        patch.userPersonaId,
      );
      if (!persona) {
        throw new AppError(
          "USER_PERSONA_NOT_FOUND",
          "User persona not found",
        );
      }
    }
    return this.chatRepo.update(id, patch);
  }

  async deleteChat(id: string): Promise<void> {
    await this.chatRepo.delete(id);
    await this.chatConfigRepo.deleteByChatId(id);
  }

  async getChatLLMConfig(chatId: string): Promise<ChatLLMConfig | null> {
    const existing = await this.chatConfigRepo.getByChatId(chatId);
    if (existing) return existing;

    const configInput = await this.resolveConfigInput(chatId);
    if (!configInput) return null;

    return this.chatConfigRepo.create(configInput);
  }

  async updateChatLLMConfig(
    chatId: string,
    patch: UpdateChatLLMConfigInput,
  ): Promise<ChatLLMConfig | null> {
    const existing = await this.chatConfigRepo.getByChatId(chatId);
    if (existing) {
      return this.chatConfigRepo.updateByChatId(chatId, patch);
    }

    const configInput = await this.resolveConfigInput(
      chatId,
      patch as Partial<CreateChatLLMConfigInput>,
    );
    if (!configInput) return null;

    return this.chatConfigRepo.create(configInput);
  }
}
