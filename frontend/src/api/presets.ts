import { http, unwrap } from "./httpClient";

export type PresetKind = "static_text";

export interface Preset {
  id: string;
  title: string;
  description: string;
  kind: PresetKind;
  content: string | null;
  builtIn: boolean;
}

export interface ListPresetsParams {
  kind?: PresetKind;
  builtIn?: boolean;
  titleContains?: string;
}

export interface CreatePresetRequest {
  title: string;
  description: string;
  kind: PresetKind;
  content?: string | null;
  builtIn?: boolean;
}

export type UpdatePresetRequest = Partial<CreatePresetRequest>;

export async function listPresets(
  params?: ListPresetsParams,
): Promise<Preset[]> {
  return unwrap(http.get<Preset[]>("/presets", { params }));
}

export async function getPreset(id: string): Promise<Preset> {
  return unwrap(http.get<Preset>(`/presets/${id}`));
}

export async function createPreset(
  payload: CreatePresetRequest,
): Promise<Preset> {
  return unwrap(http.post<Preset>("/presets", payload));
}

export async function updatePreset(
  id: string,
  payload: UpdatePresetRequest,
): Promise<Preset> {
  return unwrap(http.patch<Preset>(`/presets/${id}`, payload));
}

export async function deletePreset(id: string): Promise<void> {
  await unwrap(http.delete<void>(`/presets/${id}`));
}

