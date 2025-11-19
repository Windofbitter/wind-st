import type { FastifyInstance } from "fastify";
import { AppError } from "../../../application/errors/AppError";

interface AttachLorebookBody {
  lorebookId: string;
}

function ensureAttachLorebookPayload(body: unknown): AttachLorebookBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character lorebook payload: expected object",
    );
  }

  const value = body as Partial<AttachLorebookBody>;
  if (
    typeof value.lorebookId !== "string" ||
    value.lorebookId.trim() === ""
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character lorebook payload: lorebookId is required",
    );
  }

  return { lorebookId: value.lorebookId };
}

export function registerCharacterLorebookRoutes(
  app: FastifyInstance,
): void {
  app.get("/characters/:characterId/lorebooks", async (request) => {
    const { characterId } = request.params as { characterId: string };
    const mappings =
      await app.characterLorebookService.listForCharacter(characterId);
    return mappings;
  });

  app.post(
    "/characters/:characterId/lorebooks",
    async (request, reply) => {
      const { characterId } = request.params as { characterId: string };
      const { lorebookId } = ensureAttachLorebookPayload(request.body);
      const attached =
        await app.characterLorebookService.attachLorebook(
          characterId,
          lorebookId,
        );
      void reply.status(201);
      return attached;
    },
  );

  app.delete("/character-lorebooks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.characterLorebookService.detachLorebook(id);
    void reply.status(204).send();
  });
}

