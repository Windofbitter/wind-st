import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { TFunction } from "i18next";
import type { Character } from "../../../api/characters";
import { listCharacters } from "../../../api/characters";
import type { Chat } from "../../../api/chats";
import { createChat, deleteChat, listChats, updateChatTitle } from "../../../api/chats";
import { ApiError } from "../../../api/httpClient";
import type { LoadState } from "./stateTypes";

interface Params {
  t: TFunction;
  setGlobalError: Dispatch<SetStateAction<string | null>>;
}

export interface CharacterChatState {
  characters: Character[];
  charactersState: LoadState;
  selectedCharacterId: string | null;
  setSelectedCharacterId: Dispatch<SetStateAction<string | null>>;
  chats: Chat[];
  chatsState: LoadState;
  selectedChatId: string | null;
  setSelectedChatId: Dispatch<SetStateAction<string | null>>;
  selectedCharacter: Character | null;
  activeChat: Chat | null;
  handleCreateChat: () => Promise<void>;
  handleDeleteChat: (chatId: string) => Promise<void>;
  handleRenameChat: (
    chatId: string,
    title: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function useCharacterChatState({
  t,
  setGlobalError,
}: Params): CharacterChatState {
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

  useEffect(() => {
    void loadCharacters();
  }, []);

  useEffect(() => {
    if (!selectedCharacterId) return;
    void loadChats(selectedCharacterId);
  }, [selectedCharacterId]);

  const selectedCharacter = useMemo(
    () =>
      characters.find((c) => c.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  const activeChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

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

  return {
    characters,
    charactersState,
    selectedCharacterId,
    setSelectedCharacterId,
    chats,
    chatsState,
    selectedChatId,
    setSelectedChatId,
    selectedCharacter,
    activeChat,
    handleCreateChat,
    handleDeleteChat,
    handleRenameChat,
  };
}
