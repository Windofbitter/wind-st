import { useTranslation } from "react-i18next";
import type { Character } from "../../../api/characters";
import type { PromptPreset } from "../../../api/promptStack";
import type { Preset } from "../../../api/presets";
import { usePromptStackPresets } from "../hooks/usePromptStackPresets";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  selectedCharacter: Character | null;
  promptStack: PromptPreset[];
  promptStackState: LoadState;
  onOpenDrawer?: () => void;
}

function getPresetLabel(
  pp: PromptPreset,
  presetsById: Map<string, Preset>,
): string {
  const preset = presetsById.get(pp.presetId);
  if (!preset) return pp.presetId;
  const rawTitle = preset.title || pp.presetId;
  if (preset.kind === "lorebook") {
    return rawTitle.replace(/^lorebook:\s*/i, "");
  }
  return rawTitle;
}

export function PromptStackCard({
  selectedCharacter,
  promptStack,
  promptStackState,
  onOpenDrawer,
}: Props) {
  const { t } = useTranslation();
  const { presetsById } = usePromptStackPresets(promptStack);

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {t("chat.promptStackTitle")}
        </h3>
        <button
          type="button"
          className="btn"
          onClick={onOpenDrawer}
          disabled={!selectedCharacter || !onOpenDrawer}
        >
          {t("chat.promptStackEditButton") || t("common.edit")}
        </button>
      </div>
      {promptStackState.error && (
        <div className="badge badge-error">
          Error: {promptStackState.error}
        </div>
      )}
      {!selectedCharacter && (
        <div>{t("chat.promptStackSelectCharacter")}</div>
      )}
      {selectedCharacter && promptStackState.loading && (
        <div>{t("chat.promptStackLoading")}</div>
      )}
      {selectedCharacter && !promptStackState.loading && (
        <>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>{t("chat.personaTitle")}</strong>
            <div
              style={{
                fontSize: "0.85rem",
                maxHeight: "6rem",
                overflowY: "auto",
                marginTop: "0.25rem",
              }}
            >
              {selectedCharacter.persona || (
                <span style={{ opacity: 0.7 }}>
                  {t("chat.personaEmpty")}
                </span>
              )}
            </div>
          </div>
          <div>
            <strong>{t("chat.stackTitle")}</strong>
            {promptStack.length === 0 && (
              <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                {t("chat.stackEmpty")}
              </div>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {promptStack
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((pp) => {
                  const label = getPresetLabel(pp, presetsById);
                  return (
                  <li
                    key={pp.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      padding: "0.25rem 0",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    <span style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      <span>{label}</span>
                      {pp.isEnabled === false && (
                        <span className="badge badge-secondary">
                          {t("chat.stackDisabled")}
                        </span>
                      )}
                    </span>
                    <span className="badge">
                      {pp.role.toUpperCase()}
                    </span>
                  </li>
                );})}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
