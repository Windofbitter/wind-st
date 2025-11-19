import type { LLMConnection } from "../entities/LLMConnection";

export type LLMChatMessageRole = "system" | "user" | "assistant" | "tool";

export interface LLMChatMessage {
  role: LLMChatMessageRole;
  content: string;
}

export interface LLMChatCompletionRequest {
  connection: LLMConnection;
  model: string;
  messages: LLMChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LLMChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMChatCompletionResponse {
  message: LLMChatMessage;
  usage?: LLMChatCompletionUsage;
}

export interface LLMClient {
  completeChat(
    request: LLMChatCompletionRequest,
  ): Promise<LLMChatCompletionResponse>;
}

