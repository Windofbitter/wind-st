import type { FastifyInstance } from "fastify";
import type {
  ChatFilter,
  CreateChatInput,
} from "../../../core/ports/ChatRepository";
import type {
  CreateChatLLMConfigInput,
  UpdateChatLLMConfigInput,
} from "../../../core/ports/ChatLLMConfigRepository";
import type { UpdateChatHistoryConfigInput } from "../../../core/ports/ChatHistoryConfigRepository";
import { AppError } from "../../../application/errors/AppError";

type InitialChatConfigInput = Omit<CreateChatLLMConfigInput, "chatId">;

interface CreateChatBody {
  characterId: string;
  title: string;
  initialConfig?: InitialChatConfigInput;
}

interface CreateTurnBody {
  content: string;
}

interface UpdateHistoryConfigBody {
  historyEnabled?: boolean;
  messageLimit?: number;
}

function toChatFilter(query: Record<string, unknown>): ChatFilter | undefined {
  const characterId = query.characterId;
  if (typeof characterId === "string" && characterId.trim() !== "") {
    return { characterId };
  }
  return undefined;
}

function ensureCreateChatPayload(
  body: unknown,
): {
  chat: CreateChatInput;
  initialConfig?: InitialChatConfigInput;
} {
  if (!body || typeof body !== "object") {
    throw new AppError("VALIDATION_ERROR", "Invalid chat payload: expected object");
  }

  const value = body as Partial<CreateChatBody>;

  if (
    typeof value.characterId !== "string" ||
    value.characterId.trim() === "" ||
    typeof value.title !== "string" ||
    value.title.trim() === ""
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid chat payload: characterId and title are required",
    );
  }

  let initialConfig: InitialChatConfigInput | undefined;
  if (value.initialConfig !== undefined) {
    const cfg = value.initialConfig as Partial<InitialChatConfigInput>;

    if (
      !cfg ||
      typeof cfg !== "object" ||
      typeof cfg.llmConnectionId !== "string" ||
      typeof cfg.model !== "string" ||
      typeof cfg.temperature !== "number" ||
      typeof cfg.maxOutputTokens !== "number"
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid chat payload: initialConfig is malformed",
      );
    }

    initialConfig = {
      llmConnectionId: cfg.llmConnectionId,
      model: cfg.model,
      temperature: cfg.temperature,
      maxOutputTokens: cfg.maxOutputTokens,
    };
  }

  const result: {
    chat: CreateChatInput;
    initialConfig?: InitialChatConfigInput;
  } = {
    chat: {
      characterId: value.characterId,
      title: value.title,
    },
  };

  if (initialConfig) {
    result.initialConfig = initialConfig;
  }

  return result;
}

function ensureUpdateChatConfigPayload(
  body: unknown,
): UpdateChatLLMConfigInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid chat config patch: expected object",
    );
  }

  const value = body as Partial<UpdateChatLLMConfigInput>;
  const patch: UpdateChatLLMConfigInput = {};

  if (value.llmConnectionId !== undefined) {
    if (typeof value.llmConnectionId !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid chat config patch: llmConnectionId must be string",
      );
    }
    patch.llmConnectionId = value.llmConnectionId;
  }

  if (value.model !== undefined) {
    if (typeof value.model !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid chat config patch: model must be string",
      );
    }
    patch.model = value.model;
  }

  if (value.temperature !== undefined) {
    if (typeof value.temperature !== "number") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid chat config patch: temperature must be number",
      );
    }
    patch.temperature = value.temperature;
  }

  if (value.maxOutputTokens !== undefined) {
    if (typeof value.maxOutputTokens !== "number") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid chat config patch: maxOutputTokens must be number",
      );
    }
    patch.maxOutputTokens = value.maxOutputTokens;
  }

  return patch;
}

function ensureUpdateHistoryConfigPayload(
  body: unknown,
): UpdateChatHistoryConfigInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid history config patch: expected object",
    );
  }

  const value = body as UpdateHistoryConfigBody;
  const patch: UpdateChatHistoryConfigInput = {};

  if (value.historyEnabled !== undefined) {
    if (typeof value.historyEnabled !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid history config patch: historyEnabled must be boolean",
      );
    }
    patch.historyEnabled = value.historyEnabled;
  }

  if (value.messageLimit !== undefined) {
    if (
      typeof value.messageLimit !== "number" ||
      !Number.isFinite(value.messageLimit) ||
      value.messageLimit <= 0
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid history config patch: messageLimit must be positive number",
      );
    }
    patch.messageLimit = value.messageLimit;
  }

  return patch;
}

function ensureCreateTurnPayload(body: unknown): CreateTurnBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid turn payload: expected object",
    );
  }

  const value = body as Partial<CreateTurnBody>;
  if (typeof value.content !== "string" || value.content.trim() === "") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid turn payload: content is required",
    );
  }

  return { content: value.content };
}

export function registerChatRoutes(app: FastifyInstance): void {
  app.get("/chats", async (request) => {
    const filter = toChatFilter(request.query as Record<string, unknown>);
    const chats = await app.chatService.listChats(filter);
    return chats;
  });

  app.get("/chats/:id", async (request) => {
    const { id } = request.params as { id: string };
    const chat = await app.chatService.getChat(id);
    if (!chat) {
      throw new AppError("CHAT_NOT_FOUND", "Chat not found");
    }
    return chat;
  });

  app.post("/chats", async (request, reply) => {
    const payload = ensureCreateChatPayload(request.body);
    const { chat, llmConfig } = await app.chatService.createChat(
      payload.chat,
      payload.initialConfig,
    );

    void reply.status(201);
    return { chat, llmConfig };
  });

  app.delete("/chats/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.chatService.deleteChat(id);
    void reply.status(204).send();
  });

  app.get("/chats/:id/config", async (request) => {
    const { id } = request.params as { id: string };
    const config = await app.chatService.getChatLLMConfig(id);
    if (!config) {
      throw new AppError(
        "CHAT_LLM_CONFIG_NOT_FOUND",
        "Chat LLM config not found",
      );
    }
    return config;
  });

  app.patch("/chats/:id/config", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdateChatConfigPayload(request.body);
    const updated = await app.chatService.updateChatLLMConfig(id, patch);
    if (!updated) {
      throw new AppError(
        "CHAT_LLM_CONFIG_NOT_FOUND",
        "Chat LLM config not found",
      );
    }
    return updated;
  });

  app.get("/chats/:id/history-config", async (request) => {
    const { id } = request.params as { id: string };
    const config = await app.historyConfigService.getHistoryConfig(id);
    return config;
  });

  app.patch("/chats/:id/history-config", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdateHistoryConfigPayload(request.body);
    const updated =
      await app.historyConfigService.updateHistoryConfig(id, patch);
    return updated;
  });

  app.get("/chats/:id/runs", async (request) => {
    const { id } = request.params as { id: string };
    const runs = await app.chatRunRepository.listByChat(id);
    return runs;
  });

  app.post("/chats/:id/turns", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = ensureCreateTurnPayload(request.body);
    const assistantMessage = await app.chatOrchestrator.handleUserMessage(
      id,
      content,
    );
    void reply.status(201);
    return assistantMessage;
  });
}
