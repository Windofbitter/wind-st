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

