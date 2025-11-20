import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Character } from "../../../api/characters";
import type { Chat } from "../../../api/chats";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  characters: Character[];
  charactersState: LoadState;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  chats: Chat[];
  chatsState: LoadState;
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
}

export function ChatSidebar({
  characters,
  charactersState,
  selectedCharacterId,
  onSelectCharacter,
  chats,
  chatsState,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onRenameChat,
}: Props) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  function startEditing(chat: Chat) {
    setEditingId(chat.id);
    setDraftTitle(chat.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftTitle("");
  }

  function submitRename(chatId: string) {
    const next = draftTitle.trim();
    if (!next) return;
    onRenameChat(chatId, next);
    cancelEditing();
  }

  return (
    <section className="chat-sidebar">
      <div className="card">
        <div className="input-group">
          <label htmlFor="character-select">
            {t("chat.characterLabel")}
          </label>
          <select
            id="character-select"
            value={selectedCharacterId ?? ""}
            onChange={(e) =>
              onSelectCharacter(e.target.value || null)
            }
          >
            <option value="">
              {t("chat.characterPlaceholder")}
            </option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {charactersState.error && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {charactersState.error}
          </div>
        )}
      </div>

      <div className="card" style={{ flex: 1, overflowY: "auto" }}>
        <div className="flex-row" style={{ marginBottom: "0.5rem" }}>
          <strong>{t("chat.chatsTitle")}</strong>
          <button
            className="btn btn-primary"
            onClick={onCreateChat}
            disabled={!selectedCharacterId}
          >
            {t("chat.chatsNew")}
          </button>
        </div>
        {chatsState.error && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {chatsState.error}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectChat(chat.id);
                }
              }}
              role="button"
              tabIndex={0}
              className="nav-link"
              style={{
                justifyContent: "space-between",
                display: "flex",
                backgroundColor:
                  chat.id === selectedChatId
                    ? "var(--border-color)"
                    : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flex: 1 }}>
                {editingId === chat.id ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitRename(chat.id);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEditing();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <span>{chat.title}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {editingId === chat.id ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: "0.1rem 0.4rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        submitRename(chat.id);
                      }}
                    >
                      {t("common.save")}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "0.1rem 0.4rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEditing();
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "0.1rem 0.4rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(chat);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: "0.1rem 0.4rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {chatsState.loading && (
            <div>{t("chat.chatsLoading")}</div>
          )}
        </div>
      </div>
    </section>
  );
}
