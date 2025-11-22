import type { FastifyInstance } from "fastify";
import type { PromptPreset } from "../../../core/entities/PromptPreset";
import { AppError } from "../../../application/errors/AppError";
import type { AttachPromptPresetInput } from "../../../application/services/PromptStackService";

interface AttachPresetBody {
  presetId?: string;
  kind?: "history" | "mcp_tools" | "lorebook";
  lorebookId?: string;
  role: PromptPreset["role"];
  position?: number;
}

interface ReorderBody {
  ids: string[];
}

interface UpdatePromptPresetBody {
  isEnabled: boolean;
}

function ensureAttachPresetPayload(body: unknown): AttachPromptPresetInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt stack payload: expected object",
    );
  }

  const value = body as Partial<AttachPresetBody>;

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

  const positionPatch =
    value.position !== undefined ? { position: value.position } : {};

  // Attach by existing presetId (static text) or by kind for special entries.
  if (value.presetId && typeof value.presetId === "string") {
    return {
      presetId: value.presetId,
      role: value.role,
      ...positionPatch,
    };
  }

  if (value.kind === "history" || value.kind === "mcp_tools") {
    return {
      kind: value.kind,
      role: value.role,
      ...positionPatch,
    };
  }

  if (value.kind === "lorebook") {
    if (typeof (value as any).lorebookId !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid prompt stack payload: lorebookId is required for kind=lorebook",
      );
    }
    return {
      kind: "lorebook",
      lorebookId: (value as any).lorebookId,
      role: value.role,
      ...positionPatch,
    };
  }

  throw new AppError(
    "VALIDATION_ERROR",
    "Invalid prompt stack payload: provide presetId or kind",
  );
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

function ensureUpdatePayload(body: unknown): UpdatePromptPresetBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt preset update payload: expected object",
    );
  }
  const value = body as Partial<UpdatePromptPresetBody>;
  if (typeof value.isEnabled !== "boolean") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid prompt preset update payload: isEnabled must be boolean",
    );
  }
  return { isEnabled: value.isEnabled };
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
    const payload = ensureAttachPresetPayload(request.body);
    const attached = await app.promptStackService.attachPresetToCharacter(
      characterId,
      payload,
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

  app.patch("/prompt-presets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isEnabled } = ensureUpdatePayload(request.body);
    const updated = await app.promptStackService.setPromptPresetEnabled(
      id,
      isEnabled,
    );
    if (!updated) {
      void reply.status(404).send();
      return;
    }
    return updated;
  });
}
