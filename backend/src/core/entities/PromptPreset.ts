export type PromptRole = "system" | "assistant" | "user";

export interface PromptPreset {
  id: string;
  characterId: string;
  presetId: string;
  role: PromptRole;
  sortOrder: number;
}

