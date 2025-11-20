import type { FastifyInstance } from "fastify";
import type {
  CreateLLMConnectionInput,
  UpdateLLMConnectionInput,
} from "../../../core/ports/LLMConnectionRepository";
import type { LLMProvider } from "../../../core/entities/LLMConnection";
import { AppError } from "../../../application/errors/AppError";

function isLLMProvider(value: unknown): value is LLMProvider {
  return value === "openai_compatible";
}

function ensureCreateConnectionPayload(
  body: unknown,
): CreateLLMConnectionInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid LLM connection payload: expected object",
    );
  }

  const value = body as Partial<CreateLLMConnectionInput>;

  if (
    typeof value.name !== "string" ||
    typeof value.baseUrl !== "string" ||
    typeof value.defaultModel !== "string" ||
    typeof value.apiKey !== "string" ||
    !isLLMProvider(value.provider)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid LLM connection payload: name, provider, baseUrl, defaultModel and apiKey are required",
    );
  }

  if (
    value.isEnabled !== undefined &&
    typeof value.isEnabled !== "boolean"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid LLM connection payload: isEnabled must be boolean",
    );
  }

  return {
    name: value.name,
    provider: value.provider,
    baseUrl: value.baseUrl,
    defaultModel: value.defaultModel,
    apiKey: value.apiKey,
    isEnabled: value.isEnabled ?? true,
    status: "unknown",
    modelsAvailable: null,
    lastTestedAt: null,
  };
}

function ensureUpdateConnectionPayload(
  body: unknown,
): UpdateLLMConnectionInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid LLM connection patch: expected object",
    );
  }

  const value = body as Partial<UpdateLLMConnectionInput>;
  const patch: UpdateLLMConnectionInput = {};

  if (value.name !== undefined) {
    if (typeof value.name !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid LLM connection patch: name must be string",
      );
    }
    patch.name = value.name;
  }

  if (value.baseUrl !== undefined) {
    if (typeof value.baseUrl !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid LLM connection patch: baseUrl must be string",
      );
    }
    patch.baseUrl = value.baseUrl;
  }

  if (value.defaultModel !== undefined) {
    if (typeof value.defaultModel !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid LLM connection patch: defaultModel must be string",
      );
    }
    patch.defaultModel = value.defaultModel;
  }

  if (value.apiKey !== undefined) {
    if (typeof value.apiKey !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid LLM connection patch: apiKey must be string",
      );
    }
    patch.apiKey = value.apiKey;
  }

  if (value.isEnabled !== undefined) {
    if (typeof value.isEnabled !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid LLM connection patch: isEnabled must be boolean",
      );
    }
    patch.isEnabled = value.isEnabled;
  }

  return patch;
}

export function registerLLMConnectionRoutes(app: FastifyInstance): void {
  app.get("/llm-connections", async () => {
    const connections = await app.llmConnectionService.listConnections();
    return connections;
  });

  app.get("/llm-connections/:id", async (request) => {
    const { id } = request.params as { id: string };
    const connection = await app.llmConnectionService.getConnection(id);
    if (!connection) {
      throw new AppError(
        "LLM_CONNECTION_NOT_FOUND",
        "LLM connection not found",
      );
    }
    return connection;
  });

  app.post("/llm-connections", async (request, reply) => {
    const input = ensureCreateConnectionPayload(request.body);
    const created = await app.llmConnectionService.createConnection(input);
    void reply.status(201);
    return created;
  });

  app.get("/llm-connections/:id/test", async (request) => {
    const { id } = request.params as { id: string };
    const result = await app.llmDiagnosticsService.testConnection(id);
    const status = result.state;
    await app.llmConnectionService.updateConnection(id, {
      status,
      lastTestedAt: result.checkedAt,
      modelsAvailable: result.modelsAvailable ?? null,
    });
    return { ...result, status };
  });

  app.post("/llm-connections/test", async (request) => {
    const input = ensureCreateConnectionPayload(request.body);
    const result = await app.llmDiagnosticsService.testDraftConnection(input);
    return result;
  });

  app.get("/llm-connections/:id/models", async (request) => {
    const { id } = request.params as { id: string };
    const models = await app.llmDiagnosticsService.listModels(id);
    return { models };
  });

  app.patch("/llm-connections/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdateConnectionPayload(request.body);
    const updated = await app.llmConnectionService.updateConnection(id, patch);
    if (!updated) {
      throw new AppError(
        "LLM_CONNECTION_NOT_FOUND",
        "LLM connection not found",
      );
    }
    return updated;
  });

  app.delete("/llm-connections/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.llmConnectionService.deleteConnection(id);
    void reply.status(204).send();
  });
}

