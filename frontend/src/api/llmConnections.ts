import { http, unwrap } from "./httpClient";

export type LLMProvider = "openai_compatible";

export interface LLMConnection {
  id: string;
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  isEnabled: boolean;
}

export interface CreateLLMConnectionRequest {
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  isEnabled?: boolean;
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

