import { useTranslation } from "react-i18next";
import type { Character } from "../../../api/characters";
import type { Chat } from "../../../api/chats";
import type { UserPersona } from "../../../api/userPersonas";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  characters: Character[];
  charactersState: LoadState;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  userPersonas: UserPersona[];
  userPersonasState: LoadState;
  selectedUserPersonaId: string | null;
  onSelectUserPersona: (id: string | null) => void;
  onCreateUserPersona: () => void;
  onEditUserPersona: () => void;
  chats: Chat[];
  chatsState: LoadState;
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  onStartRenameChat: (chat: Chat) => void;
}

export function ChatSidebar({
  characters,
  charactersState,
  selectedCharacterId,
  onSelectCharacter,
  userPersonas,
  userPersonasState,
  selectedUserPersonaId,
  onSelectUserPersona,
  onCreateUserPersona,
  onEditUserPersona,
  chats,
  chatsState,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onStartRenameChat,
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
          <div className="badge badge-error">
            {t("common.errorPrefix")} {charactersState.error}
          </div>
        )}
        <div className="input-group" style={{ marginTop: "0.75rem" }}>
          <label htmlFor="user-persona-select">
            {t("chat.userPersonaLabel")}
          </label>
          <select
            id="user-persona-select"
            value={selectedUserPersonaId ?? ""}
            onChange={(e) =>
              onSelectUserPersona(e.target.value || null)
            }
          >
            <option value="">
              {t("chat.userPersonaPlaceholder")}
            </option>
            {userPersonas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isDefault ? ` (${t("chat.userPersonaDefaultTag")})` : ""}
              </option>
            ))}
          </select>
          {userPersonasState.error && (
            <div className="badge badge-error">
              {t("common.errorPrefix")} {userPersonasState.error}
            </div>
          )}
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={onEditUserPersona}
              disabled={!selectedUserPersonaId}
            >
              {t("chat.userPersonaEditButton") ||
                t("common.edit")}
            </button>
            <button
              type="button"
              className="btn"
              onClick={onCreateUserPersona}
            >
              {t("chat.userPersonaCreateButton") ||
                t("common.add")}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflowY: "auto" }}>
        <div className="flex-row" style={{ marginBottom: "0.5rem" }}>
          <strong>{t("chat.chatsTitle")}</strong>
          <button
            className="btn btn-primary"
            onClick={onCreateChat}
            disabled={!selectedCharacterId || !selectedUserPersonaId}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {chat.title}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "0.1rem 0.4rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRenameChat(chat);
                  }}
                  aria-label={t("chat.renameChatButton")}
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
                  aria-label={t("chat.deleteChatButton")}
                >
                  ×
                </button>
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
