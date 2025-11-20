import { useTranslation } from "react-i18next";
import type { PromptPreview } from "../../../api/chats";
import type { Chat } from "../../../api/chats";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  activeChat: Chat | null;
  promptPreview: PromptPreview | null;
  promptPreviewState: LoadState;
}

export function PromptPreviewCard({
  activeChat,
  promptPreview,
  promptPreviewState,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("chat.promptPreviewTitle")}
      </h3>
      {!activeChat && <div>{t("chat.promptPreviewNoChat")}</div>}
      {activeChat && promptPreviewState.loading && (
        <div>{t("chat.promptPreviewLoading")}</div>
      )}
      {activeChat && promptPreviewState.error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {promptPreviewState.error}
        </div>
      )}
      {activeChat &&
        !promptPreviewState.loading &&
        promptPreview && (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "0.8rem",
              maxHeight: "12rem",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ marginBottom: "0.25rem" }}>
              <strong>{t("chat.promptPreviewMessagesLabel")}</strong>
            </div>
            {promptPreview.messages.length === 0 && (
              <div style={{ opacity: 0.7 }}>
                {t("chat.promptPreviewNoMessages")}
              </div>
            )}
            {promptPreview.messages.length > 0 &&
              promptPreview.messages.map((m, idx) => (
                <div key={idx}>
                  [{m.role.toUpperCase()}] {m.content}
                </div>
              ))}

            <div
              style={{
                marginTop: "0.5rem",
                marginBottom: "0.25rem",
              }}
            >
              <strong>
                {t("chat.promptPreviewToolsLabel")}
              </strong>
            </div>
            {promptPreview.tools.length === 0 && (
              <div style={{ opacity: 0.7 }}>
                {t("chat.promptPreviewNoTools")}
              </div>
            )}
            {promptPreview.tools.length > 0 &&
              promptPreview.tools.map((tool) => (
                <div key={tool.serverId}>- {tool.serverName}</div>
              ))}
          </div>
        )}
    </div>
  );
}
