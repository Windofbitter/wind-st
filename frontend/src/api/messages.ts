import { http, unwrap } from "./httpClient";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  toolCalls: unknown | null;
  toolResults: unknown | null;
  tokenCount: number | null;
}

export interface ListMessagesParams {
  limit?: number;
  offset?: number;
}

export interface AppendMessageRequest {
  role: MessageRole;
  content: string;
  toolCalls?: unknown | null;
  toolResults?: unknown | null;
  tokenCount?: number | null;
}

export async function listMessages(
  chatId: string,
  params?: ListMessagesParams,
): Promise<Message[]> {
  return unwrap(
    http.get<Message[]>(`/chats/${chatId}/messages`, { params }),
  );
}

export async function appendMessage(
  chatId: string,
  payload: AppendMessageRequest,
): Promise<Message> {
  return unwrap(
    http.post<Message>(`/chats/${chatId}/messages`, payload),
  );
}

