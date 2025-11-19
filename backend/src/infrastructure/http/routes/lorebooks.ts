import type { FastifyInstance } from "fastify";
import type {
  CreateLorebookInput,
  LorebookFilter,
  UpdateLorebookInput,
} from "../../../core/ports/LorebookRepository";
import type {
  CreateLorebookEntryInput,
  UpdateLorebookEntryInput,
} from "../../../core/ports/LorebookEntryRepository";
import { AppError } from "../../../application/errors/AppError";

function toLorebookFilter(
  query: Record<string, unknown>,
): LorebookFilter | undefined {
  const filter: LorebookFilter = {};

  if (query.isGlobal !== undefined) {
    const raw = query.isGlobal;
    if (raw === "true" || raw === true) {
      filter.isGlobal = true;
    } else if (raw === "false" || raw === false) {
      filter.isGlobal = false;
    } else {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook query: isGlobal must be true or false",
      );
    }
  }

  if (
    typeof query.nameContains === "string" &&
    query.nameContains.trim() !== ""
  ) {
    filter.nameContains = query.nameContains;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

function ensureCreateLorebookPayload(body: unknown): CreateLorebookInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook payload: expected object",
    );
  }

  const value = body as Partial<CreateLorebookInput>;

  if (
    typeof value.name !== "string" ||
    value.name.trim() === "" ||
    typeof value.description !== "string"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook payload: name and description are required",
    );
  }

  if (value.isGlobal !== undefined && typeof value.isGlobal !== "boolean") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook payload: isGlobal must be boolean",
    );
  }

  return {
    name: value.name,
    description: value.description,
    isGlobal: value.isGlobal ?? false,
  };
}

function ensureUpdateLorebookPayload(body: unknown): UpdateLorebookInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook patch: expected object",
    );
  }

  const value = body as Partial<UpdateLorebookInput>;
  const patch: UpdateLorebookInput = {};

  if (value.name !== undefined) {
    if (typeof value.name !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook patch: name must be string",
      );
    }
    patch.name = value.name;
  }

  if (value.description !== undefined) {
    if (typeof value.description !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook patch: description must be string",
      );
    }
    patch.description = value.description;
  }

  if (value.isGlobal !== undefined) {
    if (typeof value.isGlobal !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook patch: isGlobal must be boolean",
      );
    }
    patch.isGlobal = value.isGlobal;
  }

  return patch;
}

type CreateLorebookEntryBody = Omit<CreateLorebookEntryInput, "lorebookId">;

function ensureCreateLorebookEntryPayload(
  body: unknown,
): CreateLorebookEntryBody {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook entry payload: expected object",
    );
  }

  const value = body as Partial<CreateLorebookEntryBody>;

  if (
    !Array.isArray(value.keywords) ||
    value.keywords.some((k) => typeof k !== "string")
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook entry payload: keywords must be array of strings",
    );
  }

  if (
    typeof value.content !== "string" ||
    typeof value.insertionOrder !== "number"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook entry payload: content and insertionOrder are required",
    );
  }

  if (
    value.isEnabled !== undefined &&
    typeof value.isEnabled !== "boolean"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook entry payload: isEnabled must be boolean",
    );
  }

  return {
    keywords: value.keywords,
    content: value.content,
    insertionOrder: value.insertionOrder,
    isEnabled: value.isEnabled ?? true,
  };
}

function ensureUpdateLorebookEntryPayload(
  body: unknown,
): UpdateLorebookEntryInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid lorebook entry patch: expected object",
    );
  }

  const value = body as Partial<UpdateLorebookEntryInput>;
  const patch: UpdateLorebookEntryInput = {};

  if (value.keywords !== undefined) {
    if (
      !Array.isArray(value.keywords) ||
      value.keywords.some((k) => typeof k !== "string")
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook entry patch: keywords must be array of strings",
      );
    }
    patch.keywords = value.keywords;
  }

  if (value.content !== undefined) {
    if (typeof value.content !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook entry patch: content must be string",
      );
    }
    patch.content = value.content;
  }

  if (value.insertionOrder !== undefined) {
    if (typeof value.insertionOrder !== "number") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook entry patch: insertionOrder must be number",
      );
    }
    patch.insertionOrder = value.insertionOrder;
  }

  if (value.isEnabled !== undefined) {
    if (typeof value.isEnabled !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid lorebook entry patch: isEnabled must be boolean",
      );
    }
    patch.isEnabled = value.isEnabled;
  }

  return patch;
}

export function registerLorebookRoutes(app: FastifyInstance): void {
  app.get("/lorebooks", async (request) => {
    const filter = toLorebookFilter(request.query as Record<string, unknown>);
    const lorebooks = await app.lorebookService.listLorebooks(filter);
    return lorebooks;
  });

  app.get("/lorebooks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const lorebook = await app.lorebookService.getLorebook(id);
    if (!lorebook) {
      throw new AppError("LOREBOOK_NOT_FOUND", "Lorebook not found");
    }
    return lorebook;
  });

  app.post("/lorebooks", async (request, reply) => {
    const input = ensureCreateLorebookPayload(request.body);
    const created = await app.lorebookService.createLorebook(input);
    void reply.status(201);
    return created;
  });

  app.patch("/lorebooks/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdateLorebookPayload(request.body);
    const updated = await app.lorebookService.updateLorebook(id, patch);
    if (!updated) {
      throw new AppError("LOREBOOK_NOT_FOUND", "Lorebook not found");
    }
    return updated;
  });

  app.delete("/lorebooks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.lorebookService.deleteLorebook(id);
    void reply.status(204).send();
  });

  app.get("/lorebooks/:id/entries", async (request) => {
    const { id } = request.params as { id: string };
    const entries = await app.lorebookService.listLorebookEntries(id);
    return entries;
  });

  app.post("/lorebooks/:id/entries", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ensureCreateLorebookEntryPayload(request.body);
    const created = await app.lorebookService.createLorebookEntry(id, body);
    void reply.status(201);
    return created;
  });

  app.patch("/lorebook-entries/:entryId", async (request) => {
    const { entryId } = request.params as { entryId: string };
    const patch = ensureUpdateLorebookEntryPayload(request.body);
    const updated = await app.lorebookService.updateLorebookEntry(
      entryId,
      patch,
    );
    if (!updated) {
      throw new AppError(
        "LOREBOOK_ENTRY_NOT_FOUND",
        "Lorebook entry not found",
      );
    }
    return updated;
  });

  app.delete("/lorebook-entries/:entryId", async (request, reply) => {
    const { entryId } = request.params as { entryId: string };
    await app.lorebookService.deleteLorebookEntry(entryId);
    void reply.status(204).send();
  });
}

