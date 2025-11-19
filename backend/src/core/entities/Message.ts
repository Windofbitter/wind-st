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

