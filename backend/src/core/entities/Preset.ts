export type PresetKind = "static_text";

export interface Preset {
  id: string;
  title: string;
  description: string;
  kind: PresetKind;
  content: string | null;
  builtIn: boolean;
}

