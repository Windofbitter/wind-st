export interface ChatLLMConfig {
  id: string;
  chatId: string;
  llmConnectionId: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  maxToolIterations: number;
  toolCallTimeoutMs: number;
}

