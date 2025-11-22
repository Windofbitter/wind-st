import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getPreset,
  updatePreset,
  type Preset,
  type UpdatePresetRequest,
} from "../../api/presets";
import { ApiError } from "../../api/httpClient";

interface PresetEditorPanelProps {
  presetId: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function PresetEditorPanel({
  presetId,
  onSaved,
  onCancel,
}: PresetEditorPanelProps) {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<UpdatePresetRequest>({});

  useEffect(() => {
    if (presetId) {
      void loadPreset(presetId);
    }
  }, [presetId]);

  async function loadPreset(id: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getPreset(id);
      setPreset(data);
      setForm({
        title: data.title,
        description: data.description,
        content: data.content,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load preset",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!presetId) return;
    setSaving(true);
    setError(null);
    try {
      await updatePreset(presetId, form);
      if (onSaved) onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to save preset",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>
          {t("presets.editTitle") || "Edit Preset"}
        </h4>
        {onCancel && (
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div>
          {t("common.loading") || "Loading..."}
        </div>
      )}
      {error && (
        <div
          className="badge badge-error"
          style={{ marginBottom: "0.5rem" }}
        >
          {t("common.errorPrefix")} {error}
        </div>
      )}

      {!loading && preset && (
        <>
          <div className="input-group">
            <label>
              {t("presets.editFormTitleLabel") ||
                t("presets.titleLabel") ||
                "Title"}
            </label>
            <input
              type="text"
              value={form.title ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label>
              {t(
                "presets.editFormDescriptionLabel",
              ) ||
                t("presets.descriptionLabel") ||
                "Description"}
            </label>
            <textarea
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
          {preset.kind === "static_text" && (
            <div className="input-group">
              <label>
                {t("presets.editFormContentLabel") ||
                  t("presets.contentLabel") ||
                  "Content"}
              </label>
              <textarea
                value={form.content ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    content: e.target.value,
                  })
                }
                rows={6}
                style={{ fontFamily: "monospace" }}
              />
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            {onCancel && (
              <button
                type="button"
                className="btn"
                onClick={onCancel}
              >
                {t("common.cancel") || "Cancel"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving
                ? t("common.saving") || "Saving..."
                : t("common.save") || "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

