import type { PromptPreset, PromptRole } from "../entities/PromptPreset";

export interface CreatePromptPresetInput {
  characterId: string;
  presetId: string;
  role: PromptRole;
  sortOrder: number;
}

export interface UpdatePromptPresetInput {
  role?: PromptRole;
  sortOrder?: number;
}

export interface PromptPresetRepository {
  create(data: CreatePromptPresetInput): Promise<PromptPreset>;
  getById(id: string): Promise<PromptPreset | null>;
  listByCharacter(characterId: string): Promise<PromptPreset[]>;
  update(id: string, patch: UpdatePromptPresetInput): Promise<PromptPreset | null>;
  delete(id: string): Promise<void>;
}

