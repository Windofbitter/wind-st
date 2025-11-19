import type { LLMChatMessage } from "./LLMClient";

export interface PromptToolSpec {
  serverId: string;
  serverName: string;
}

export interface PromptBuilderResult {
  messages: LLMChatMessage[];
  tools: PromptToolSpec[];
}

export interface PromptBuilder {
  buildPromptForChat(chatId: string): Promise<PromptBuilderResult>;
}

