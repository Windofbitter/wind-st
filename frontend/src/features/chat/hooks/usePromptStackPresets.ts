import { useEffect, useState } from "react";
import type { PromptPreset } from "../../../api/promptStack";
import type { Preset } from "../../../api/presets";
import { getPreset } from "../../../api/presets";
import { ApiError } from "../../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

export interface PromptStackPresetsResult {
  presetsById: Map<string, Preset>;
  state: LoadState;
}

export function usePromptStackPresets(
  stack: PromptPreset[],
): PromptStackPresetsResult {
  const [presetsById, setPresetsById] = useState<Map<string, Preset>>(
    () => new Map(),
  );
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!stack || stack.length === 0) {
      setPresetsById(new Map());
      setState({ loading: false, error: null });
      return;
    }

    const ids = Array.from(
      new Set(stack.map((pp) => pp.presetId)),
    );

    let cancelled = false;
    setState({ loading: true, error: null });

    async function load() {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const preset = await getPreset(id);
              return { id, preset, error: null as string | null };
            } catch (err) {
              const message =
                err instanceof ApiError
                  ? err.message
                  : "Failed to load preset";
              return { id, preset: null, error: message };
            }
          }),
        );
        if (cancelled) return;

        const next = new Map<string, Preset>();
        for (const result of results) {
          if (result.preset) {
            next.set(result.id, result.preset);
          }
        }
        setPresetsById(next);

        const firstError = results.find((r) => r.error)?.error;
        setState({
          loading: false,
          error: firstError ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error:
            err instanceof ApiError
              ? err.message
              : "Failed to load presets",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [stack]);

  return { presetsById, state };
}

