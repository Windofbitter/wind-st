export type LLMProvider = "openai_compatible";
export type LLMConnectionStatus = "unknown" | "ok" | "error";

export interface LLMConnection {
  id: string;
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  isEnabled: boolean;
  status: LLMConnectionStatus;
  lastTestedAt: string | null;
  modelsAvailable: number | null;
}
