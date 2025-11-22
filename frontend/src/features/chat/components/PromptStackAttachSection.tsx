import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptRole } from "../../../api/promptStack";
import { attachPromptPreset } from "../../../api/promptStack";
import type { Preset } from "../../../api/presets";
import { listPresets } from "../../../api/presets";
import type { Lorebook } from "../../../api/lorebooks";
import { listLorebooks } from "../../../api/lorebooks";
import { ApiError } from "../../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface PromptStackAttachSectionProps {
  characterId: string;
  onAttached: () => void | Promise<void>;
}

export function PromptStackAttachSection({
  characterId,
  onAttached,
}: PromptStackAttachSectionProps) {
  const { t } = useTranslation();

  const [role, setRole] = useState<PromptRole>("system");

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsState, setPresetsState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [lorebooksState, setLorebooksState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [selectedLorebookId, setSelectedLorebookId] =
    useState<string>("");

  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachingPreset, setAttachingPreset] = useState(false);
  const [attachingLorebook, setAttachingLorebook] = useState(false);

  useEffect(() => {
    void loadPresets();
    void loadLorebooks();
  }, [characterId]);

  async function loadPresets() {
    setPresetsState({ loading: true, error: null });
    try {
      const data = await listPresets({ kind: "static_text" });
      setPresets(data);
      setSelectedPresetId((prev) =>
        prev && data.some((p) => p.id === prev)
          ? prev
          : data[0]?.id ?? "",
      );
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
  }

  async function loadLorebooks() {
    setLorebooksState({ loading: true, error: null });
    try {
      const data = await listLorebooks();
      setLorebooks(data);
      setSelectedLorebookId((prev) =>
        prev && data.some((lb) => lb.id === prev)
          ? prev
          : data[0]?.id ?? "",
      );
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
  }

  async function handleAttachPreset() {
    if (!selectedPresetId) return;
    setAttachError(null);
    setAttachingPreset(true);
    try {
      await attachPromptPreset(characterId, {
        presetId: selectedPresetId,
        role,
      });
      await onAttached();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to attach preset",
      );
    } finally {
      setAttachingPreset(false);
    }
  }

  async function handleAttachLorebook() {
    if (!selectedLorebookId) return;
    setAttachError(null);
    setAttachingLorebook(true);
    try {
      await attachPromptPreset(characterId, {
        kind: "lorebook",
        lorebookId: selectedLorebookId,
        role,
      });
      await onAttached();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to attach lorebook",
      );
    } finally {
      setAttachingLorebook(false);
    }
  }

  const hasPresets = presets.length > 0;
  const hasLorebooks = lorebooks.length > 0;

  if (!characterId) return null;

  return (
    <div className="card" style={{ margin: 0 }}>
      <h3 style={{ marginTop: 0 }}>
        {t("chat.promptStackAttachTitle") ||
          t("promptBuilder.paletteTitle")}
      </h3>
      <div className="input-group">
        <label htmlFor="stack-attach-role">
          {t("promptBuilder.stackAttachRoleLabel")}
        </label>
        <select
          id="stack-attach-role"
          className="select"
          value={role}
          onChange={(e) => setRole(e.target.value as PromptRole)}
        >
          <option value="system">
            {t("promptBuilder.stackRoleFilterSystem")}
          </option>
          <option value="assistant">
            {t("promptBuilder.stackRoleFilterAssistant")}
          </option>
          <option value="user">
            {t("promptBuilder.stackRoleFilterUser")}
          </option>
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "0.75rem",
        }}
      >
        <div className="input-group">
          <label htmlFor="stack-attach-preset">
            {t("promptBuilder.paletteTitle")}
          </label>
          {presetsState.loading && (
            <div>{t("promptBuilder.paletteLoading")}</div>
          )}
          {presetsState.error && (
            <div className="badge badge-error">
              {t("common.errorPrefix")} {presetsState.error}
            </div>
          )}
          {hasPresets ? (
            <>
              <select
                id="stack-attach-preset"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                style={{ marginTop: "0.35rem" }}
                onClick={() => void handleAttachPreset()}
                disabled={attachingPreset}
              >
                {t("promptBuilder.paletteAddButton") ||
                  t("common.add")}
              </button>
            </>
          ) : (
            !presetsState.loading && (
              <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                {t("promptBuilder.paletteEmpty")}
              </div>
            )
          )}
        </div>

        <div className="input-group">
          <label htmlFor="stack-attach-lorebook">
            {t("promptBuilder.paletteSectionLorebooks")}
          </label>
          {lorebooksState.loading && (
            <div>{t("lorebooks.listLoading")}</div>
          )}
          {lorebooksState.error && (
            <div className="badge badge-error">
              {t("common.errorPrefix")} {lorebooksState.error}
            </div>
          )}
          {hasLorebooks ? (
            <>
              <select
                id="stack-attach-lorebook"
                value={selectedLorebookId}
                onChange={(e) =>
                  setSelectedLorebookId(e.target.value)
                }
              >
                {lorebooks.map((lb) => (
                  <option key={lb.id} value={lb.id}>
                    {lb.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                style={{ marginTop: "0.35rem" }}
                onClick={() => void handleAttachLorebook()}
                disabled={attachingLorebook}
              >
                {t("promptBuilder.paletteAddButton") ||
                  t("common.add")}
              </button>
            </>
          ) : (
            !lorebooksState.loading && (
              <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                {t("lorebooks.listEmpty")}
              </div>
            )
          )}
        </div>
      </div>

      {attachError && (
        <div
          className="badge badge-error"
          style={{ marginTop: "0.5rem" }}
        >
          {t("common.errorPrefix")} {attachError}
        </div>
      )}
    </div>
  );
}

