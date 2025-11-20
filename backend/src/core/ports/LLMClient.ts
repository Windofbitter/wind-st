import type { LLMConnection } from "../entities/LLMConnection";

export type LLMChatMessageRole = "system" | "user" | "assistant" | "tool";

export interface LLMToolDefinition {
  type: "function";
  name: string;
  description?: string;
  parameters?: unknown;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface LLMChatMessage {
  role: LLMChatMessageRole;
  content: string;
  /**
   * When role is "assistant", represents structured tool calls returned by the model.
   */
  toolCalls?: LLMToolCall[];
  /**
   * When role is "tool", correlates the tool output with a prior assistant tool call.
   */
  toolCallId?: string | null;
}

export interface LLMChatCompletionRequest {
  connection: LLMConnection;
  model: string;
  messages: LLMChatMessage[];
  tools?: LLMToolDefinition[];
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

