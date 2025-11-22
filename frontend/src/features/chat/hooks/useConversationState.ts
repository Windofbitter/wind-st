import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Chat } from "../../../api/chats";
import { createTurn } from "../../../api/chats";
import type { Message } from "../../../api/messages";
import {
  deleteMessage as deleteMessageApi,
  listMessages,
  retryMessage as retryMessageApi,
} from "../../../api/messages";
import type { ChatRun } from "../../../api/runs";
import { listChatRuns } from "../../../api/runs";
import { ApiError } from "../../../api/httpClient";
import { connectToChatEvents } from "../../../api/chatEvents";
import type { LoadState } from "./stateTypes";

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

interface Params {
  activeChat: Chat | null;
  onPromptRefresh: (chatId: string) => Promise<void>;
  setGlobalError: Dispatch<SetStateAction<string | null>>;
}

export interface ConversationState {
  messages: Message[];
  messagesState: LoadState;
  runs: ChatRun[];
  runsState: LoadState;
  composerText: string;
  setComposerText: Dispatch<SetStateAction<string>>;
  isSending: boolean;
  handleSendMessage: () => Promise<void>;
  handleRetryMessage: (messageId: string) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  loadRuns: (chatId: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
}

export function useConversationState({
  activeChat,
  onPromptRefresh,
  setGlobalError,
}: Params): ConversationState {
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

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      setRuns([]);
      setMessagesState({ loading: false, error: null });
      setRunsState({ loading: false, error: null });
      return;
    }
    void loadMessages(activeChat.id);
    void loadRuns(activeChat.id);
  }, [activeChat?.id]);

  useEffect(() => {
    if (!activeChat) return;

    const disconnect = connectToChatEvents(activeChat.id, {
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
  }, [activeChat?.id]);

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
      await onPromptRefresh(activeChat.id);
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

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx === -1) return prev;
      const keep = prev.slice(0, idx + 1);
      return keep;
    });
    setRuns((prev) => {
      const prunedIds = new Set<string>();
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        for (let i = idx + 1; i < messages.length; i += 1) {
          prunedIds.add(messages[i].id);
        }
      }
      return prev.filter(
        (r) =>
          !prunedIds.has(r.userMessageId) &&
          (!r.assistantMessageId || !prunedIds.has(r.assistantMessageId)),
      );
    });

    try {
      await retryMessageApi(activeChat.id, messageId);
      await loadMessages(activeChat.id);
      await loadRuns(activeChat.id);
      await onPromptRefresh(activeChat.id);
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
      await onPromptRefresh(activeChat.id);
    } catch (err) {
      setGlobalError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete message",
      );
    }
  }

  return {
    messages,
    messagesState,
    runs,
    runsState,
    composerText,
    setComposerText,
    isSending,
    handleSendMessage,
    handleRetryMessage,
    handleDeleteMessage,
    loadRuns,
    loadMessages,
  };
}
