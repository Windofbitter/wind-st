import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptRole } from "../../../api/promptStack";
import { attachPromptPreset } from "../../../api/promptStack";
import type { CreatePresetRequest } from "../../../api/presets";
import { createPreset } from "../../../api/presets";
import { ApiError } from "../../../api/httpClient";

interface MessageSavePresetModalProps {
  isOpen: boolean;
  characterId: string | null;
  messageContent: string;
  defaultRole: PromptRole;
  onClose(): void;
  onSaved?(): void | Promise<void>;
}

export function MessageSavePresetModal({
  isOpen,
  characterId,
  messageContent,
  defaultRole,
  onClose,
  onSaved,
}: MessageSavePresetModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(messageContent);
  const [role, setRole] = useState<PromptRole>(defaultRole);
  const [attachToCharacter, setAttachToCharacter] = useState(
    Boolean(characterId),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstLine =
      messageContent
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? "";
    const defaultTitle =
      firstLine.length > 0
        ? firstLine.slice(0, 80)
        : t("presets.newTitleFallback") || "New preset";
    setTitle(defaultTitle);
    setDescription("");
    setContent(messageContent);
    setRole(defaultRole);
    setAttachToCharacter(Boolean(characterId));
    setError(null);
  }, [isOpen, messageContent, defaultRole, characterId, t]);

  if (!isOpen) return null;

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(
        t("presets.validationTitleRequired") || "Title is required",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: CreatePresetRequest = {
        title: trimmedTitle,
        description: description.trim() || "",
        kind: "static_text",
        content,
        builtIn: false,
      };
      const created = await createPreset(payload);

      if (attachToCharacter && characterId) {
        await attachPromptPreset(characterId, {
          presetId: created.id,
          role,
        });
      }

      if (onSaved) {
        await onSaved();
      }
      onClose();
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
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px" }}
      >
        <h3 style={{ marginTop: 0 }}>
          {t("chat.saveMessageAsPresetTitle") ||
            t("presets.newTitle") ||
            "Save as preset"}
        </h3>
        <div className="input-group">
          <label htmlFor="save-preset-title">
            {t("presets.titleLabel")}
          </label>
          <input
            id="save-preset-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="save-preset-description">
            {t("presets.descriptionLabel")}
          </label>
          <textarea
            id="save-preset-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="save-preset-content">
            {t("presets.contentLabel")}
          </label>
          <textarea
            id="save-preset-content"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ fontFamily: "monospace" }}
          />
        </div>
        <div className="input-group">
          <label htmlFor="save-preset-role">
            {t("promptBuilder.stackAttachRoleLabel")}
          </label>
          <select
            id="save-preset-role"
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
          className="input-group"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <input
            id="save-preset-attach"
            type="checkbox"
            disabled={!characterId}
            checked={attachToCharacter && Boolean(characterId)}
            onChange={(e) =>
              setAttachToCharacter(
                Boolean(characterId) && e.target.checked,
              )
            }
          />
          <label htmlFor="save-preset-attach">
            {t("chat.saveMessageAttachToCharacterLabel") ||
              "Attach to this character"}
          </label>
        </div>

        {error && (
          <div
            className="badge badge-error"
            style={{ marginTop: "0.5rem" }}
          >
            {t("common.errorPrefix")} {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "1rem",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </button>
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
      </div>
    </div>
  );
}

