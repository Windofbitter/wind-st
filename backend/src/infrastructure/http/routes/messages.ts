import type { FastifyInstance } from "fastify";
import type { ListMessagesOptions } from "../../../core/ports/MessageRepository";
import type { MessageRole } from "../../../core/entities/Message";
import type { CreateMessageInput } from "../../../core/ports/MessageRepository";
import { AppError } from "../../../application/errors/AppError";

interface AppendMessageBody {
  role: MessageRole;
  content: string;
  toolCalls?: unknown | null;
  toolResults?: unknown | null;
  tokenCount?: number | null;
}

function toListMessagesOptions(
  query: Record<string, unknown>,
): ListMessagesOptions | undefined {
  const options: ListMessagesOptions = {};

  if (query.limit !== undefined) {
    const raw = query.limit;
    const num =
      typeof raw === "string" && raw !== "" ? Number(raw) : Number(raw);
    if (!Number.isFinite(num) || num <= 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid messages query: limit must be positive number",
      );
    }
    options.limit = num;
  }

  if (query.offset !== undefined) {
    const raw = query.offset;
    const num =
      typeof raw === "string" && raw !== "" ? Number(raw) : Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid messages query: offset must be non-negative number",
      );
    }
    options.offset = num;
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

function isValidRole(role: unknown): role is MessageRole {
  return role === "user" || role === "assistant" || role === "system" || role === "tool";
}

function ensureAppendMessagePayload(
  chatId: string,
  body: unknown,
): CreateMessageInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid message payload: expected object",
    );
  }

  const value = body as Partial<AppendMessageBody>;

  if (!isValidRole(value.role)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid message payload: role is required and must be one of user|assistant|system|tool",
    );
  }

  if (typeof value.content !== "string") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid message payload: content must be string",
    );
  }

  if (
    value.tokenCount !== undefined &&
    value.tokenCount !== null &&
    typeof value.tokenCount !== "number"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid message payload: tokenCount must be number or null",
    );
  }

  return {
    chatId,
    role: value.role,
    content: value.content,
    toolCalls: value.toolCalls ?? null,
    toolResults: value.toolResults ?? null,
    tokenCount:
      value.tokenCount !== undefined ? value.tokenCount : null,
  };
}

export function registerMessageRoutes(app: FastifyInstance): void {
  app.get("/chats/:chatId/messages", async (request) => {
    const { chatId } = request.params as { chatId: string };
    const options = toListMessagesOptions(
      request.query as Record<string, unknown>,
    );
    const messages = await app.messageService.listMessages(chatId, options);
    return messages;
  });

  app.post("/chats/:chatId/messages", async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const input = ensureAppendMessagePayload(chatId, request.body);
    const created = await app.messageService.appendMessage(input);
    void reply.status(201);
    return created;
  });
}

