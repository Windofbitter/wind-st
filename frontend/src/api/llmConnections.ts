import { http, unwrap } from "./httpClient";

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

export interface CreateLLMConnectionRequest {
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  isEnabled?: boolean;
  status?: LLMConnectionStatus;
  lastTestedAt?: string | null;
  modelsAvailable?: number | null;
}

export type UpdateLLMConnectionRequest =
  Partial<CreateLLMConnectionRequest>;

export async function listLLMConnections(): Promise<LLMConnection[]> {
  return unwrap(http.get<LLMConnection[]>("/llm-connections"));
}

export async function getLLMConnection(
  id: string,
): Promise<LLMConnection> {
  return unwrap(http.get<LLMConnection>(`/llm-connections/${id}`));
}

export async function createLLMConnection(
  payload: CreateLLMConnectionRequest,
): Promise<LLMConnection> {
  return unwrap(
    http.post<LLMConnection>("/llm-connections", payload),
  );
}

export async function updateLLMConnection(
  id: string,
  payload: UpdateLLMConnectionRequest,
): Promise<LLMConnection> {
  return unwrap(
    http.patch<LLMConnection>(`/llm-connections/${id}`, payload),
  );
}

export async function deleteLLMConnection(id: string): Promise<void> {
  await unwrap(
    http.delete<void>(`/llm-connections/${id}`),
  );
}

export interface LLMConnectionTestResult {
  state: "ok" | "error";
  modelsAvailable?: number;
  error?: string;
  checkedAt: string;
  status?: LLMConnectionStatus;
}

export async function testLLMConnection(
  id: string,
): Promise<LLMConnectionTestResult> {
  return unwrap(http.get<LLMConnectionTestResult>(`/llm-connections/${id}/test`));
}

export async function testLLMConnectionDraft(
  payload: CreateLLMConnectionRequest,
): Promise<LLMConnectionTestResult> {
  return unwrap(
    http.post<LLMConnectionTestResult>("/llm-connections/test", payload),
  );
}

export async function listLLMModels(
  id: string,
): Promise<string[]> {
  const res = await unwrap(
    http.get<{ models: string[] }>(`/llm-connections/${id}/models`),
  );
  return res.models;
}

