import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Character } from "../../api/characters";
import { listCharacters } from "../../api/characters";
import type { Chat, ChatLLMConfig, PromptPreview } from "../../api/chats";
import {
  createChat,
  createTurn,
  deleteChat,
  getChatConfig,
  getPromptPreview,
  listChats,
  updateChatConfig,
} from "../../api/chats";
import type { ChatHistoryConfig } from "../../api/historyConfig";
import {
  getChatHistoryConfig,
  updateChatHistoryConfig,
} from "../../api/historyConfig";
import type { Message } from "../../api/messages";
import { listMessages } from "../../api/messages";
import type { LLMConnection } from "../../api/llmConnections";
import { listLLMConnections } from "../../api/llmConnections";
import type { PromptPreset } from "../../api/promptStack";
import { getPromptStack } from "../../api/promptStack";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

export function ChatPage() {
  const { t } = useTranslation();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersState, setCharactersState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [selectedCharacterId, setSelectedCharacterId] = useState<
    string | null
  >(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsState, setChatsState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesState, setMessagesState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [llmConnections, setLlmConnections] = useState<LLMConnection[]>([]);
  const [llmState, setLlmState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [chatConfig, setChatConfig] = useState<ChatLLMConfig | null>(
    null,
  );
  const [chatConfigState, setChatConfigState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [savingChatConfig, setSavingChatConfig] = useState(false);

  const [chatHistoryConfig, setChatHistoryConfig] =
    useState<ChatHistoryConfig | null>(null);
  const [chatHistoryState, setChatHistoryState] =
    useState<LoadState>({
      loading: false,
      error: null,
    });

  const [promptStack, setPromptStack] = useState<PromptPreset[]>([]);
  const [promptStackState, setPromptStackState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [promptPreview, setPromptPreview] =
    useState<PromptPreview | null>(null);
  const [promptPreviewState, setPromptPreviewState] =
    useState<LoadState>({
      loading: false,
      error: null,
    });

  const [globalError, setGlobalError] = useState<string | null>(null);

  const selectedCharacter = useMemo(
    () =>
      characters.find((c) => c.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  const activeChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  useEffect(() => {
    void loadCharacters();
    void loadLlmConnections();
  }, []);

  useEffect(() => {
    if (!selectedCharacterId) return;
    void loadChats(selectedCharacterId);
    void loadPromptStack(selectedCharacterId);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setChatConfig(null);
      setChatHistoryConfig(null);
      setPromptPreview(null);
      setPromptPreviewState({ loading: false, error: null });
      return;
    }
    void loadMessages(selectedChatId);
    void loadChatConfig(selectedChatId);
    void loadChatHistoryConfig(selectedChatId);
    void loadPromptPreview(selectedChatId);
  }, [selectedChatId]);

  async function loadCharacters() {
    setCharactersState({ loading: true, error: null });
    try {
      const data = await listCharacters();
      setCharacters(data);
      if (!selectedCharacterId && data.length > 0) {
        setSelectedCharacterId(data[0].id);
      }
    } catch (err) {
      setCharactersState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load characters",
      });
      return;
    }
    setCharactersState({ loading: false, error: null });
  }

  async function loadChats(characterId: string) {
    setChatsState({ loading: true, error: null });
    try {
      const data = await listChats({ characterId });
      setChats(data);
      if (!selectedChatId && data.length > 0) {
        setSelectedChatId(data[0].id);
      } else if (
        selectedChatId &&
        !data.some((c) => c.id === selectedChatId)
      ) {
        setSelectedChatId(data[0]?.id ?? null);
      }
    } catch (err) {
      setChatsState({
        loading: false,
        error:
          err instanceof ApiError ? err.message : "Failed to load chats",
      });
      return;
    }
    setChatsState({ loading: false, error: null });
  }

  async function loadMessages(chatId: string) {
    setMessagesState({ loading: true, error: null });
    try {
      const data = await listMessages(chatId, { limit: 100 });
      setMessages(data);
    } catch (err) {
      setMessagesState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load messages",
      });
      return;
    }
    setMessagesState({ loading: false, error: null });
  }

  async function loadLlmConnections() {
    setLlmState({ loading: true, error: null });
    try {
      const data = await listLLMConnections();
      setLlmConnections(data);
    } catch (err) {
      setLlmState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load LLM connections",
      });
      return;
    }
    setLlmState({ loading: false, error: null });
  }

  async function loadChatConfig(chatId: string) {
    setChatConfigState({ loading: true, error: null });
    try {
      const cfg = await getChatConfig(chatId);
      setChatConfig(cfg);
    } catch (err) {
      setChatConfigState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load chat config",
      });
      return;
    }
    setChatConfigState({ loading: false, error: null });
  }

  async function loadChatHistoryConfig(chatId: string) {
    setChatHistoryState({ loading: true, error: null });
    try {
      const cfg = await getChatHistoryConfig(chatId);
      setChatHistoryConfig(cfg);
    } catch (err) {
      setChatHistoryState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load history config",
      });
      return;
    }
    setChatHistoryState({ loading: false, error: null });
  }

  async function loadPromptStack(characterId: string) {
    setPromptStackState({ loading: true, error: null });
    try {
      const stack = await getPromptStack(characterId);
      setPromptStack(stack);
    } catch (err) {
      setPromptStackState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load prompt stack",
      });
      return;
    }
    setPromptStackState({ loading: false, error: null });
  }

  async function loadPromptPreview(chatId: string) {
    setPromptPreviewState({ loading: true, error: null });
    try {
      const data = await getPromptPreview(chatId);
      setPromptPreview(data);
    } catch (err) {
      setPromptPreviewState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load prompt preview",
      });
      return;
    }
    setPromptPreviewState({ loading: false, error: null });
  }

  async function handleCreateChat() {
    if (!selectedCharacterId) return;
    const title = window.prompt(
      t("chat.createChatPromptTitle"),
      t("chat.createChatPromptDefault"),
    );
    if (!title || title.trim() === "") return;

    setGlobalError(null);
    try {
      const { chat } = await createChat({
        characterId: selectedCharacterId,
        title: title.trim(),
      });
      await loadChats(selectedCharacterId);
      setSelectedChatId(chat.id);
    } catch (err) {
      setGlobalError(
        err instanceof ApiError ? err.message : "Failed to create chat",
      );
    }
  }

  async function handleDeleteChat(chatId: string) {
    if (!selectedCharacterId) return;
    const confirmed = window.confirm(
      t("chat.deleteChatConfirm"),
    );
    if (!confirmed) return;

    setGlobalError(null);
    try {
      await deleteChat(chatId);
      await loadChats(selectedCharacterId);
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setMessages([]);
      }
    } catch (err) {
      setGlobalError(
        err instanceof ApiError ? err.message : "Failed to delete chat",
      );
    }
  }

  async function handleSendMessage() {
    if (!activeChat) return;
    const content = composerText.trim();
    if (!content) return;

    setIsSending(true);
    setGlobalError(null);
    try {
      await createTurn(activeChat.id, { content });
      setComposerText("");
      await loadMessages(activeChat.id);
      await loadPromptPreview(activeChat.id);
    } catch (err) {
      setGlobalError(
        err instanceof ApiError ? err.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleChatConfigChange(
    patch: Partial<ChatLLMConfig>,
  ) {
    if (!chatConfig || !activeChat) return;
    const next = { ...chatConfig, ...patch };
    setChatConfig(next);
  }

  async function handleHistoryConfigChange(
    patch: Partial<ChatHistoryConfig>,
  ) {
    if (!chatHistoryConfig || !activeChat) return;
    const next = { ...chatHistoryConfig, ...patch };
    setChatHistoryConfig(next);
  }

  async function handleSaveChatConfig() {
    if (!chatConfig || !activeChat) return;

    setSavingChatConfig(true);
    setChatConfigState((s) => ({ ...s, error: null }));
    try {
      const payload = {
        llmConnectionId: chatConfig.llmConnectionId,
        model: chatConfig.model,
        temperature: chatConfig.temperature,
        maxOutputTokens: chatConfig.maxOutputTokens,
      };
      const updated = await updateChatConfig(activeChat.id, payload);
      setChatConfig(updated);

      if (chatHistoryConfig) {
        const historyPayload = {
          historyEnabled: chatHistoryConfig.historyEnabled,
          messageLimit: chatHistoryConfig.messageLimit,
        };
        const updatedHistory = await updateChatHistoryConfig(
          activeChat.id,
          historyPayload,
        );
        setChatHistoryConfig(updatedHistory);
      }
      await loadPromptPreview(activeChat.id);
    } catch (err) {
      setChatConfigState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to save chat config",
      }));
    } finally {
      setSavingChatConfig(false);
    }
  }

  return (
    <div className="chat-layout">
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
                setSelectedCharacterId(
                  e.target.value || null,
                )
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
              onClick={handleCreateChat}
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
              <button
                key={chat.id}
                type="button"
                onClick={() => setSelectedChatId(chat.id)}
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
                    void handleDeleteChat(chat.id);
                  }}
                >
                  ×
                </button>
              </button>
            ))}
            {chatsState.loading && (
              <div>{t("chat.chatsLoading")}</div>
            )}
          </div>
        </div>
      </section>

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
              <div className="badge">
                {t("common.errorPrefix")} {messagesState.error}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.role}`}
              >
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
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
            />
            <button
              className="btn btn-primary"
              type="button"
              disabled={!activeChat || isSending || !composerText.trim()}
              onClick={() => void handleSendMessage()}
            >
              {isSending
                ? t("chat.sendButtonSending")
                : t("chat.sendButton")}
            </button>
          </div>
        </div>
        {globalError && (
          <div className="card">
            <div className="badge">
              {t("common.errorPrefix")} {globalError}
            </div>
          </div>
        )}
      </section>

      <aside className="chat-right-sidebar">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {t("chat.llmConfigTitle")}
          </h3>
          {chatConfigState.error && (
            <div className="badge">
              {t("common.errorPrefix")} {chatConfigState.error}
            </div>
          )}
          {chatHistoryState.error && (
            <div className="badge">
              {t("common.errorPrefix")} {chatHistoryState.error}
            </div>
          )}
          {llmState.error && (
            <div className="badge">
              {t("common.errorLoadingConnections")}{" "}
              {llmState.error}
            </div>
          )}
          {!activeChat && (
            <div>{t("chat.selectChatToConfigure")}</div>
          )}
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
                    void handleChatConfigChange({
                      llmConnectionId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    {t("chat.llmConnectionPlaceholder")}
                  </option>
                  {llmConnections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="model-input">
                  {t("chat.modelLabel")}
                </label>
                <input
                  id="model-input"
                  type="text"
                  value={chatConfig.model}
                  onChange={(e) =>
                    void handleChatConfigChange({
                      model: e.target.value,
                    })
                  }
                />
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
                    void handleChatConfigChange({
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
                    void handleChatConfigChange({
                      maxOutputTokens: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="input-group">
                <label htmlFor="history-enabled">
                  {t("chat.historyEnabledLabel")}
                </label>
                <input
                  id="history-enabled"
                  type="checkbox"
                  checked={chatHistoryConfig.historyEnabled}
                  onChange={(e) =>
                    void handleHistoryConfigChange({
                      historyEnabled: e.target.checked,
                    })
                  }
                />
              </div>
              <div className="input-group">
                <label htmlFor="history-limit">
                  {t("chat.historyMessageLimitLabel")}
                </label>
                <input
                  id="history-limit"
                  type="number"
                  min="1"
                  value={chatHistoryConfig.messageLimit}
                  onChange={(e) =>
                    void handleHistoryConfigChange({
                      messageLimit: Number(e.target.value),
                    })
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={savingChatConfig}
                onClick={() => void handleSaveChatConfig()}
              >
                {savingChatConfig
                  ? t("chat.saveConfigButtonSaving")
                  : t("chat.saveConfigButton")}
              </button>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {t("chat.promptStackTitle")}
          </h3>
          {promptStackState.error && (
            <div className="badge">
              Error: {promptStackState.error}
            </div>
          )}
          {!selectedCharacter && (
            <div>
              {t("chat.promptStackSelectCharacter")}
            </div>
          )}
          {selectedCharacter && promptStackState.loading && (
            <div>{t("chat.promptStackLoading")}</div>
          )}
          {selectedCharacter && !promptStackState.loading && (
            <>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>{t("chat.personaTitle")}</strong>
                <div
                  style={{
                    fontSize: "0.85rem",
                    maxHeight: "6rem",
                    overflowY: "auto",
                    marginTop: "0.25rem",
                  }}
                >
                  {selectedCharacter.persona || (
                    <span style={{ opacity: 0.7 }}>
                      {t("chat.personaEmpty")}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <strong>{t("chat.stackTitle")}</strong>
                {promptStack.length === 0 && (
                  <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                    {t("chat.stackEmpty")}
                  </div>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {promptStack
                    .slice()
                    .sort(
                      (a, b) => a.sortOrder - b.sortOrder,
                    )
                    .map((pp) => (
                      <li
                        key={pp.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.85rem",
                          padding: "0.25rem 0",
                          borderBottom:
                            "1px solid var(--border-color)",
                        }}
                      >
                        <span>{pp.presetId}</span>
                        <span className="badge">
                          {pp.role.toUpperCase()}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {t("chat.promptPreviewTitle")}
          </h3>
          {!activeChat && (
            <div>
              {t("chat.promptPreviewNoChat")}
            </div>
          )}
          {activeChat && promptPreviewState.loading && (
            <div>{t("chat.promptPreviewLoading")}</div>
          )}
          {activeChat && promptPreviewState.error && (
            <div className="badge">
              {t("common.errorPrefix")}{" "}
              {promptPreviewState.error}
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
                  <strong>
                    {t("chat.promptPreviewMessagesLabel")}
                  </strong>
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
                  style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}
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
                    <div key={tool.serverId}>
                      - {tool.serverName}
                    </div>
                  ))}
              </div>
            )}
        </div>
      </aside>
    </div>
  );
}
