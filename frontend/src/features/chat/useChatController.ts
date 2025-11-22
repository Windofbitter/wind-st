import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCharacterChatState } from "./hooks/useCharacterChatState";
import { useChatConfigState } from "./hooks/useChatConfigState";
import { useConversationState } from "./hooks/useConversationState";
import type { LoadState } from "./hooks/stateTypes";

export type { LoadState };

export function useChatController() {
  const { t } = useTranslation();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const characterChat = useCharacterChatState({ t, setGlobalError });
  const config = useChatConfigState({
    t,
    selectedCharacterId: characterChat.selectedCharacterId,
    activeChat: characterChat.activeChat,
  });
  const conversation = useConversationState({
    activeChat: characterChat.activeChat,
    onPromptRefresh: config.loadPromptPreview,
    setGlobalError,
  });

  return {
    ...characterChat,
    ...config,
    ...conversation,
    globalError,
  };
}
