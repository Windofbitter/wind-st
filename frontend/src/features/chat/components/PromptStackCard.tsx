import { useTranslation } from "react-i18next";
import type { Character } from "../../../api/characters";
import type { PromptPreset } from "../../../api/promptStack";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  selectedCharacter: Character | null;
  promptStack: PromptPreset[];
  promptStackState: LoadState;
}

export function PromptStackCard({
  selectedCharacter,
  promptStack,
  promptStackState,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("chat.promptStackTitle")}
      </h3>
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
                .map((pp) => (
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
                    <span>{pp.presetId}</span>
                    <span className="badge">
                      {pp.role.toUpperCase()}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
