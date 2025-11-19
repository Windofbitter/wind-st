import { describe, expect, it } from "vitest";
import { PromptStackService } from "../../src/application/services/PromptStackService";
import {
  FakeCharacterRepository,
  FakePresetRepository,
  FakePromptPresetRepository,
} from "./fakeRepositories";

function createService() {
  const characterRepo = new FakeCharacterRepository();
  const presetRepo = new FakePresetRepository();
  const promptPresetRepo = new FakePromptPresetRepository();
  const service = new PromptStackService(
    characterRepo,
    presetRepo,
    promptPresetRepo,
  );
  return { characterRepo, presetRepo, promptPresetRepo, service };
}

describe("PromptStackService", () => {
  it("returns prompt stack for character", async () => {
    const { characterRepo, presetRepo, promptPresetRepo, service } =
      createService();

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
    });
    const preset = await presetRepo.create({
      title: "P",
      description: "d",
      kind: "static_text",
    });
    await promptPresetRepo.create({
      characterId: character.id,
      presetId: preset.id,
      role: "system",
      sortOrder: 0,
    });

    const stack = await service.getPromptStackForCharacter(character.id);
    expect(stack).toHaveLength(1);
    expect(stack[0].presetId).toBe(preset.id);
  });

  it("throws when attaching preset to missing character or preset", async () => {
    const { presetRepo, service, characterRepo } = createService();
    const preset = await presetRepo.create({
      title: "P",
      description: "d",
      kind: "static_text",
    });

    await expect(
      service.attachPresetToCharacter("missing", preset.id, "system"),
    ).rejects.toThrowError("Character not found");

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
    });

    await expect(
      service.attachPresetToCharacter(character.id, "missing", "system"),
    ).rejects.toThrowError("Preset not found");
  });

  it("appends new prompt preset to end when no position given", async () => {
    const { characterRepo, presetRepo, promptPresetRepo, service } =
      createService();

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
    });
    const p1 = await presetRepo.create({
      title: "P1",
      description: "d",
      kind: "static_text",
    });
    const p2 = await presetRepo.create({
      title: "P2",
      description: "d",
      kind: "static_text",
    });

    await service.attachPresetToCharacter(character.id, p1.id, "system");
    await service.attachPresetToCharacter(character.id, p2.id, "assistant");

    const stack = await promptPresetRepo.listByCharacter(character.id);
    expect(stack.map((pp) => pp.sortOrder)).toEqual([0, 1]);
  });

  it("inserts preset at given position and shifts others", async () => {
    const { characterRepo, presetRepo, promptPresetRepo, service } =
      createService();

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
    });

    const p1 = await presetRepo.create({
      title: "P1",
      description: "d",
      kind: "static_text",
    });
    const p2 = await presetRepo.create({
      title: "P2",
      description: "d",
      kind: "static_text",
    });
    const p3 = await presetRepo.create({
      title: "P3",
      description: "d",
      kind: "static_text",
    });

    const pp1 = await service.attachPresetToCharacter(
      character.id,
      p1.id,
      "system",
    );
    const pp2 = await service.attachPresetToCharacter(
      character.id,
      p2.id,
      "assistant",
    );

    expect(pp1.sortOrder).toBe(0);
    expect(pp2.sortOrder).toBe(1);

    const inserted = await service.attachPresetToCharacter(
      character.id,
      p3.id,
      "user",
      1,
    );
    expect(inserted.sortOrder).toBe(1);

    const finalStack = await promptPresetRepo.listByCharacter(character.id);
    expect(finalStack.map((pp) => [pp.presetId, pp.sortOrder])).toEqual([
      [p1.id, 0],
      [p3.id, 1],
      [p2.id, 2],
    ]);
  });

  it("detaches preset and compacts sortOrder", async () => {
    const { characterRepo, presetRepo, promptPresetRepo, service } =
      createService();

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
    });

    const p1 = await presetRepo.create({
      title: "P1",
      description: "d",
      kind: "static_text",
    });
    const p2 = await presetRepo.create({
      title: "P2",
      description: "d",
      kind: "static_text",
    });
    const p3 = await presetRepo.create({
      title: "P3",
      description: "d",
      kind: "static_text",
    });

    const pp1 = await service.attachPresetToCharacter(
      character.id,
      p1.id,
      "system",
    );
    const pp2 = await service.attachPresetToCharacter(
      character.id,
      p2.id,
      "assistant",
    );
    const pp3 = await service.attachPresetToCharacter(
      character.id,
      p3.id,
      "user",
    );

    await service.detachPromptPreset(pp2.id);

    const finalStack = await promptPresetRepo.listByCharacter(character.id);
    expect(finalStack.map((pp) => [pp.id, pp.sortOrder])).toEqual([
      [pp1.id, 0],
      [pp3.id, 1],
    ]);
  });

  it("reorders prompt presets and validates input", async () => {
    const { characterRepo, presetRepo, promptPresetRepo, service } =
      createService();

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
    });

    const p1 = await presetRepo.create({
      title: "P1",
      description: "d",
      kind: "static_text",
    });
    const p2 = await presetRepo.create({
      title: "P2",
      description: "d",
      kind: "static_text",
    });

    const pp1 = await service.attachPresetToCharacter(
      character.id,
      p1.id,
      "system",
    );
    const pp2 = await service.attachPresetToCharacter(
      character.id,
      p2.id,
      "assistant",
    );

    await expect(
      service.reorderPromptPresets(character.id, [pp1.id]),
    ).rejects.toThrowError("Reorder list must include all prompt presets");

    await expect(
      service.reorderPromptPresets(character.id, [pp1.id, "other-id"]),
    ).rejects.toThrowError("Prompt preset does not belong to character");

    await service.reorderPromptPresets(character.id, [pp2.id, pp1.id]);

    const finalStack = await promptPresetRepo.listByCharacter(character.id);
    expect(finalStack.map((pp) => [pp.id, pp.sortOrder])).toEqual([
      [pp2.id, 0],
      [pp1.id, 1],
    ]);
  });
});
