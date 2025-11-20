import type { LLMConnection } from "../../core/entities/LLMConnection";
import { AppError } from "../../application/errors/AppError";
import { createOpenAIClient } from "./openAIClientFactory";

export interface LLMConnectionTestResult {
  state: "ok" | "error";
  modelsAvailable?: number;
  error?: string;
  checkedAt: string;
}

export class OpenAIAdminClient {
  async testConnection(connection: LLMConnection): Promise<LLMConnectionTestResult> {
    if (connection.provider !== "openai_compatible") {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        `Unsupported LLM provider: ${connection.provider}`,
      );
    }

    try {
      const client = await createOpenAIClient(
        connection.baseUrl,
        connection.apiKey,
      );
      const models = await client.models.list();
      const count = Array.isArray(models?.data) ? models.data.length : 0;
      return {
        state: "ok",
        modelsAvailable: count,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        state: "error",
        error: err instanceof Error ? err.message : "Unknown LLM error",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async listModels(connection: LLMConnection): Promise<string[]> {
    if (connection.provider !== "openai_compatible") {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        `Unsupported LLM provider: ${connection.provider}`,
      );
    }

    const client = await createOpenAIClient(
      connection.baseUrl,
      connection.apiKey,
    );
    try {
      const models = await client.models.list();
      const ids: string[] = Array.isArray(models?.data)
        ? models.data
            .map((m: any) => m?.id)
            .filter((id: unknown): id is string => typeof id === "string")
        : [];
      return ids.sort();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch models";
      throw new AppError("LLM_MODELS_UNAVAILABLE", message);
    }
  }
}
