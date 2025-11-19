export type PresetKind = "static_text" | "lorebook" | "history" | "mcp_tools";

export interface Preset {
  id: string;
  title: string;
  description: string;
  kind: PresetKind;
  content: string | null;
  builtIn: boolean;
  config: unknown | null;
}

