import { AppError } from "../../application/errors/AppError";

export async function createOpenAIClient(
  baseUrl: string,
  apiKey?: string,
): Promise<any> {
  if (!apiKey) {
    throw new AppError(
      "EXTERNAL_LLM_ERROR",
      "LLMConnection.apiKey is required for this provider",
    );
  }

  const mod = await import("openai");
  const OpenAIConstructor = (mod as any).default;

  return new OpenAIConstructor({
    apiKey,
    baseURL: baseUrl,
  });
}
