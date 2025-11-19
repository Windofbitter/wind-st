import { http, unwrap } from "./httpClient";

export type ChatRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export interface ChatRunTokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ChatRun {
  id: string;
  chatId: string;
  status: ChatRunStatus;
  userMessageId: string;
  assistantMessageId: string | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  tokenUsage: ChatRunTokenUsage | null;
}

export async function listChatRuns(
  chatId: string,
): Promise<ChatRun[]> {
  return unwrap(http.get<ChatRun[]>(`/chats/${chatId}/runs`));
}

