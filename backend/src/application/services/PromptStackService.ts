import type { PromptPreset } from "../../core/entities/PromptPreset";
import type { CharacterRepository } from "../../core/ports/CharacterRepository";
import type {
  CreatePromptPresetInput,
  PromptPresetRepository,
} from "../../core/ports/PromptPresetRepository";
import type { PresetRepository } from "../../core/ports/PresetRepository";
import { AppError } from "../errors/AppError";

export class PromptStackService {
  constructor(
    private readonly characterRepo: CharacterRepository,
    private readonly presetRepo: PresetRepository,
    private readonly promptPresetRepo: PromptPresetRepository,
  ) {}

  async getPromptStackForCharacter(
    characterId: string,
  ): Promise<PromptPreset[]> {
    return this.promptPresetRepo.listByCharacter(characterId);
  }

  async attachPresetToCharacter(
    characterId: string,
    presetId: string,
    role: PromptPreset["role"],
    position?: number,
  ): Promise<PromptPreset> {
    const character = await this.characterRepo.getById(characterId);
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }

    const preset = await this.presetRepo.getById(presetId);
    if (!preset) {
      throw new AppError("PRESET_NOT_FOUND", "Preset not found");
    }

    const existing = await this.promptPresetRepo.listByCharacter(characterId);
    const sortOrder =
      position !== undefined && position >= 0 && position < existing.length
        ? position
        : existing.length;

    // Shift sort_order for existing entries when inserting in the middle.
    const updated: Promise<PromptPreset | null>[] = [];
    for (const pp of existing) {
      if (pp.sortOrder >= sortOrder) {
        updated.push(
          this.promptPresetRepo.update(pp.id, {
            sortOrder: pp.sortOrder + 1,
          }),
        );
      }
    }
    await Promise.all(updated);

    const createInput: CreatePromptPresetInput = {
      characterId,
      presetId,
      role,
      sortOrder,
    };

    return this.promptPresetRepo.create(createInput);
  }

  async detachPromptPreset(promptPresetId: string): Promise<void> {
    const promptPreset = await this.promptPresetRepo.getById(promptPresetId);
    if (!promptPreset) return;

    const characterId = promptPreset.characterId;
    const removedOrder = promptPreset.sortOrder;

    await this.promptPresetRepo.delete(promptPresetId);

    const remaining = await this.promptPresetRepo.listByCharacter(characterId);
    const updates: Promise<PromptPreset | null>[] = [];
    for (const pp of remaining) {
      if (pp.sortOrder > removedOrder) {
        updates.push(
          this.promptPresetRepo.update(pp.id, {
            sortOrder: pp.sortOrder - 1,
          }),
        );
      }
    }
    await Promise.all(updates);
  }

  async reorderPromptPresets(
    characterId: string,
    orderedPromptPresetIds: string[],
  ): Promise<void> {
    const existing = await this.promptPresetRepo.listByCharacter(characterId);
    const byId = new Map(existing.map((pp) => [pp.id, pp]));

    if (orderedPromptPresetIds.length !== existing.length) {
      throw new AppError(
        "PROMPT_PRESET_REORDER_INCOMPLETE",
        "Reorder list must include all prompt presets",
      );
    }

    const updates: Promise<PromptPreset | null>[] = [];
    orderedPromptPresetIds.forEach((id, index) => {
      if (!byId.has(id)) {
        throw new AppError(
          "PROMPT_PRESET_CHARACTER_MISMATCH",
          "Prompt preset does not belong to character",
        );
      }
      updates.push(
        this.promptPresetRepo.update(id, {
          sortOrder: index,
        }),
      );
    });

    await Promise.all(updates);
  }
}
