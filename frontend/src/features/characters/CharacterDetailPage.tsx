import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
    return <div>{t("characters.detailMissingId")}</div>;
  }

  const tabConfig: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: t("characters.detailTabsOverview") },
    { key: "persona", label: t("characters.detailTabsPersona") },
    {
      key: "prompt",
      label: t("characters.detailTabsPromptBuilder"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "0.5rem",
          }}
          role="tablist"
        >
          {tabConfig.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`btn tab-button${tab === key ? " is-active" : ""}`}
              onClick={() => handleTabChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {state.loading && (
          <div>{t("characters.detailLoading")}</div>
        )}
        {state.error && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
        {saveError && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {saveError}
          </div>
        )}
      </div>

      {character && tab === "overview" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {t("characters.detailOverviewTitle")}
          </h3>
          <div className="input-group">
            <label htmlFor="char-name">
              {t("characters.listNameLabel")}
            </label>
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
            <label htmlFor="char-description">
              {t("characters.listDescriptionLabel")}
            </label>
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
            <label htmlFor="char-avatar">
              {t("characters.listAvatarPathLabel")}
            </label>
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
            <label htmlFor="char-notes">
              {t("characters.listCreatorNotesLabel")}
            </label>
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
            {saving
              ? t("characters.detailOverviewSaveButtonSaving")
              : t("characters.detailOverviewSaveButton")}
          </button>
        </div>
      )}

      {character && tab === "persona" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {t("characters.detailPersonaTitle")}
          </h3>
          <div className="input-group">
            <label htmlFor="persona-full">
              {t("characters.detailPersonaLabel")}
            </label>
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
            {saving
              ? t("characters.detailPersonaSaveButtonSaving")
              : t("characters.detailPersonaSaveButton")}
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

