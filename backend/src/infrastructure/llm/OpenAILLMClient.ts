import crypto from "crypto";
import type {
  LLMChatCompletionRequest,
  LLMChatCompletionResponse,
  LLMChatMessage,
  LLMChatCompletionUsage,
  LLMToolCall,
  LLMToolDefinition,
  LLMClient,
} from "../../core/ports/LLMClient";
import { AppError } from "../../application/errors/AppError";
import { createOpenAIClient } from "./openAIClientFactory";

export class OpenAILLMClient implements LLMClient {
  async completeChat(
    request: LLMChatCompletionRequest,
  ): Promise<LLMChatCompletionResponse> {
    const {
      connection,
      model,
      messages,
      tools,
      temperature,
      maxOutputTokens,
    } = request;

    if (connection.provider !== "openai_compatible") {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        `Unsupported LLM provider: ${connection.provider}`,
      );
    }

    const client = await createOpenAIClient(connection.baseUrl, connection.apiKey);

    const response: any = await client.chat.completions.create({
      model: model || connection.defaultModel,
      messages: this.mapMessages(messages),
      tools: this.mapTools(tools),
      temperature,
      max_tokens: maxOutputTokens,
    });

    const choice = response.choices?.[0];
    const content: string | null | undefined = choice?.message?.content;
    const toolCalls = this.parseToolCalls(choice?.message?.tool_calls);

    if (!content && (!toolCalls || toolCalls.length === 0)) {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        "OpenAI did not return a completion message",
      );
    }

    const message: LLMChatMessage = {
      role: "assistant",
      content: content ?? "",
    };
    if (toolCalls && toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

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

  private mapMessages(messages: LLMChatMessage[]): unknown[] {
    return messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool",
          content: m.content,
          tool_call_id: m.toolCallId ?? undefined,
        };
      }

      if (m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: "assistant",
          content: m.content,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments:
                typeof tc.arguments === "string"
                  ? tc.arguments
                  : JSON.stringify(tc.arguments ?? {}),
            },
          })),
        };
      }

      return {
        role: m.role,
        content: m.content,
      };
    });
  }

  private mapTools(tools?: LLMToolDefinition[]): unknown[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private parseToolCalls(raw: any): LLMToolCall[] | undefined {
    if (!raw || !Array.isArray(raw)) return undefined;
    const calls: LLMToolCall[] = [];

    for (const call of raw) {
      const name = call?.function?.name;
      const argsRaw = call?.function?.arguments;
      if (!name || typeof name !== "string") {
        continue;
      }

      calls.push({
        id: call.id ?? crypto.randomUUID(),
        name,
        arguments: this.parseArguments(argsRaw),
      });
    }

    return calls.length > 0 ? calls : undefined;
  }

  private parseArguments(args: unknown): unknown {
    if (typeof args !== "string") return args;
    try {
      return JSON.parse(args);
    } catch {
      return args;
    }
  }
}
