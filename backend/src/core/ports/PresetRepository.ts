import type { Preset, PresetKind } from "../entities/Preset";

export interface CreatePresetInput {
  title: string;
  description: string;
  kind: PresetKind;
  content?: string | null;
  builtIn?: boolean;
}

export interface UpdatePresetInput {
  title?: string;
  description?: string;
  content?: string | null;
  builtIn?: boolean;
}

export interface PresetFilter {
  kind?: PresetKind;
  builtIn?: boolean;
  titleContains?: string;
}

export interface PresetRepository {
  create(data: CreatePresetInput): Promise<Preset>;
  getById(id: string): Promise<Preset | null>;
  list(filter?: PresetFilter): Promise<Preset[]>;
  update(id: string, patch: UpdatePresetInput): Promise<Preset | null>;
  delete(id: string): Promise<void>;
}

