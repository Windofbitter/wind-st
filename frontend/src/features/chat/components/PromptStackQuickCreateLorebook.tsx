import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptRole } from "../../../api/promptStack";
import { attachPromptPreset } from "../../../api/promptStack";
import type { CreateLorebookRequest } from "../../../api/lorebooks";
import { createLorebook } from "../../../api/lorebooks";
import { ApiError } from "../../../api/httpClient";

interface PromptStackQuickCreateLorebookProps {
  characterId: string;
  role: PromptRole;
  onAttached: () => void | Promise<void>;
  onClose: () => void;
}

export function PromptStackQuickCreateLorebook({
  characterId,
  role,
  onAttached,
  onClose,
}: PromptStackQuickCreateLorebookProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateLorebookRequest>({
    name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createLorebook({
        ...form,
        name,
        description: form.description?.trim() ?? "",
      });

      await attachPromptPreset(characterId, {
        kind: "lorebook",
        lorebookId: created.id,
        role,
      });

      await onAttached();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create and attach lorebook",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "0.5rem",
        padding: "0.5rem",
        borderRadius: 4,
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--card-bg)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>
          {t("lorebooks.listNewTitle") || "New lorebook"}
        </strong>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={saving}
        >
          ✕
        </button>
      </div>
      <div className="input-group">
        <label htmlFor="quick-lorebook-name">
          {t("lorebooks.listNameLabel")}
        </label>
        <input
          id="quick-lorebook-name"
          type="text"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        />
      </div>
      <div className="input-group">
        <label htmlFor="quick-lorebook-description">
          {t("lorebooks.listDescriptionLabel")}
        </label>
        <textarea
          id="quick-lorebook-description"
          value={form.description ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
          rows={3}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={onClose}
          disabled={saving}
        >
          {t("common.cancel") || "Cancel"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving
            ? t("lorebooks.listCreateButtonCreating") ||
              "Creating..."
            : t("lorebooks.listCreateButton") ||
              "Create and attach"}
        </button>
      </div>
      {error && (
        <div
          className="badge badge-error"
          style={{ marginTop: "0.25rem" }}
        >
          {t("common.errorPrefix")} {error}
        </div>
      )}
    </div>
  );
}
