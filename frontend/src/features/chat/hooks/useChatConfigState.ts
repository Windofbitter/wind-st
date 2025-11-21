import { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import type { Chat, ChatLLMConfig, PromptPreview } from "../../../api/chats";
import {
  getChatConfig,
  getPromptPreview,
  updateChatConfig,
} from "../../../api/chats";
import type { ChatHistoryConfig } from "../../../api/historyConfig";
import {
  getChatHistoryConfig,
  updateChatHistoryConfig,
} from "../../../api/historyConfig";
import type { LLMConnection } from "../../../api/llmConnections";
import {
  listLLMConnections,
  listLLMModels,
} from "../../../api/llmConnections";
import type { PromptPreset } from "../../../api/promptStack";
import { getPromptStack } from "../../../api/promptStack";
import { ApiError } from "../../../api/httpClient";
import type { LoadState } from "./stateTypes";

interface Params {
  t: TFunction;
  selectedCharacterId: string | null;
  activeChat: Chat | null;
}

export interface ChatConfigState {
  llmConnections: LLMConnection[];
  llmState: LoadState;
  modelOptions: string[];
  modelOptionsState: LoadState;
  chatConfig: ChatLLMConfig | null;
  chatConfigState: LoadState;
  savingChatConfig: boolean;
  chatHistoryConfig: ChatHistoryConfig | null;
  chatHistoryState: LoadState;
  promptStack: PromptPreset[];
  promptStackState: LoadState;
  promptPreview: PromptPreview | null;
  promptPreviewState: LoadState;
  enabledConnections: LLMConnection[];
  selectedConnection: LLMConnection | null;
  fetchModelsForConnection: () => Promise<void>;
  handleChatConfigChange: (patch: Partial<ChatLLMConfig>) => Promise<void>;
  handleHistoryConfigChange: (
    patch: Partial<ChatHistoryConfig>,
  ) => Promise<void>;
  handleSaveChatConfig: () => Promise<void>;
  loadPromptPreview: (chatId: string) => Promise<void>;
}

export function useChatConfigState({
  t,
  selectedCharacterId,
  activeChat,
}: Params): ChatConfigState {
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

  useEffect(() => {
    void loadLlmConnections();
  }, []);

  useEffect(() => {
    if (!selectedCharacterId) return;
    void loadPromptStack(selectedCharacterId);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!activeChat) {
      setChatConfig(null);
      setChatHistoryConfig(null);
      setPromptPreview(null);
      setPromptPreviewState({ loading: false, error: null });
      return;
    }

    void loadChatConfig(activeChat.id);
    void loadChatHistoryConfig(activeChat.id);
    void loadPromptPreview(activeChat.id);
  }, [activeChat?.id]);

  useEffect(() => {
    setModelOptions([]);
    setModelOptionsState({ loading: false, error: null });
  }, [chatConfig?.llmConnectionId]);

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

  const fetchModelsForConnection = useCallback(async () => {
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
  }, [chatConfig?.llmConnectionId]);

  const loadPromptPreview = useCallback(
    async (chatId: string) => {
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
    },
    [],
  );

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
      setChatHistoryConfig({
        historyEnabled: cfg.historyEnabled,
        messageLimit: cfg.messageLimit,
        loreScanTokenLimit: cfg.loreScanTokenLimit,
      });
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

  async function handleChatConfigChange(
    patch: Partial<ChatLLMConfig>,
  ): Promise<void> {
    if (!chatConfig || !activeChat) return;
    const next = { ...chatConfig, ...patch };
    setChatConfig(next);
  }

  async function handleHistoryConfigChange(
    patch: Partial<ChatHistoryConfig>,
  ): Promise<void> {
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
        maxToolIterations: chatConfig.maxToolIterations,
        toolCallTimeoutMs: chatConfig.toolCallTimeoutMs,
      };
      const updated = await updateChatConfig(activeChat.id, payload);
      setChatConfig(updated);

      if (chatHistoryConfig) {
        const historyPayload = {
          historyEnabled: chatHistoryConfig.historyEnabled,
          messageLimit: chatHistoryConfig.messageLimit,
          loreScanTokenLimit: chatHistoryConfig.loreScanTokenLimit,
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
    enabledConnections,
    selectedConnection,
    fetchModelsForConnection,
    handleChatConfigChange,
    handleHistoryConfigChange,
    handleSaveChatConfig,
    loadPromptPreview,
  };
}
