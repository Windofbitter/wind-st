import type {
  ChatRun,
  ChatRunStatus,
  ChatRunTokenUsage,
} from "../entities/ChatRun";

export interface CreateChatRunInput {
  chatId: string;
  userMessageId: string;
  status: ChatRunStatus;
  startedAt: string;
}

export interface UpdateChatRunInput {
  status?: ChatRunStatus;
  assistantMessageId?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  tokenUsage?: ChatRunTokenUsage | null;
}

export interface ChatRunRepository {
  create(data: CreateChatRunInput): Promise<ChatRun>;
  getById(id: string): Promise<ChatRun | null>;
  listByChat(chatId: string): Promise<ChatRun[]>;
  update(id: string, patch: UpdateChatRunInput): Promise<ChatRun | null>;
}

