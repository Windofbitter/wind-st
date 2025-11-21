import { useCallback, useEffect, useState } from "react";
import type { PromptPreset, PromptRole } from "../../api/promptStack";
import {
  attachPromptPreset,
  detachPromptPreset,
  getPromptStack,
  reorderPromptPresets,
} from "../../api/promptStack";
import type { Preset } from "../../api/presets";
import { listPresets } from "../../api/presets";
import type { Lorebook } from "../../api/lorebooks";
import { listLorebooks } from "../../api/lorebooks";
import type {
  CharacterMCPServer,
  MCPServer,
} from "../../api/mcpServers";
import {
  listCharacterMCPServers,
  listMCPServers,
} from "../../api/mcpServers";
import { ApiError } from "../../api/httpClient";

type LoadState = { loading: boolean; error: string | null };

export interface PromptBuilderData {
  personaDraft: string;
  setPersonaDraft(value: string): void;
  savingPersona: boolean;
  personaError: string | null;
  savePersona(): Promise<void>;

  promptStack: PromptPreset[];
  stackState: LoadState;
  reordering: boolean;
  attachError: string | null;

  presets: Preset[];
  presetsState: LoadState;

  lorebooks: Lorebook[];
  lorebooksState: LoadState;
  selectedLorebookId: string | null;
  setSelectedLorebookId(id: string | null): void;

  mcpServers: MCPServer[];
  characterMcpServers: CharacterMCPServer[];
  mcpState: LoadState;
  reloadMcp(): Promise<void>;

  attachStaticPreset(presetId: string, role: PromptRole): Promise<void>;
  attachLorebook(role: PromptRole): Promise<void>;
  attachMcpTools(role: PromptRole): Promise<void>;
  removePromptPreset(id: string): Promise<void>;
  reorderPromptPresets(ids: string[]): Promise<void>;
}

interface Params {
  characterId: string;
  persona: string;
  onPersonaSave(newPersona: string): Promise<void>;
}

export function usePromptBuilderData({
  characterId,
  persona,
  onPersonaSave,
}: Params): PromptBuilderData {
  const [personaDraft, setPersonaDraft] = useState(persona);
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);

  const [promptStack, setPromptStack] = useState<PromptPreset[]>([]);
  const [stackState, setStackState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [reordering, setReordering] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsState, setPresetsState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [lorebooksState, setLorebooksState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [selectedLorebookId, setSelectedLorebookId] = useState<
    string | null
  >(null);

  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [characterMcpServers, setCharacterMcpServers] = useState<
    CharacterMCPServer[]
  >([]);
  const [mcpState, setMcpState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    setPersonaDraft(persona);
  }, [persona]);

  const loadStack = useCallback(async () => {
    setStackState({ loading: true, error: null });
    try {
      const data = await getPromptStack(characterId);
      setPromptStack(data);
      setStackState({ loading: false, error: null });
    } catch (err) {
      setStackState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load prompt stack",
      });
    }
  }, [characterId]);

  const loadPresets = useCallback(async () => {
    setPresetsState({ loading: true, error: null });
    try {
      const data = await listPresets();
      setPresets(data);
      setPresetsState({ loading: false, error: null });
    } catch (err) {
      setPresetsState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load presets",
      });
    }
  }, []);

  const loadLorebooks = useCallback(async () => {
    setLorebooksState({ loading: true, error: null });
    try {
      const data = await listLorebooks();
      setLorebooks(data);
      setSelectedLorebookId((prev) => prev ?? data[0]?.id ?? null);
      setLorebooksState({ loading: false, error: null });
    } catch (err) {
      setLorebooksState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load lorebooks",
      });
    }
  }, []);

  const reloadMcp = useCallback(async () => {
    setMcpState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [servers, mappings] = await Promise.all([
        listMCPServers(),
        listCharacterMCPServers(characterId),
      ]);
      setMcpServers(servers);
      setCharacterMcpServers(mappings);
      setMcpState({ loading: false, error: null });
    } catch (err) {
      setMcpState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load MCP servers",
      });
    }
  }, [characterId]);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      loadStack(),
      loadPresets(),
      loadLorebooks(),
      reloadMcp(),
    ]);
  }, [loadStack, loadPresets, loadLorebooks, reloadMcp]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  async function savePersona() {
    setSavingPersona(true);
    setPersonaError(null);
    try {
      await onPersonaSave(personaDraft);
    } catch (err) {
      setPersonaError(
        err instanceof ApiError
          ? err.message
          : "Failed to save persona",
      );
    } finally {
      setSavingPersona(false);
    }
  }

  async function attachStaticPreset(
    presetId: string,
    role: PromptRole,
  ) {
    setAttachError(null);
    try {
      await attachPromptPreset(characterId, {
        presetId,
        role,
      });
      await loadStack();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to attach preset",
      );
    }
  }

  async function attachLorebook(role: PromptRole) {
    if (!selectedLorebookId) return;
    setAttachError(null);
    try {
      await attachPromptPreset(characterId, {
        kind: "lorebook",
        lorebookId: selectedLorebookId,
        role,
      });
      await loadStack();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to attach lorebook",
      );
    }
  }

  async function attachMcpTools(role: PromptRole) {
    setAttachError(null);
    try {
      await attachPromptPreset(characterId, {
        kind: "mcp_tools",
        role,
      });
      await loadStack();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to attach MCP tools",
      );
    }
  }

  async function removePromptPreset(id: string) {
    setAttachError(null);
    try {
      await detachPromptPreset(id);
      await loadStack();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to remove prompt preset",
      );
    }
  }

  async function reorderStack(ids: string[]) {
    setReordering(true);
    setAttachError(null);
    try {
      await reorderPromptPresets(characterId, { ids });
      const byId = new Map(promptStack.map((pp) => [pp.id, pp]));
      const reordered: PromptPreset[] = ids
        .map((id, index) => {
          const original = byId.get(id);
          if (!original) return null;
          return { ...original, sortOrder: index };
        })
        .filter((pp): pp is PromptPreset => pp !== null);
      setPromptStack(reordered);
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to reorder prompt presets",
      );
    } finally {
      setReordering(false);
    }
  }

  return {
    personaDraft,
    setPersonaDraft,
    savingPersona,
    personaError,
    savePersona,

    promptStack,
    stackState,
    reordering,
    attachError,

    presets,
    presetsState,

    lorebooks,
    lorebooksState,
    selectedLorebookId,
    setSelectedLorebookId,

    mcpServers,
    characterMcpServers,
    mcpState,
    reloadMcp,

    attachStaticPreset,
    attachLorebook,
    attachMcpTools,
    removePromptPreset,
    reorderPromptPresets: reorderStack,
  };
}
