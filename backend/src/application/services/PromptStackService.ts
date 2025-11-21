import type { PromptPreset } from "../../core/entities/PromptPreset";
import type { Preset, PresetKind } from "../../core/entities/Preset";
import type { CharacterRepository } from "../../core/ports/CharacterRepository";
import type {
  CreatePromptPresetInput,
  PromptPresetRepository,
} from "../../core/ports/PromptPresetRepository";
import type { PresetRepository } from "../../core/ports/PresetRepository";
import type { LorebookRepository } from "../../core/ports/LorebookRepository";
import type { CharacterLorebookRepository } from "../../core/ports/CharacterLorebookRepository";
import { AppError } from "../errors/AppError";

export interface AttachPromptPresetInput {
  presetId?: string;
  kind?: PresetKind;
  lorebookId?: string;
  role: PromptPreset["role"];
  position?: number;
}

export class PromptStackService {
  constructor(
    private readonly characterRepo: CharacterRepository,
    private readonly presetRepo: PresetRepository,
    private readonly promptPresetRepo: PromptPresetRepository,
    private readonly lorebookRepo: LorebookRepository,
    private readonly characterLorebookRepo: CharacterLorebookRepository,
  ) {}

  async getPromptStackForCharacter(
    characterId: string,
  ): Promise<PromptPreset[]> {
    await this.ensureCharacterExists(characterId);

    let stack = await this.promptPresetRepo.listByCharacter(characterId);
    const presets = await this.loadPresetsForStack(stack);

    const historyPreset = await this.ensureHistoryPreset();
    const hasHistory = stack.some(
      (pp) => pp.presetId === historyPreset.id,
    );
    if (!hasHistory) {
      await this.attachPresetToCharacter(characterId, {
        presetId: historyPreset.id,
        role: "system",
      });
      stack = await this.promptPresetRepo.listByCharacter(characterId);
      presets.set(historyPreset.id, historyPreset);
    }

    stack = await this.ensureLegacyLorebooks(characterId, stack, presets);

    return [...stack].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async attachPresetToCharacter(
    characterId: string,
    input: AttachPromptPresetInput,
  ): Promise<PromptPreset> {
    const character = await this.characterRepo.getById(characterId);
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }

    const preset = await this.resolvePreset(input);
    if (!preset) {
      throw new AppError(
        "PRESET_NOT_FOUND",
        "Preset not found for prompt stack attachment",
      );
    }

    const role = input.role;
    const position = input.position;

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
      presetId: preset.id,
      role,
      sortOrder,
    };

    return this.promptPresetRepo.create(createInput);
  }

  async detachPromptPreset(promptPresetId: string): Promise<void> {
    const promptPreset = await this.promptPresetRepo.getById(promptPresetId);
    if (!promptPreset) return;
    const preset = await this.presetRepo.getById(promptPreset.presetId);
    if (preset?.kind === "history") {
      throw new AppError(
        "CANNOT_DELETE_HISTORY_PROMPT",
        "History prompt cannot be removed",
      );
    }

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

  private async resolvePreset(
    input: AttachPromptPresetInput,
  ): Promise<Preset | null> {
    if (input.presetId) {
      return this.presetRepo.getById(input.presetId);
    }
    if (input.kind === "history") {
      return this.ensureHistoryPreset();
    }
    if (input.kind === "mcp_tools") {
      return this.ensureMcpToolsPreset();
    }
    if (input.kind === "lorebook" && input.lorebookId) {
      return this.ensureLorebookPreset(input.lorebookId);
    }
    return null;
  }

  private async ensureCharacterExists(characterId: string): Promise<void> {
    const character = await this.characterRepo.getById(characterId);
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }
  }

  private async ensureHistoryPreset(): Promise<Preset> {
    const existing = await this.presetRepo.list({
      kind: "history",
      builtIn: true,
    });
    if (existing.length > 0) {
      return existing[0];
    }
    return this.presetRepo.create({
      title: "Chat History",
      description: "Latest conversation turns based on chat history config",
      kind: "history",
      content: null,
      config: null,
      builtIn: true,
    });
  }

  private async ensureMcpToolsPreset(): Promise<Preset> {
    const existing = await this.presetRepo.list({
      kind: "mcp_tools",
      builtIn: true,
    });
    if (existing.length > 0) {
      return existing[0];
    }
    return this.presetRepo.create({
      title: "MCP Tools",
      description: "Expose attached MCP servers to the model",
      kind: "mcp_tools",
      content: null,
      config: null,
      builtIn: true,
    });
  }

  private async ensureLorebookPreset(
    lorebookId: string,
  ): Promise<Preset> {
    const lorebook = await this.lorebookRepo.getById(lorebookId);
    if (!lorebook) {
      throw new AppError("LOREBOOK_NOT_FOUND", "Lorebook not found");
    }

    const existing = await this.presetRepo.list({ kind: "lorebook" });
    const found = existing.find((p) => {
      const config = p.config ?? {};
      const id = (config as { lorebookId?: unknown }).lorebookId;
      return typeof id === "string" && id === lorebookId;
    });
    if (found) return found;

    return this.presetRepo.create({
      title: `Lorebook: ${lorebook.name}`,
      description: lorebook.description ?? lorebook.name,
      kind: "lorebook",
      content: null,
      config: { lorebookId },
      builtIn: true,
    });
  }

  private async loadPresetsForStack(
    stack: PromptPreset[],
  ): Promise<Map<string, Preset>> {
    const ids = Array.from(new Set(stack.map((pp) => pp.presetId)));
    const map = new Map<string, Preset>();
    await Promise.all(
      ids.map(async (id) => {
        const preset = await this.presetRepo.getById(id);
        if (preset) {
          map.set(id, preset);
        }
      }),
    );
    return map;
  }

  private async ensureLegacyLorebooks(
    characterId: string,
    stack: PromptPreset[],
    presets: Map<string, Preset>,
  ): Promise<PromptPreset[]> {
    const mappings = await this.characterLorebookRepo.listByCharacter(
      characterId,
    );
    if (mappings.length === 0) return stack;

    const existingLorebookIds = new Set<string>();
    for (const pp of stack) {
      const preset = presets.get(pp.presetId);
      if (preset?.kind !== "lorebook") continue;
      const config = preset.config ?? {};
      const lorebookId = (config as { lorebookId?: unknown }).lorebookId;
      if (typeof lorebookId === "string") {
        existingLorebookIds.add(lorebookId);
      }
    }

    let mutated = false;
    for (const mapping of mappings) {
      if (existingLorebookIds.has(mapping.lorebookId)) continue;
      const lorePreset = await this.ensureLorebookPreset(
        mapping.lorebookId,
      );
      await this.attachPresetToCharacter(characterId, {
        presetId: lorePreset.id,
        role: "system",
      });
      mutated = true;
    }

    if (!mutated) return stack;
    return this.promptPresetRepo.listByCharacter(characterId);
  }
}
