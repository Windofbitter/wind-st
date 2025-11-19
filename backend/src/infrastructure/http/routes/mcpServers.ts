import type { FastifyInstance } from "fastify";
import type {
  CreateMCPServerInput,
  UpdateMCPServerInput,
} from "../../../core/ports/MCPServerRepository";
import { AppError } from "../../../application/errors/AppError";

function ensureEnvObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid MCP server payload: env must be an object",
    );
  }

  const env: Record<string, string> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid MCP server payload: env values must be strings",
      );
    }
    env[key] = val;
  }
  return env;
}

function ensureCreateMCPServerPayload(
  body: unknown,
): CreateMCPServerInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid MCP server payload: expected object",
    );
  }

  const value = body as Partial<CreateMCPServerInput>;

  if (
    typeof value.name !== "string" ||
    typeof value.command !== "string" ||
    !Array.isArray(value.args) ||
    value.args.some((a) => typeof a !== "string") ||
    value.env === undefined
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid MCP server payload: name, command, args and env are required",
    );
  }

  const env = ensureEnvObject(value.env);

  if (
    value.isEnabled !== undefined &&
    typeof value.isEnabled !== "boolean"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid MCP server payload: isEnabled must be boolean",
    );
  }

  return {
    name: value.name,
    command: value.command,
    args: value.args,
    env,
    isEnabled: value.isEnabled ?? true,
  };
}

function ensureUpdateMCPServerPayload(
  body: unknown,
): UpdateMCPServerInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid MCP server patch: expected object",
    );
  }

  const value = body as Partial<UpdateMCPServerInput>;
  const patch: UpdateMCPServerInput = {};

  if (value.name !== undefined) {
    if (typeof value.name !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid MCP server patch: name must be string",
      );
    }
    patch.name = value.name;
  }

  if (value.command !== undefined) {
    if (typeof value.command !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid MCP server patch: command must be string",
      );
    }
    patch.command = value.command;
  }

  if (value.args !== undefined) {
    if (
      !Array.isArray(value.args) ||
      value.args.some((a) => typeof a !== "string")
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid MCP server patch: args must be array of strings",
      );
    }
    patch.args = value.args;
  }

  if (value.env !== undefined) {
    patch.env = ensureEnvObject(value.env);
  }

  if (value.isEnabled !== undefined) {
    if (typeof value.isEnabled !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid MCP server patch: isEnabled must be boolean",
      );
    }
    patch.isEnabled = value.isEnabled;
  }

  return patch;
}

export function registerMCPServerRoutes(app: FastifyInstance): void {
  app.get("/mcp-servers", async () => {
    const servers = await app.mcpServerService.listServers();
    return servers;
  });

  app.get("/mcp-servers/:id", async (request) => {
    const { id } = request.params as { id: string };
    const server = await app.mcpServerService.getServer(id);
    if (!server) {
      throw new AppError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    return server;
  });

  app.post("/mcp-servers", async (request, reply) => {
    const input = ensureCreateMCPServerPayload(request.body);
    const created = await app.mcpServerService.registerServer(input);
    void reply.status(201);
    return created;
  });

  app.patch("/mcp-servers/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdateMCPServerPayload(request.body);
    const updated = await app.mcpServerService.updateServer(id, patch);
    if (!updated) {
      throw new AppError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }
    return updated;
  });

  app.delete("/mcp-servers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.mcpServerService.deleteServer(id);
    void reply.status(204).send();
  });
}

