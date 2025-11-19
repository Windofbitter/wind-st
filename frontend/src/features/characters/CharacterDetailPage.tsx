import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type {
  Character,
  UpdateCharacterRequest,
} from "../../api/characters";
import {
  getCharacter,
  updateCharacter,
} from "../../api/characters";
import { ApiError } from "../../api/httpClient";
import { PromptBuilderTab } from "../promptBuilder/PromptBuilderTab";

type TabKey = "overview" | "persona" | "prompt";

interface LoadState {
  loading: boolean;
  error: string | null;
}

export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const location = useLocation();

  const [tab, setTab] = useState<TabKey>("overview");
  const [character, setCharacter] = useState<Character | null>(
    null,
  );
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [overviewDraft, setOverviewDraft] =
    useState<UpdateCharacterRequest>({});
  const [personaDraft, setPersonaDraft] = useState("");

  useEffect(() => {
    if (!characterId) return;
    const hash = location.hash.replace("#", "");
    if (hash === "persona") setTab("persona");
    else if (hash === "prompt-builder") setTab("prompt");
    else setTab("overview");
  }, [location.hash, characterId]);

  useEffect(() => {
    if (!characterId) return;
    void loadCharacter(characterId);
  }, [characterId]);

  async function loadCharacter(id: string) {
    setState({ loading: true, error: null });
    try {
      const data = await getCharacter(id);
      setCharacter(data);
      setOverviewDraft({
        name: data.name,
        description: data.description,
        avatarPath: data.avatarPath,
        creatorNotes: data.creatorNotes,
      });
      setPersonaDraft(data.persona);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load character",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function saveOverview() {
    if (!characterId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateCharacter(
        characterId,
        overviewDraft,
      );
      setCharacter(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "Failed to save character",
      );
    } finally {
      setSaving(false);
    }
  }

  async function savePersona(newPersona: string) {
    if (!characterId) return;
    setSaveError(null);
    setPersonaDraft(newPersona);
    const patch: UpdateCharacterRequest = { persona: newPersona };
    const updated = await updateCharacter(characterId, patch);
    setCharacter(updated);
  }

  function handleTabChange(next: TabKey) {
    setTab(next);
    let hash = "";
    if (next === "persona") hash = "#persona";
    if (next === "prompt") hash = "#prompt-builder";
    window.history.replaceState(
      null,
      "",
      `${location.pathname}${hash}`,
    );
  }

  if (!characterId) {
    return <div>Character ID is missing.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          <button
            type="button"
            className="btn"
            style={{
              backgroundColor:
                tab === "overview"
                  ? "var(--border-color)"
                  : "transparent",
            }}
            onClick={() => handleTabChange("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className="btn"
            style={{
              backgroundColor:
                tab === "persona"
                  ? "var(--border-color)"
                  : "transparent",
            }}
            onClick={() => handleTabChange("persona")}
          >
            Persona
          </button>
          <button
            type="button"
            className="btn"
            style={{
              backgroundColor:
                tab === "prompt"
                  ? "var(--border-color)"
                  : "transparent",
            }}
            onClick={() => handleTabChange("prompt")}
          >
            Prompt Builder
          </button>
        </div>
        {state.loading && <div>Loading character…</div>}
        {state.error && (
          <div className="badge">Error: {state.error}</div>
        )}
        {saveError && (
          <div className="badge">Error: {saveError}</div>
        )}
      </div>

      {character && tab === "overview" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Overview</h3>
          <div className="input-group">
            <label htmlFor="char-name">Name</label>
            <input
              id="char-name"
              type="text"
              value={overviewDraft.name ?? ""}
              onChange={(e) =>
                setOverviewDraft({
                  ...overviewDraft,
                  name: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-description">Description</label>
            <textarea
              id="char-description"
              value={overviewDraft.description ?? ""}
              onChange={(e) =>
                setOverviewDraft({
                  ...overviewDraft,
                  description: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-avatar">Avatar path</label>
            <input
              id="char-avatar"
              type="text"
              value={overviewDraft.avatarPath ?? ""}
              onChange={(e) =>
                setOverviewDraft({
                  ...overviewDraft,
                  avatarPath: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-notes">Creator notes</label>
            <textarea
              id="char-notes"
              value={overviewDraft.creatorNotes ?? ""}
              onChange={(e) =>
                setOverviewDraft({
                  ...overviewDraft,
                  creatorNotes: e.target.value || null,
                })
              }
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void saveOverview()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {character && tab === "persona" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Persona</h3>
          <div className="input-group">
            <label htmlFor="persona-full">Persona</label>
            <textarea
              id="persona-full"
              rows={12}
              value={personaDraft}
              onChange={(e) => setPersonaDraft(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void savePersona(personaDraft)}
          >
            {saving ? "Saving…" : "Save Persona"}
          </button>
        </div>
      )}

      {character && tab === "prompt" && (
        <PromptBuilderTab
          characterId={character.id}
          persona={character.persona}
          onPersonaSave={(p) => savePersona(p)}
        />
      )}
    </div>
  );
}

