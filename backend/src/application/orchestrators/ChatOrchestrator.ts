import type { Message } from "../../core/entities/Message";
import type { ChatRun } from "../../core/entities/ChatRun";
import type { ChatRunRepository } from "../../core/ports/ChatRunRepository";
import type {
  LLMChatMessage,
  LLMClient,
} from "../../core/ports/LLMClient";
import { ChatService } from "../services/ChatService";
import { MessageService } from "../services/MessageService";
import { LLMConnectionService } from "../services/LLMConnectionService";
import { AppError } from "../errors/AppError";

function nowIso(): string {
  return new Date().toISOString();
}

export class ChatOrchestrator {
  private readonly locks = new Set<string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly llmConnectionService: LLMConnectionService,
    private readonly chatRunRepo: ChatRunRepository,
    private readonly llmClient: LLMClient,
  ) {}

  async handleUserMessage(
    chatId: string,
    userContent: string,
  ): Promise<Message> {
    if (this.locks.has(chatId)) {
      throw new AppError("CHAT_BUSY", "Chat is busy");
    }

    this.locks.add(chatId);

    try {
      const userMessage = await this.messageService.appendMessage({
        chatId,
        role: "user",
        content: userContent,
      });

      const run = await this.createRun(chatId, userMessage.id);

      try {
        const assistantMessage = await this.performTurn(chatId, run);
        return assistantMessage;
      } catch (err) {
        const finishedAt = nowIso();
        await this.chatRunRepo.update(run.id, {
          status: "failed",
          finishedAt,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    } finally {
      this.locks.delete(chatId);
    }
  }

  private async createRun(chatId: string, userMessageId: string): Promise<ChatRun> {
    const startedAt = nowIso();
    return this.chatRunRepo.create({
      chatId,
      userMessageId,
      status: "running",
      startedAt,
    });
  }

  private async performTurn(
    chatId: string,
    run: ChatRun,
  ): Promise<Message> {
    const config = await this.chatService.getChatLLMConfig(chatId);
    if (!config) {
      throw new AppError(
        "CHAT_LLM_CONFIG_NOT_FOUND",
        "Chat LLM config not found",
      );
    }

    const connection = await this.llmConnectionService.getConnection(
      config.llmConnectionId,
    );
    if (!connection) {
      throw new AppError(
        "LLM_CONNECTION_NOT_FOUND",
        "LLM connection not found",
      );
    }
    if (!connection.isEnabled) {
      throw new AppError(
        "LLM_CONNECTION_DISABLED",
        "LLM connection is disabled",
      );
    }

    const history = await this.messageService.listMessages(chatId);
    const llmMessages: LLMChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const completion = await this.llmClient.completeChat({
      connection,
      model: config.model,
      messages: llmMessages,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    });

    const assistantMessage = await this.messageService.appendMessage({
      chatId,
      role: "assistant",
      content: completion.message.content,
      tokenCount: completion.usage?.completionTokens ?? null,
    });

    const finishedAt = nowIso();

    await this.chatRunRepo.update(run.id, {
      status: "completed",
      assistantMessageId: assistantMessage.id,
      finishedAt,
      tokenUsage: completion.usage
        ? {
            prompt: completion.usage.promptTokens,
            completion: completion.usage.completionTokens,
            total: completion.usage.totalTokens,
          }
        : null,
      error: null,
    });

    return assistantMessage;
  }
}
