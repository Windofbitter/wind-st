import { useTranslation } from "react-i18next";
import type { Chat, ChatLLMConfig } from "../../../api/chats";
import type { ChatHistoryConfig } from "../../../api/historyConfig";
import type { LLMConnection } from "../../../api/llmConnections";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  activeChat: Chat | null;
  chatConfig: ChatLLMConfig | null;
  chatConfigState: LoadState;
  chatHistoryConfig: ChatHistoryConfig | null;
  chatHistoryState: LoadState;
  llmConnections: LLMConnection[];
  llmState: LoadState;
  modelOptions: string[];
  modelOptionsState: LoadState;
  onChatConfigChange: (patch: Partial<ChatLLMConfig>) => void;
  onHistoryConfigChange: (patch: Partial<ChatHistoryConfig>) => void;
  onSave: () => void;
  fetchModels: () => void;
  selectedConnection: LLMConnection | null;
  enabledConnections: LLMConnection[];
  savingChatConfig: boolean;
}

export function ChatConfigPanel({
  activeChat,
  chatConfig,
  chatConfigState,
  chatHistoryConfig,
  chatHistoryState,
  llmConnections,
  llmState,
  modelOptions,
  modelOptionsState,
  onChatConfigChange,
  onHistoryConfigChange,
  onSave,
  fetchModels,
  selectedConnection,
  enabledConnections,
  savingChatConfig,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("chat.llmConfigTitle")}
      </h3>
      {chatConfigState.error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {chatConfigState.error}
        </div>
      )}
      {chatHistoryState.error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {chatHistoryState.error}
        </div>
      )}
      {llmState.error && (
        <div className="badge badge-error">
          {t("common.errorLoadingConnections")} {llmState.error}
        </div>
      )}
      {!activeChat && <div>{t("chat.selectChatToConfigure")}</div>}
      {activeChat && !chatConfig && chatConfigState.loading && (
        <div>{t("common.loadingConfig")}</div>
      )}
      {activeChat && chatConfig && chatHistoryConfig && (
        <>
          <div className="input-group">
            <label htmlFor="llm-connection-select">
              {t("chat.llmConnectionLabel")}
            </label>
            <select
              id="llm-connection-select"
              value={chatConfig.llmConnectionId}
              onChange={(e) =>
                onChatConfigChange({
                  llmConnectionId: e.target.value,
                })
              }
            >
              <option value="">
                {t("chat.llmConnectionPlaceholder")}
              </option>
              {llmConnections.map((conn) => (
                <option
                  key={conn.id}
                  value={conn.id}
                  disabled={!conn.isEnabled}
                >
                  {conn.name}
                  {!conn.isEnabled ? " (disabled)" : ""}
                </option>
              ))}
            </select>
          </div>
          {selectedConnection && !selectedConnection.isEnabled && (
            <div className="badge badge-error">
              {t("chat.connectionDisabledError")}
            </div>
          )}
          {enabledConnections.length === 0 && (
            <div className="badge badge-error">
              {t("chat.noEnabledConnections")}
            </div>
          )}
          <div className="input-group">
            <label htmlFor="model-input">
              {t("chat.modelLabel")}
            </label>
            <input
              id="model-input"
              type="text"
              list="model-options"
              value={chatConfig.model}
              onChange={(e) =>
                onChatConfigChange({
                  model: e.target.value,
                })
              }
            />
            <datalist id="model-options">
              {modelOptions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <div style={{ marginTop: "0.25rem" }}>
              <button
                type="button"
                className="btn"
                disabled={
                  modelOptionsState.loading ||
                  !chatConfig.llmConnectionId
                }
                onClick={fetchModels}
              >
                {modelOptionsState.loading
                  ? t("chat.fetchModelsLoading")
                  : t("chat.fetchModelsButton")}
              </button>
            </div>
            {modelOptionsState.error && (
              <div
                className="badge badge-error"
                style={{ marginTop: "0.25rem" }}
              >
                {t("common.errorPrefix")} {modelOptionsState.error}
              </div>
            )}
            {!modelOptionsState.error &&
              modelOptions.length > 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.8,
                    marginTop: "0.25rem",
                  }}
                >
                  {t("chat.fetchModelsHint")}
                </div>
              )}
          </div>
          <div className="input-group">
            <label htmlFor="temperature-input">
              {t("chat.temperatureLabel")}
            </label>
            <input
              id="temperature-input"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={chatConfig.temperature}
              onChange={(e) =>
                onChatConfigChange({
                  temperature: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="max-tokens-input">
              {t("chat.maxTokensLabel")}
            </label>
            <input
              id="max-tokens-input"
              type="number"
              min="1"
              value={chatConfig.maxOutputTokens}
              onChange={(e) =>
                onChatConfigChange({
                  maxOutputTokens: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="max-tool-iterations">
              {t("chat.maxToolIterationsLabel")}
            </label>
            <input
              id="max-tool-iterations"
              type="number"
              min="0"
              max="20"
              value={chatConfig.maxToolIterations}
              onChange={(e) =>
                onChatConfigChange({
                  maxToolIterations: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="history-enabled">
              {t("chat.historyEnabledLabel")}
            </label>
            <select
              id="history-enabled"
              value={
                chatHistoryConfig.historyEnabled ? "true" : "false"
              }
              onChange={(e) =>
                onHistoryConfigChange({
                  historyEnabled: e.target.value === "true",
                })
              }
            >
              <option value="true">
                {t("chat.historyEnabledOptionOn")}
              </option>
              <option value="false">
                {t("chat.historyEnabledOptionOff")}
              </option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="history-limit">
              {t("chat.historyMessageLimitLabel")}
            </label>
            <input
              id="history-limit"
              type="number"
              min="1"
              disabled={!chatHistoryConfig.historyEnabled}
              value={chatHistoryConfig.messageLimit}
              onChange={(e) =>
                onHistoryConfigChange({
                  messageLimit: Number(e.target.value),
                })
              }
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={savingChatConfig}
            onClick={onSave}
          >
            {savingChatConfig
              ? t("chat.saveConfigButtonSaving")
              : t("chat.saveConfigButton")}
          </button>
        </>
      )}
    </div>
  );
}
