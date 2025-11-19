import type {
  LLMChatCompletionRequest,
  LLMChatCompletionResponse,
  LLMChatMessage,
  LLMChatCompletionUsage,
  LLMClient,
} from "../../core/ports/LLMClient";
import { AppError } from "../../application/errors/AppError";

export class OpenAILLMClient implements LLMClient {
  private async createClient(
    baseUrl: string,
    apiKeyFromConnection?: string,
  ): Promise<any> {
    if (!apiKeyFromConnection) {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        "LLMConnection.apiKey is required for this provider",
      );
    }

    const mod = await import("openai");
    const OpenAIConstructor = (mod as any).default;

    return new OpenAIConstructor({
      apiKey: apiKeyFromConnection,
      baseURL: baseUrl,
    });
  }

  async completeChat(
    request: LLMChatCompletionRequest,
  ): Promise<LLMChatCompletionResponse> {
    const { connection, model, messages, temperature, maxOutputTokens } =
      request;

    if (connection.provider !== "openai_compatible") {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        `Unsupported LLM provider: ${connection.provider}`,
      );
    }

    const client = await this.createClient(connection.baseUrl, connection.apiKey);

    const response: any = await client.chat.completions.create({
      model: model || connection.defaultModel,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxOutputTokens,
    });

    const choice = response.choices?.[0];
    const content: string | null | undefined = choice?.message?.content;

    if (!content) {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        "OpenAI did not return a completion message",
      );
    }

    const message: LLMChatMessage = {
      role: "assistant",
      content,
    };

    const usage: LLMChatCompletionUsage | undefined = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens ?? 0,
          completionTokens: response.usage.completion_tokens ?? 0,
          totalTokens: response.usage.total_tokens ?? 0,
        }
      : undefined;

    const result: LLMChatCompletionResponse = { message };
    if (usage) {
      result.usage = usage;
    }

    return result;
  }
}
