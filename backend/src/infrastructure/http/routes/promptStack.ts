import type { FastifyInstance } from "fastify";
import type { PromptPreset } from "../../../core/entities/PromptPreset";
import { AppError } from "../../../application/errors/AppError";

interface AttachPresetBody {
  presetId: string;
  role: PromptPreset["role"];
  position?: number;
}

interface ReorderBody {
  ids: string[];
}

function ensureAttachPresetPayload(body: unknown): AttachPresetBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt stack payload: expected object",
    );
  }

  const value = body as Partial<AttachPresetBody>;

  if (typeof value.presetId !== "string" || value.presetId.trim() === "") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt stack payload: presetId is required",
    );
  }

  if (value.role !== "system" && value.role !== "assistant" && value.role !== "user") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt stack payload: role must be one of system|assistant|user",
    );
  }

  if (
    value.position !== undefined &&
    (typeof value.position !== "number" || value.position < 0)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt stack payload: position must be non-negative number",
    );
  }

  const result: AttachPresetBody = {
    presetId: value.presetId,
    role: value.role,
  };

  if (value.position !== undefined) {
    result.position = value.position;
  }

  return result;
}

function ensureReorderPayload(body: unknown): ReorderBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid reorder payload: expected object",
    );
  }

  const value = body as Partial<ReorderBody>;
  if (!Array.isArray(value.ids) || value.ids.some((id) => typeof id !== "string")) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid reorder payload: ids must be array of strings",
    );
  }

  return { ids: value.ids };
}

export function registerPromptStackRoutes(app: FastifyInstance): void {
  app.get("/characters/:characterId/prompt-stack", async (request) => {
    const { characterId } = request.params as { characterId: string };
    const stack =
      await app.promptStackService.getPromptStackForCharacter(characterId);
    return stack;
  });

  app.post("/characters/:characterId/prompt-stack", async (request, reply) => {
    const { characterId } = request.params as { characterId: string };
    const { presetId, role, position } = ensureAttachPresetPayload(
      request.body,
    );
    const attached = await app.promptStackService.attachPresetToCharacter(
      characterId,
      presetId,
      role,
      position,
    );
    void reply.status(201);
    return attached;
  });

  app.post(
    "/characters/:characterId/prompt-stack/reorder",
    async (request, reply) => {
      const { characterId } = request.params as { characterId: string };
      const { ids } = ensureReorderPayload(request.body);
      await app.promptStackService.reorderPromptPresets(characterId, ids);
      void reply.status(204).send();
    },
  );

  app.delete("/prompt-presets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.promptStackService.detachPromptPreset(id);
    void reply.status(204).send();
  });
}
