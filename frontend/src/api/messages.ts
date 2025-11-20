import { http, unwrap } from "./httpClient";

export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MessageState = "ok" | "failed" | "pending";

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  toolCallId: string | null;
  toolCalls: unknown | null;
  toolResults: unknown | null;
  tokenCount: number | null;
  runId: string | null;
  state: MessageState;
  createdAt: string;
}

export interface ListMessagesParams {
  limit?: number;
  offset?: number;
}

export interface AppendMessageRequest {
  role: MessageRole;
  content: string;
  toolCallId?: string | null;
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

export async function deleteMessage(
  chatId: string,
  messageId: string,
): Promise<void> {
  await unwrap(
    http.delete<void>(`/chats/${chatId}/messages/${messageId}`),
  );
}

export async function retryMessage(
  chatId: string,
  messageId: string,
): Promise<Message> {
  return unwrap(
    http.post<Message>(
      `/chats/${chatId}/messages/${messageId}/retry`,
      {},
    ),
  );
}

