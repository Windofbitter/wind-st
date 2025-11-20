import type { Message } from "../../core/entities/Message";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../../core/ports/MessageRepository";
import type { ChatRunRepository } from "../../core/ports/ChatRunRepository";

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

  async deleteMessageCascade(
    chatId: string,
    messageId: string,
  ): Promise<void> {
    const messages = await this.messageRepo.listForChat(chatId);
    const targetIdx = messages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const target = messages[targetIdx];
    const toDelete: string[] = [messageId];

    if (target.role === "user") {
      for (let i = targetIdx + 1; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === "user") break;
        toDelete.push(msg.id);
      }
    }

    await this.chatRunRepo.deleteByMessageIds(chatId, toDelete);
    await this.messageRepo.deleteMany(toDelete);
  }
}

