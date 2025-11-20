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
  updateChatTitle,
  updateChatConfig,
} from "../../api/chats";
import type { ChatHistoryConfig } from "../../api/historyConfig";
import {
  getChatHistoryConfig,
  updateChatHistoryConfig,
} from "../../api/historyConfig";
import type { Message } from "../../api/messages";
import {
  deleteMessage as deleteMessageApi,
  listMessages,
  retryMessage as retryMessageApi,
} from "../../api/messages";
import type { LLMConnection } from "../../api/llmConnections";
import { listLLMConnections, listLLMModels } from "../../api/llmConnections";
import type { PromptPreset } from "../../api/promptStack";
import { getPromptStack } from "../../api/promptStack";
import { ApiError } from "../../api/httpClient";
import { connectToChatEvents } from "../../api/chatEvents";
import type { ChatRun } from "../../api/runs";
import { listChatRuns } from "../../api/runs";

export interface LoadState {
  loading: boolean;
  error: string | null;
}

function upsertMessage(
  messages: Message[],
  next: Message,
): Message[] {
  const existingIndex = messages.findIndex((m) => m.id === next.id);
  if (existingIndex === -1) {
    return [...messages, next];
  }

  const updated = [...messages];
  updated[existingIndex] = next;
  return updated;
}

function upsertRun(runs: ChatRun[], next: ChatRun): ChatRun[] {
  const existingIndex = runs.findIndex((r) => r.id === next.id);
  if (existingIndex === -1) {
    return [...runs, next];
  }

  const updated = [...runs];
  updated[existingIndex] = next;
  return updated;
}

export function useChatController() {
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

  const [runs, setRuns] = useState<ChatRun[]>([]);
  const [runsState, setRunsState] = useState<LoadState>({
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
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelOptionsState, setModelOptionsState] = useState<LoadState>({
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

  const enabledConnections = useMemo(
    () => llmConnections.filter((c) => c.isEnabled),
    [llmConnections],
  );

  const selectedConnection = useMemo(
    () =>
      chatConfig
        ? llmConnections.find(
            (c) => c.id === chatConfig.llmConnectionId,
          ) ?? null
        : null,
    [chatConfig, llmConnections],
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
      setRuns([]);
      setChatConfig(null);
      setChatHistoryConfig(null);
      setPromptPreview(null);
      setPromptPreviewState({ loading: false, error: null });
      setMessagesState({ loading: false, error: null });
      setRunsState({ loading: false, error: null });
      return;
    }
    void loadMessages(selectedChatId);
    void loadRuns(selectedChatId);
    void loadChatConfig(selectedChatId);
    void loadChatHistoryConfig(selectedChatId);
    void loadPromptPreview(selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    setModelOptions([]);
    setModelOptionsState({ loading: false, error: null });
  }, [chatConfig?.llmConnectionId]);

  useEffect(() => {
    if (!selectedChatId) return;

    const disconnect = connectToChatEvents(selectedChatId, {
      onEvent: (event) => {
        if (event.type === "message") {
          setMessages((prev) => upsertMessage(prev, event.message));
        } else if (event.type === "run") {
          setRuns((prev) => upsertRun(prev, event.run));
          if (
            event.run.status === "running" ||
            event.run.status === "pending"
          ) {
            setIsSending(true);
          }
          if (
            event.run.status === "completed" ||
            event.run.status === "failed" ||
            event.run.status === "canceled"
          ) {
            setIsSending(false);
            if (event.run.status === "failed" && event.run.error) {
              setGlobalError(event.run.error);
            }
          }
        }
      },
      onError: (message) => {
        setMessagesState((state) => ({
          ...state,
          error: state.error ?? message,
        }));
      },
      onOpen: () => {
        setMessagesState((state) => ({ ...state, error: null }));
      },
    });

    return () => {
      disconnect();
    };
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

  async function loadRuns(chatId: string) {
    setRunsState({ loading: true, error: null });
    try {
      const data = await listChatRuns(chatId);
      setRuns(data);
    } catch (err) {
      setRunsState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load runs",
      });
      return;
    }
    setRunsState({ loading: false, error: null });
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

  async function fetchModelsForConnection() {
    if (!chatConfig?.llmConnectionId) return;
    setModelOptionsState({ loading: true, error: null });
    try {
      const models = await listLLMModels(chatConfig.llmConnectionId);
      setModelOptions(models);
    } catch (err) {
      setModelOptions([]);
      setModelOptionsState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to fetch models",
      });
      return;
    }
    setModelOptionsState({ loading: false, error: null });
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

  async function handleRenameChat(
    chatId: string,
    title: string,
  ): Promise<{ ok: boolean; error?: string }> {
    setChatsState((s) => ({ ...s, error: null }));
    try {
      const updated = await updateChatTitle(chatId, title);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: updated.title } : chat,
        ),
      );
      if (selectedChatId === chatId) {
        setSelectedChatId(chatId);
      }
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to rename chat";
      setChatsState((s) => ({
        ...s,
        error: message,
      }));
      return { ok: false, error: message };
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

  async function handleRetryMessage(messageId: string) {
    if (!activeChat) return;

    setIsSending(true);
    setGlobalError(null);
    try {
      await retryMessageApi(activeChat.id, messageId);
      await loadMessages(activeChat.id);
      await loadRuns(activeChat.id);
      await loadPromptPreview(activeChat.id);
    } catch (err) {
      setGlobalError(
        err instanceof ApiError
          ? err.message
          : "Failed to retry message",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeChat) return;

    setGlobalError(null);
    try {
      await deleteMessageApi(activeChat.id, messageId);
      await loadMessages(activeChat.id);
      await loadRuns(activeChat.id);
      await loadPromptPreview(activeChat.id);
    } catch (err) {
      setGlobalError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete message",
      );
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

    const selectedConn = llmConnections.find(
      (c) => c.id === chatConfig.llmConnectionId,
    );
    if (selectedConn && !selectedConn.isEnabled) {
      setChatConfigState((s) => ({
        ...s,
        error: t("chat.connectionDisabledError"),
      }));
      return;
    }

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

  return {
    characters,
    charactersState,
    selectedCharacterId,
    setSelectedCharacterId,
    chats,
    chatsState,
    selectedChatId,
    setSelectedChatId,
    handleRenameChat,
    messages,
    messagesState,
    runs,
    runsState,
    composerText,
    setComposerText,
    isSending,
    llmConnections,
    llmState,
    modelOptions,
    modelOptionsState,
    chatConfig,
    chatConfigState,
    savingChatConfig,
    chatHistoryConfig,
    chatHistoryState,
    promptStack,
    promptStackState,
    promptPreview,
    promptPreviewState,
    globalError,
    selectedCharacter,
    activeChat,
    enabledConnections,
    selectedConnection,
    handleCreateChat,
    handleDeleteChat,
    handleSendMessage,
    handleRetryMessage,
    handleDeleteMessage,
    handleChatConfigChange,
    handleHistoryConfigChange,
    handleSaveChatConfig,
    fetchModelsForConnection,
  };
}
