import { useEffect, useState } from "react";
import type { Chat } from "../../../api/chats";
import { useTranslation } from "react-i18next";

interface Props {
  chat: Chat | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (chatId: string, title: string) => Promise<{ ok: boolean; error?: string }>;
}

export function RenameChatModal({
  chat,
  isOpen,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && chat) {
      setTitle(chat.title);
      setError(null);
    }
  }, [isOpen, chat]);

  if (!chat || !isOpen) return null;
  const activeChat: Chat = chat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = title.trim();
    if (!next || next === activeChat.title) {
      setError(t("chat.renameValidation") ?? "Title required");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(activeChat.id, next);
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error ?? t("common.errorPrefix"));
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3 style={{ marginTop: 0 }}>
          {t("chat.renameChatTitle")}
        </h3>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          {t("chat.renameChatDescription", { name: activeChat.title })}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="chat-rename-input">
              {t("chat.renameChatLabel")}
            </label>
            <input
              id="chat-rename-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          {error && (
            <div className="badge badge-error" style={{ marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={saving}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? t("common.saving") ?? t("common.save") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
