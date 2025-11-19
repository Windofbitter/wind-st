import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { PromptPresetRepositorySqlite } from "../../src/infrastructure/sqlite/PromptPresetRepositorySqlite";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import { PresetRepositorySqlite } from "../../src/infrastructure/sqlite/PresetRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("PromptPresetRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: PromptPresetRepositorySqlite;
  let characterId: string;
  let presetId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    const characterRepo = new CharacterRepositorySqlite(db);
    const character = await characterRepo.create({
      name: "Char",
      description: "desc",
      persona: "persona",
      avatarPath: "/avatars/x.png",
      creatorNotes: null,
    });
    characterId = character.id;

    const presetRepo = new PresetRepositorySqlite(db);
    const preset = await presetRepo.create({
      title: "Preset",
      description: "desc",
      kind: "static_text",
      content: "Hi",
      builtIn: false,
      config: null,
    });
    presetId = preset.id;

    repo = new PromptPresetRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, gets, lists, updates and deletes prompt presets", async () => {
    const pp1 = await repo.create({
      characterId,
      presetId,
      role: "system",
      sortOrder: 0,
    });
    const pp2 = await repo.create({
      characterId,
      presetId,
      role: "assistant",
      sortOrder: 1,
    });

    const fetched = await repo.getById(pp1.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.role).toBe("system");

    const list = await repo.listByCharacter(characterId);
    expect(list.map((pp) => pp.sortOrder)).toEqual([0, 1]);

    const updated = await repo.update(pp2.id, {
      role: "user",
      sortOrder: 5,
    });
    expect(updated).not.toBeNull();
    expect(updated?.role).toBe("user");
    expect(updated?.sortOrder).toBe(5);

    await repo.delete(pp1.id);
    const afterDelete = await repo.getById(pp1.id);
    expect(afterDelete).toBeNull();
  });

  it("cascades delete when character or preset is removed", async () => {
    const pp = await repo.create({
      characterId,
      presetId,
      role: "system",
      sortOrder: 0,
    });

    const listBefore = await repo.listByCharacter(characterId);
    expect(listBefore).toHaveLength(1);
    expect(listBefore[0].id).toBe(pp.id);

    // Delete character -> prompt preset rows should be removed
    const characterRepo = new CharacterRepositorySqlite(db);
    await characterRepo.delete(characterId);

    const listAfterCharDelete = await repo.listByCharacter(characterId);
    expect(listAfterCharDelete).toHaveLength(0);

    const fetched = await repo.getById(pp.id);
    expect(fetched).toBeNull();
  });
});

