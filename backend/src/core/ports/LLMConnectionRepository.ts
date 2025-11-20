import type { LLMConnection, LLMProvider } from "../entities/LLMConnection";

export interface CreateLLMConnectionInput {
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  isEnabled?: boolean;
  status?: LLMConnection["status"];
  lastTestedAt?: LLMConnection["lastTestedAt"];
  modelsAvailable?: LLMConnection["modelsAvailable"];
}

export interface UpdateLLMConnectionInput {
  name?: string;
  baseUrl?: string;
  defaultModel?: string;
  apiKey?: string;
  isEnabled?: boolean;
  status?: LLMConnection["status"];
  lastTestedAt?: LLMConnection["lastTestedAt"];
  modelsAvailable?: LLMConnection["modelsAvailable"];
}

export interface LLMConnectionRepository {
  create(data: CreateLLMConnectionInput): Promise<LLMConnection>;
  getById(id: string): Promise<LLMConnection | null>;
  list(): Promise<LLMConnection[]>;
  update(
    id: string,
    patch: UpdateLLMConnectionInput,
  ): Promise<LLMConnection | null>;
  delete(id: string): Promise<void>;
}
