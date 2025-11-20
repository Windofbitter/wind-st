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
}: Props) {
  const { t } = useTranslation();

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
          <div className="badge">
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
          <div className="badge">
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
              <span>{chat.title}</span>
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
