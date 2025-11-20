import type { Message, MessageRole } from "../entities/Message";

export interface CreateMessageInput {
  chatId: string;
  role: MessageRole;
  content: string;
  toolCallId?: string | null;
  toolCalls?: unknown | null;
  toolResults?: unknown | null;
  tokenCount?: number | null;
}

export interface ListMessagesOptions {
  limit?: number;
  offset?: number;
}

export interface MessageRepository {
  append(data: CreateMessageInput): Promise<Message>;
  listForChat(chatId: string, options?: ListMessagesOptions): Promise<Message[]>;
}

