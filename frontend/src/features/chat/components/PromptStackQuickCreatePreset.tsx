import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptRole } from "../../../api/promptStack";
import { attachPromptPreset } from "../../../api/promptStack";
import type { CreatePresetRequest } from "../../../api/presets";
import { createPreset } from "../../../api/presets";
import { ApiError } from "../../../api/httpClient";

interface PromptStackQuickCreatePresetProps {
  characterId: string;
  role: PromptRole;
  onAttached: () => void | Promise<void>;
  onClose: () => void;
}

export function PromptStackQuickCreatePreset({
  characterId,
  role,
  onAttached,
  onClose,
}: PromptStackQuickCreatePresetProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreatePresetRequest>({
    title: "",
    description: "",
    kind: "static_text",
    content: "",
    builtIn: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const title = form.title.trim();
    if (!title) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createPreset({
        ...form,
        title,
        description: form.description?.trim() ?? "",
        content: form.content ?? "",
        builtIn: false,
      });

      await attachPromptPreset(characterId, {
        presetId: created.id,
        role,
      });

      await onAttached();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create and attach preset",
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
          {t("presets.newTitle") || "New preset"}
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
        <label htmlFor="quick-preset-title">
          {t("presets.newFormTitleLabel")}
        </label>
        <input
          id="quick-preset-title"
          type="text"
          value={form.title}
          onChange={(e) =>
            setForm({
              ...form,
              title: e.target.value,
            })
          }
        />
      </div>
      <div className="input-group">
        <label htmlFor="quick-preset-description">
          {t("presets.newFormDescriptionLabel")}
        </label>
        <textarea
          id="quick-preset-description"
          value={form.description ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
          rows={2}
        />
      </div>
      <div className="input-group">
        <label htmlFor="quick-preset-content">
          {t("presets.newFormContentLabel")}
        </label>
        <textarea
          id="quick-preset-content"
          value={form.content ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              content: e.target.value,
            })
          }
          rows={4}
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
            ? t("presets.newCreateButtonCreating") || "Creating..."
            : t("presets.newCreateButton") || "Create and attach"}
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
