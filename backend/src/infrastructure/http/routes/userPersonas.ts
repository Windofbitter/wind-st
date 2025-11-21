import type { FastifyInstance } from "fastify";
import type {
  CreateUserPersonaInput,
  UpdateUserPersonaInput,
  UserPersonaFilter,
} from "../../../core/ports/UserPersonaRepository";
import { AppError } from "../../../application/errors/AppError";

function toFilter(query: Record<string, unknown>): UserPersonaFilter | undefined {
  const filter: UserPersonaFilter = {};
  if (query.isDefault !== undefined) {
    if (query.isDefault === "true" || query.isDefault === true) {
      filter.isDefault = true;
    } else if (query.isDefault === "false" || query.isDefault === false) {
      filter.isDefault = false;
    } else {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid persona query: isDefault must be true or false",
      );
    }
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

function ensureCreatePayload(body: unknown): CreateUserPersonaInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona payload: expected object",
    );
  }

  const value = body as Partial<CreateUserPersonaInput>;
  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona payload: name is required",
    );
  }

  if (
    value.description !== undefined &&
    value.description !== null &&
    typeof value.description !== "string"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona payload: description must be string or null",
    );
  }

  if (value.prompt !== undefined && value.prompt !== null && typeof value.prompt !== "string") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona payload: prompt must be string or null",
    );
  }

  if (value.isDefault !== undefined && typeof value.isDefault !== "boolean") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona payload: isDefault must be boolean",
    );
  }

  return {
    name: value.name.trim(),
    description: value.description ?? null,
    prompt: value.prompt ?? null,
    isDefault: value.isDefault ?? false,
  };
}

function ensureUpdatePayload(body: unknown): UpdateUserPersonaInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona patch: expected object",
    );
  }

  const value = body as Partial<UpdateUserPersonaInput>;
  const patch: UpdateUserPersonaInput = {};

  if (value.name !== undefined) {
    if (typeof value.name !== "string" || value.name.trim() === "") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid user persona patch: name must be non-empty string",
      );
    }
    patch.name = value.name.trim();
  }

  if (value.description !== undefined) {
    if (value.description !== null && typeof value.description !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid user persona patch: description must be string or null",
      );
    }
    patch.description = value.description;
  }

  if (value.prompt !== undefined) {
    if (value.prompt !== null && typeof value.prompt !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid user persona patch: prompt must be string or null",
      );
    }
    patch.prompt = value.prompt;
  }

  if (value.isDefault !== undefined) {
    if (typeof value.isDefault !== "boolean") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid user persona patch: isDefault must be boolean",
      );
    }
    patch.isDefault = value.isDefault;
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid user persona patch: no fields to update",
    );
  }

  return patch;
}

export function registerUserPersonaRoutes(app: FastifyInstance): void {
  app.get("/user-personas", async (request) => {
    const filter = toFilter(request.query as Record<string, unknown>);
    return app.userPersonaService.list(filter);
  });

  app.get("/user-personas/:id", async (request) => {
    const { id } = request.params as { id: string };
    const persona = await app.userPersonaService.getById(id);
    if (!persona) {
      throw new AppError("USER_PERSONA_NOT_FOUND", "User persona not found");
    }
    return persona;
  });

  app.post("/user-personas", async (request, reply) => {
    const persona = await app.userPersonaService.create(
      ensureCreatePayload(request.body),
    );
    void reply.status(201);
    return persona;
  });

  app.patch("/user-personas/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdatePayload(request.body);
    const updated = await app.userPersonaService.update(id, patch);
    if (!updated) {
      throw new AppError("USER_PERSONA_NOT_FOUND", "User persona not found");
    }
    return updated;
  });

  app.delete("/user-personas/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.userPersonaService.delete(id);
    void reply.status(204).send();
  });
}
