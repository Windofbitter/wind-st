import type { Message } from "../../core/entities/Message";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../../core/ports/MessageRepository";

export class MessageService {
  constructor(private readonly messageRepo: MessageRepository) {}

  async appendMessage(data: CreateMessageInput): Promise<Message> {
    return this.messageRepo.append(data);
  }

  async listMessages(
    chatId: string,
    options?: ListMessagesOptions,
  ): Promise<Message[]> {
    return this.messageRepo.listForChat(chatId, options);
  }
}

