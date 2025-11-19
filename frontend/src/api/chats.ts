import { http, unwrap } from "./httpClient";
import type { Message } from "./messages";

export interface Chat {
  id: string;
  characterId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatLLMConfig {
  id: string;
  chatId: string;
  llmConnectionId: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface ListChatsParams {
  characterId?: string;
}

export interface InitialChatConfigInput {
  llmConnectionId: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface CreateChatRequest {
  characterId: string;
  title: string;
  initialConfig?: InitialChatConfigInput;
}

export type UpdateChatConfigRequest = Partial<InitialChatConfigInput>;

export interface CreateChatResponse {
  chat: Chat;
  llmConfig: ChatLLMConfig;
}

export interface CreateTurnRequest {
  content: string;
}

export async function listChats(
  params?: ListChatsParams,
): Promise<Chat[]> {
  return unwrap(http.get<Chat[]>("/chats", { params }));
}

export async function getChat(id: string): Promise<Chat> {
  return unwrap(http.get<Chat>(`/chats/${id}`));
}

export async function createChat(
  payload: CreateChatRequest,
): Promise<CreateChatResponse> {
  return unwrap(http.post<CreateChatResponse>("/chats", payload));
}

export async function deleteChat(id: string): Promise<void> {
  await unwrap(http.delete<void>(`/chats/${id}`));
}

export async function getChatConfig(
  chatId: string,
): Promise<ChatLLMConfig> {
  return unwrap(http.get<ChatLLMConfig>(`/chats/${chatId}/config`));
}

export async function updateChatConfig(
  chatId: string,
  payload: UpdateChatConfigRequest,
): Promise<ChatLLMConfig> {
  return unwrap(
    http.patch<ChatLLMConfig>(`/chats/${chatId}/config`, payload),
  );
}

export async function createTurn(
  chatId: string,
  payload: CreateTurnRequest,
): Promise<Message> {
  return unwrap(http.post<Message>(`/chats/${chatId}/turns`, payload));
}

