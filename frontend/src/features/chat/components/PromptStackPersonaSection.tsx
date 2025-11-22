import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  Character,
  UpdateCharacterRequest,
} from "../../../api/characters";
import { updateCharacter } from "../../../api/characters";
import { ApiError } from "../../../api/httpClient";

interface PromptStackPersonaSectionProps {
  character: Character;
}

export function PromptStackPersonaSection({
  character,
}: PromptStackPersonaSectionProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(character.persona ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(character.persona ?? "");
    setIsEditing(false);
    setError(null);
  }, [character.id, character.persona]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateCharacterRequest = {
        persona: draft,
      };
      await updateCharacter(character.id, payload);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to update persona",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft(character.persona ?? "");
    setError(null);
  }

  return (
    <div className="card" style={{ margin: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>{t("chat.personaTitle")}</strong>
        <button
          className="icon-button"
          type="button"
          onClick={() => {
            setIsEditing((prev) => !prev);
            setError(null);
          }}
          title={t("common.edit") || "Edit"}
        >
          ✎
        </button>
      </div>
      {isEditing ? (
        <>
          <div
            className="input-group"
            style={{ marginTop: "0.5rem" }}
          >
            <label htmlFor="prompt-stack-persona-edit">
              {t("characters.detailPersonaLabel")}
            </label>
            <textarea
              id="prompt-stack-persona-edit"
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving
                ? t(
                    "characters.detailPersonaSaveButtonSaving",
                  )
                : t("characters.detailPersonaSaveButton")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={handleCancel}
            >
              {t("lorebooks.editEntryCancelButton")}
            </button>
          </div>
          {error && (
            <div
              className="badge badge-error"
              style={{ marginTop: "0.5rem" }}
            >
              {t("common.errorPrefix")} {error}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            fontSize: "0.85rem",
            maxHeight: "6rem",
            overflowY: "auto",
            marginTop: "0.25rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {draft || (
            <span style={{ opacity: 0.7 }}>
              {t("chat.personaEmpty")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

