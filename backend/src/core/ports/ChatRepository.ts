import type { Chat } from "../entities/Chat";

export interface CreateChatInput {
  characterId: string;
  userPersonaId: string;
  title: string;
}

export interface UpdateChatInput {
  title?: string;
  userPersonaId?: string;
  updatedAt?: string;
}

export interface ChatFilter {
  characterId?: string;
  userPersonaId?: string;
}

export interface ChatRepository {
  create(data: CreateChatInput): Promise<Chat>;
  getById(id: string): Promise<Chat | null>;
  list(filter?: ChatFilter): Promise<Chat[]>;
  update(id: string, patch: UpdateChatInput): Promise<Chat | null>;
  delete(id: string): Promise<void>;
}

