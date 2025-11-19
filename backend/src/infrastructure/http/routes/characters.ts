import type { FastifyInstance } from "fastify";
import type {
  CharacterFilter,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../../../core/ports/CharacterRepository";
import { AppError } from "../../../application/errors/AppError";

function toCharacterFilter(
  query: Record<string, unknown>,
): CharacterFilter | undefined {
  const name = query.name;
  if (typeof name === "string" && name.trim() !== "") {
    return { nameContains: name };
  }
  return undefined;
}

function ensureCreatePayload(body: unknown): CreateCharacterInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character payload: expected object",
    );
  }

  const value = body as Partial<CreateCharacterInput>;

  if (
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.persona !== "string" ||
    typeof value.avatarPath !== "string"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character payload: missing or invalid fields",
    );
  }

  if (
    value.creatorNotes !== undefined &&
    value.creatorNotes !== null &&
    typeof value.creatorNotes !== "string"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character payload: creatorNotes must be string or null",
    );
  }

  return {
    name: value.name,
    description: value.description,
    persona: value.persona,
    avatarPath: value.avatarPath,
    creatorNotes: value.creatorNotes ?? null,
  };
}

function ensureUpdatePayload(body: unknown): UpdateCharacterInput {
  if (!body || typeof body !== "object") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid character patch: expected object",
    );
  }

  const value = body as Partial<UpdateCharacterInput>;
  const patch: UpdateCharacterInput = {};

  if (value.name !== undefined) {
    if (typeof value.name !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid character patch: name must be string",
      );
    }
    patch.name = value.name;
  }
  if (value.description !== undefined) {
    if (typeof value.description !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid character patch: description must be string",
      );
    }
    patch.description = value.description;
  }
  if (value.persona !== undefined) {
    if (typeof value.persona !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid character patch: persona must be string",
      );
    }
    patch.persona = value.persona;
  }
  if (value.avatarPath !== undefined) {
    if (typeof value.avatarPath !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid character patch: avatarPath must be string",
      );
    }
    patch.avatarPath = value.avatarPath;
  }
  if (value.creatorNotes !== undefined) {
    if (
      value.creatorNotes !== null &&
      typeof value.creatorNotes !== "string"
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid character patch: creatorNotes must be string or null",
      );
    }
    patch.creatorNotes = value.creatorNotes;
  }

  return patch;
}

export function registerCharacterRoutes(app: FastifyInstance): void {
  app.get("/characters", async (request) => {
    const filter = toCharacterFilter(request.query as Record<string, unknown>);
    const characters = await app.characterService.listCharacters(filter);
    return characters;
  });

  app.get("/characters/:id", async (request) => {
    const { id } = request.params as { id: string };
    const character = await app.characterService.getCharacter(id);
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }
    return character;
  });

  app.post("/characters", async (request, reply) => {
    const input = ensureCreatePayload(request.body);
    const created = await app.characterService.createCharacter(input);
    void reply.status(201);
    return created;
  });

  app.patch("/characters/:id", async (request) => {
    const { id } = request.params as { id: string };
    const patch = ensureUpdatePayload(request.body);
    const updated = await app.characterService.updateCharacter(id, patch);
    if (!updated) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }
    return updated;
  });

  app.delete("/characters/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.characterService.deleteCharacter(id);
    void reply.status(204).send();
  });
}

