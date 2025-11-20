import { useTranslation } from "react-i18next";
import type { Chat } from "../../../api/chats";
import type { Character } from "../../../api/characters";
import type { Message } from "../../../api/messages";
import type { ChatRun } from "../../../api/runs";
import { MessageList } from "./MessageList";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  activeChat: Chat | null;
  selectedCharacter: Character | null;
  messages: Message[];
  messagesState: LoadState;
  runs: ChatRun[];
  composerText: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  onRetryMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  isSending: boolean;
  globalError: string | null;
}

export function ChatMain({
  activeChat,
  selectedCharacter,
  messages,
  messagesState,
  runs,
  composerText,
  onComposerChange,
  onSend,
  onRetryMessage,
  onDeleteMessage,
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
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div className="message-list">
          {messagesState.loading && (
            <div>{t("chat.messagesLoading")}</div>
          )}
          {messagesState.error && (
            <div className="badge badge-error">
              {t("common.errorPrefix")} {messagesState.error}
            </div>
          )}
          <MessageList
            messages={messages}
            characterName={selectedCharacter?.name ?? null}
            runs={runs}
            onRetryMessage={onRetryMessage}
            onDeleteMessage={onDeleteMessage}
          />
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
