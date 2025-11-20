import type { Message } from "../../core/entities/Message";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../../core/ports/MessageRepository";
import type { ChatRunRepository } from "../../core/ports/ChatRunRepository";
import { AppError } from "../errors/AppError";

export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly chatRunRepo: ChatRunRepository,
  ) {}

  async appendMessage(data: CreateMessageInput): Promise<Message> {
    return this.messageRepo.append(data);
  }

  async listMessages(
    chatId: string,
    options?: ListMessagesOptions,
  ): Promise<Message[]> {
    return this.messageRepo.listForChat(chatId, options);
  }

  async deleteMessages(ids: string[]): Promise<void> {
    await this.messageRepo.deleteMany(ids);
  }

  async pruneAfterUserMessage(
    chatId: string,
    userMessageId: string,
  ): Promise<void> {
    const messages = await this.messageRepo.listForChat(chatId);
    const targetIdx = messages.findIndex((m) => m.id === userMessageId);
    if (targetIdx === -1) {
      throw new AppError("MESSAGE_NOT_FOUND", "Message not found");
    }

    const target = messages[targetIdx];
    if (target.role !== "user") {
      throw new AppError(
        "INVALID_MESSAGE_ROLE",
        "Only user messages can be retried or pruned",
      );
    }

    const trailing = messages.slice(targetIdx + 1);
    const trailingIds = trailing.map((m) => m.id);

    // Drop runs tied to the target user message and any later messages
    const runMessageIds = [userMessageId, ...trailingIds];
    await this.chatRunRepo.deleteByMessageIds(chatId, runMessageIds);

    if (trailingIds.length > 0) {
      await this.messageRepo.deleteMany(trailingIds);
    }
  }

  async deleteMessageCascade(
    chatId: string,
    messageId: string,
  ): Promise<void> {
    const messages = await this.messageRepo.listForChat(chatId);
    const targetIdx = messages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const target = messages[targetIdx];
    const toDelete = new Set<string>([messageId]);
    const runRelated = new Set<string>([messageId]);

    if (target.role === "user") {
      for (let i = targetIdx + 1; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === "user") break;
        toDelete.add(msg.id);
        runRelated.add(msg.id);
      }
    } else if (target.role === "assistant") {
      let runId: string | null = target.runId ?? null;
      let userMessageId: string | null = null;

      if (runId) {
        const run = await this.chatRunRepo.getById(runId);
        if (run) {
          userMessageId = run.userMessageId;
        }
      }

      if (!userMessageId) {
        const runs = await this.chatRunRepo.listByChat(chatId);
        const run = runs.find((r) => r.assistantMessageId === target.id);
        if (run) {
          runId = run.id;
          userMessageId = run.userMessageId;
        }
      }

      if (!userMessageId) {
        for (let i = targetIdx - 1; i >= 0; i -= 1) {
          const msg = messages[i];
          if (msg.role === "user") {
            userMessageId = msg.id;
            break;
          }
        }
      }

      if (userMessageId) {
        toDelete.add(userMessageId);
        runRelated.add(userMessageId);
      }

      if (runId) {
        for (const msg of messages) {
          if (msg.runId === runId && msg.role === "tool") {
            toDelete.add(msg.id);
            runRelated.add(msg.id);
          }
        }
      }
    }

    await this.chatRunRepo.deleteByMessageIds(
      chatId,
      Array.from(runRelated),
    );
    await this.messageRepo.deleteMany(Array.from(toDelete));
  }
}
