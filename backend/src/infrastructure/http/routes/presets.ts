import type { FastifyInstance } from "fastify";
import type {
  CreatePresetInput,
  PresetFilter,
  PresetRepository,
  UpdatePresetInput,
} from "../../../core/ports/PresetRepository";
import type { PresetKind } from "../../../core/entities/Preset";
import { AppError } from "../../../application/errors/AppError";

function isPresetKind(value: unknown): value is PresetKind {
  return (
    value === "static_text" ||
    value === "lorebook" ||
    value === "history" ||
    value === "mcp_tools"
  );
}

function toPresetFilter(
  query: Record<string, unknown>,
): PresetFilter | undefined {
  const filter: PresetFilter = {};

  if (query.kind !== undefined) {
    if (!isPresetKind(query.kind)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid preset query: kind is not supported",
      );
    }
    filter.kind = query.kind;
  }

  if (query.builtIn !== undefined) {
    const raw = query.builtIn;
    if (raw === "true" || raw === true) {
      filter.builtIn = true;
    } else if (raw === "false" || raw === false) {
      filter.builtIn = false;
    } else {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid preset query: builtIn must be true or false",
      );
    }
  }

  if (
    typeof query.titleContains === "string" &&
    query.titleContains.trim() !== ""
  ) {
    filter.titleContains = query.titleContains;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

function ensureCreatePresetPayload(body: unknown): CreatePresetInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid preset payload: expected object",
    );
  }

  const value = body as Partial<CreatePresetInput>;

  if (
    typeof value.title !== "string" ||
    value.title.trim() === "" ||
    typeof value.description !== "string" ||
    !isPresetKind(value.kind)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid preset payload: title, description and kind are required",
    );
  }

  if (
    value.content !== undefined &&
    value.content !== null &&
    typeof value.content !== "string"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid preset payload: content must be string or null",
    );
  }

  if (value.builtIn !== undefined && typeof value.builtIn !== "boolean") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid preset payload: builtIn must be boolean",
    );
  }

  return {
    title: value.title,
    description: value.description,
    kind: value.kind,
    content: value.content ?? null,
    builtIn: value.builtIn ?? false,
    config: value.config ?? null,
  };
}

function ensureUpdatePresetPayload(body: unknown): UpdatePresetInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid preset patch: expected object",
    );
  }

  const value = body as Partial<UpdatePresetInput>;
  const patch: UpdatePresetInput = {};

  if (value.title !== undefined) {
    if (typeof value.title !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid preset patch: title must be string",
      );
    }
    patch.title = value.title;
  }

  if (value.description !== undefined) {
    if (typeof value.description !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid preset patch: description must be string",
      );
    }
    patch.description = value.description;
  }

  if (value.content !== undefined) {
    if (value.content !== null && typeof value.content !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid preset patch: content must be string or null",
      );
    }
    patch.content = value.content;
  }

  if (value.builtIn !== undefined) {
    if (typeof value.builtIn !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid preset patch: builtIn must be boolean",
      );
    }
    patch.builtIn = value.builtIn;
  }

  if (value.config !== undefined) {
    patch.config = value.config;
  }

  return patch;
}

export function registerPresetRoutes(app: FastifyInstance): void {
  app.get("/presets", async (request) => {
    const filter = toPresetFilter(request.query as Record<string, unknown>);
    const presets = await app.presetService.listPresets(filter);
    return presets;
  });

  app.get("/presets/:id", async (request) => {
    const { id } = request.params as { id: string };
    const preset = await app.presetService.getPreset(id);
    if (!preset) {
      throw new AppError("PRESET_NOT_FOUND", "Preset not found");
    }
    return preset;
  });

  app.post("/presets", async (request, reply) => {
    const input = ensureCreatePresetPayload(request.body);
    const created = await app.presetService.createPreset(input);
    void reply.status(201);
    return created;
  });

  app.patch("/presets/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdatePresetPayload(request.body);
    const updated = await app.presetService.updatePreset(id, patch);
    if (!updated) {
      throw new AppError("PRESET_NOT_FOUND", "Preset not found");
    }
    return updated;
  });

  app.delete("/presets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.presetService.deletePreset(id);
    void reply.status(204).send();
  });
}

