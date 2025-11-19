import { http, unwrap } from "./httpClient";

export type PromptRole = "system" | "assistant" | "user";

export interface PromptPreset {
  id: string;
  characterId: string;
  presetId: string;
  role: PromptRole;
  sortOrder: number;
}

export interface AttachPromptPresetRequest {
  presetId: string;
  role: PromptRole;
  position?: number;
}

export interface ReorderPromptPresetsRequest {
  ids: string[];
}

export async function getPromptStack(
  characterId: string,
): Promise<PromptPreset[]> {
  return unwrap(
    http.get<PromptPreset[]>(
      `/characters/${characterId}/prompt-stack`,
    ),
  );
}

export async function attachPromptPreset(
  characterId: string,
  payload: AttachPromptPresetRequest,
): Promise<PromptPreset> {
  return unwrap(
    http.post<PromptPreset>(
      `/characters/${characterId}/prompt-stack`,
      payload,
    ),
  );
}

export async function reorderPromptPresets(
  characterId: string,
  payload: ReorderPromptPresetsRequest,
): Promise<void> {
  await unwrap(
    http.post<void>(
      `/characters/${characterId}/prompt-stack/reorder`,
      payload,
    ),
  );
}

export async function detachPromptPreset(
  promptPresetId: string,
): Promise<void> {
  await unwrap(http.delete<void>(`/prompt-presets/${promptPresetId}`));
}

