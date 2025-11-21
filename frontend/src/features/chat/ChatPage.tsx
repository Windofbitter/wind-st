import { useState } from "react";
import type { Chat } from "../../api/chats";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatMain } from "./components/ChatMain";
import { ChatConfigPanel } from "./components/ChatConfigPanel";
import { PromptStackCard } from "./components/PromptStackCard";
import { PromptPreviewCard } from "./components/PromptPreviewCard";
import { RenameChatModal } from "./components/RenameChatModal";
import { useChatController } from "./useChatController";

export function ChatPage() {
  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const {
    characters,
    charactersState,
    selectedCharacterId,
    setSelectedCharacterId,
    userPersonas,
    userPersonasState,
    selectedUserPersonaId,
    setSelectedUserPersonaId,
    chats,
    chatsState,
    selectedChatId,
    setSelectedChatId,
    messages,
    messagesState,
    runs,
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
    handleRenameChat,
    handleSendMessage,
    handleRetryMessage,
    handleDeleteMessage,
    handleChatConfigChange,
    handleHistoryConfigChange,
    handleSaveChatConfig,
    fetchModelsForConnection,
  } = useChatController();

  const renameModalOpen = renameTarget !== null;

  return (
    <div className="chat-layout">
      <ChatSidebar
        characters={characters}
        charactersState={charactersState}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={setSelectedCharacterId}
        userPersonas={userPersonas}
        userPersonasState={userPersonasState}
        selectedUserPersonaId={selectedUserPersonaId}
        onSelectUserPersona={setSelectedUserPersonaId}
        chats={chats}
        chatsState={chatsState}
        selectedChatId={selectedChatId}
        onSelectChat={(id) => setSelectedChatId(id)}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onStartRenameChat={(chat) => setRenameTarget(chat)}
      />

      <ChatMain
        activeChat={activeChat}
        selectedCharacter={selectedCharacter}
        messages={messages}
        messagesState={messagesState}
        runs={runs}
        composerText={composerText}
        onComposerChange={setComposerText}
        onSend={() => void handleSendMessage()}
        onRetryMessage={(id) => void handleRetryMessage(id)}
        onDeleteMessage={(id) => void handleDeleteMessage(id)}
        isSending={isSending}
        globalError={globalError}
      />

      <aside className="chat-right-sidebar">
        <ChatConfigPanel
          activeChat={activeChat}
          chatConfig={chatConfig}
          chatConfigState={chatConfigState}
          chatHistoryConfig={chatHistoryConfig}
          chatHistoryState={chatHistoryState}
          llmConnections={llmConnections}
          llmState={llmState}
          modelOptions={modelOptions}
          modelOptionsState={modelOptionsState}
          onChatConfigChange={handleChatConfigChange}
          onHistoryConfigChange={handleHistoryConfigChange}
          onSave={() => void handleSaveChatConfig()}
          fetchModels={() => void fetchModelsForConnection()}
          selectedConnection={selectedConnection}
          enabledConnections={enabledConnections}
          savingChatConfig={savingChatConfig}
        />

        <PromptStackCard
          selectedCharacter={selectedCharacter}
          promptStack={promptStack}
          promptStackState={promptStackState}
        />

        <PromptPreviewCard
          activeChat={activeChat}
          promptPreview={promptPreview}
          promptPreviewState={promptPreviewState}
        />
      </aside>
      <RenameChatModal
        chat={renameTarget}
        isOpen={renameModalOpen}
        onClose={() => setRenameTarget(null)}
        onSave={handleRenameChat}
      />
    </div>
  );
}
