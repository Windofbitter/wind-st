import type { FastifyInstance } from "fastify";
import { AppError } from "../../../application/errors/AppError";

interface AttachMCPServerBody {
  mcpServerId: string;
}

function ensureAttachMCPServerPayload(
  body: unknown,
): AttachMCPServerBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character MCP server payload: expected object",
    );
  }

  const value = body as Partial<AttachMCPServerBody>;
  if (
    typeof value.mcpServerId !== "string" ||
    value.mcpServerId.trim() === ""
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character MCP server payload: mcpServerId is required",
    );
  }

  return { mcpServerId: value.mcpServerId };
}

export function registerCharacterMCPServerRoutes(
  app: FastifyInstance,
): void {
  app.get("/characters/:characterId/mcp-servers", async (request) => {
    const { characterId } = request.params as { characterId: string };
    const mappings =
      await app.characterMcpServerService.listForCharacter(characterId);
    return mappings;
  });

  app.post(
    "/characters/:characterId/mcp-servers",
    async (request, reply) => {
      const { characterId } = request.params as { characterId: string };
      const { mcpServerId } = ensureAttachMCPServerPayload(
        request.body,
      );
      const attached =
        await app.characterMcpServerService.attachServer(
          characterId,
          mcpServerId,
        );
      void reply.status(201);
      return attached;
    },
  );

  app.delete("/character-mcp-servers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.characterMcpServerService.detachServer(id);
    void reply.status(204).send();
  });
}

