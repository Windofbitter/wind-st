import { useTranslation } from "react-i18next";
import type { Chat } from "../../../api/chats";
import type { Character } from "../../../api/characters";
import type { Message } from "../../../api/messages";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  activeChat: Chat | null;
  selectedCharacter: Character | null;
  messages: Message[];
  messagesState: LoadState;
  composerText: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  globalError: string | null;
}

export function ChatMain({
  activeChat,
  selectedCharacter,
  messages,
  messagesState,
  composerText,
  onComposerChange,
  onSend,
  isSending,
  globalError,
}: Props) {
  const { t } = useTranslation();

  return (
    <section className="chat-main">
      <div
        className="card"
        style={{
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <div className="flex-row">
          <div>
            <div style={{ fontWeight: 600 }}>
              {selectedCharacter?.name ??
                t("chat.noCharacterSelected")}
            </div>
            {activeChat && (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                {activeChat.title}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="message-list">
          {messagesState.loading && (
            <div>{t("chat.messagesLoading")}</div>
          )}
          {messagesState.error && (
            <div className="badge badge-error">
              {t("common.errorPrefix")} {messagesState.error}
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.7,
                  marginBottom: "0.25rem",
                }}
              >
                {msg.role.toUpperCase()}
              </div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>
        <div className="composer">
          <textarea
            placeholder={
              activeChat
                ? t("chat.composerPlaceholderActive")
                : t("chat.composerPlaceholderInactive")
            }
            value={composerText}
            disabled={!activeChat || isSending}
            onChange={(e) => onComposerChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            className="btn btn-primary"
            type="button"
            disabled={!activeChat || isSending || !composerText.trim()}
            onClick={onSend}
          >
            {isSending
              ? t("chat.sendButtonSending")
              : t("chat.sendButton")}
          </button>
        </div>
      </div>
      {globalError && (
        <div className="card">
          <div className="badge badge-error">
            {t("common.errorPrefix")} {globalError}
          </div>
        </div>
      )}
    </section>
  );
}
