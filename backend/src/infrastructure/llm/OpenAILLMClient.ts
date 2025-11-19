import type {
  LLMChatCompletionRequest,
  LLMChatCompletionResponse,
  LLMChatMessage,
  LLMChatCompletionUsage,
  LLMClient,
} from "../../core/ports/LLMClient";

export class OpenAILLMClient implements LLMClient {
  private async createClient(
    baseUrl: string,
    apiKeyFromConnection?: string,
  ): Promise<any> {
    if (!apiKeyFromConnection) {
      throw new Error("LLMConnection.apiKey is required for this provider");
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
      throw new Error(`Unsupported LLM provider: ${connection.provider}`);
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
      throw new Error("OpenAI did not return a completion message");
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

    return { message, usage };
  }
}
