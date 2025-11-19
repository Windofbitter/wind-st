export type LLMProvider = "openai_compatible";

export interface LLMConnection {
  id: string;
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  isEnabled: boolean;
}

