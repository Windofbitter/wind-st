import { AppError } from "../errors/AppError";
import type { LLMConnectionService } from "./LLMConnectionService";
import type { LLMConnection } from "../../core/entities/LLMConnection";
import { OpenAIAdminClient } from "../../infrastructure/llm/OpenAIAdminClient";
import type { LLMConnectionTestResult } from "../../infrastructure/llm/OpenAIAdminClient";
import type { CreateLLMConnectionInput } from "../../core/ports/LLMConnectionRepository";

export class LLMConnectionDiagnosticsService {
  constructor(
    private readonly llmConnectionService: LLMConnectionService,
    private readonly openAIAdmin: OpenAIAdminClient,
  ) {}

  async testConnection(id: string): Promise<LLMConnectionTestResult> {
    const connection = await this.requireConnection(id);
    switch (connection.provider) {
      case "openai_compatible":
        return this.openAIAdmin.testConnection(connection);
      default:
        throw new AppError(
          "EXTERNAL_LLM_ERROR",
          `Unsupported LLM provider: ${connection.provider}`,
        );
    }
  }

  async testDraftConnection(
    data: CreateLLMConnectionInput,
  ): Promise<LLMConnectionTestResult> {
    const connection: LLMConnection = {
      id: "draft",
      name: data.name,
      provider: data.provider,
      baseUrl: data.baseUrl,
      defaultModel: data.defaultModel,
      apiKey: data.apiKey,
      isEnabled: data.isEnabled ?? true,
      status: data.status ?? "unknown",
      lastTestedAt: data.lastTestedAt ?? null,
      modelsAvailable: data.modelsAvailable ?? null,
    };

    switch (connection.provider) {
      case "openai_compatible":
        return this.openAIAdmin.testConnection(connection);
      default:
        throw new AppError(
          "EXTERNAL_LLM_ERROR",
          `Unsupported LLM provider: ${connection.provider}`,
        );
    }
  }

  async listModels(id: string): Promise<string[]> {
    const connection = await this.requireConnection(id);
    switch (connection.provider) {
      case "openai_compatible":
        return this.openAIAdmin.listModels(connection);
      default:
        throw new AppError(
          "EXTERNAL_LLM_ERROR",
          `Unsupported LLM provider: ${connection.provider}`,
        );
    }
  }

  private async requireConnection(id: string): Promise<LLMConnection> {
    const connection = await this.llmConnectionService.getConnection(id);
    if (!connection) {
      throw new AppError(
        "LLM_CONNECTION_NOT_FOUND",
        "LLM connection not found",
      );
    }
    return connection;
  }
}
