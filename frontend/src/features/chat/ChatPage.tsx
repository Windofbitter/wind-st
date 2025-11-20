import { ChatSidebar } from "./components/ChatSidebar";
import { ChatMain } from "./components/ChatMain";
import { ChatConfigPanel } from "./components/ChatConfigPanel";
import { PromptStackCard } from "./components/PromptStackCard";
import { PromptPreviewCard } from "./components/PromptPreviewCard";
import { useChatController } from "./useChatController";

export function ChatPage() {
  const {
    characters,
    charactersState,
    selectedCharacterId,
    setSelectedCharacterId,
    chats,
    chatsState,
    selectedChatId,
    setSelectedChatId,
    messages,
    messagesState,
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
    handleChatConfigChange,
    handleHistoryConfigChange,
    handleSaveChatConfig,
    fetchModelsForConnection,
  } = useChatController();

  return (
    <div className="chat-layout">
      <ChatSidebar
        characters={characters}
        charactersState={charactersState}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={setSelectedCharacterId}
        chats={chats}
        chatsState={chatsState}
        selectedChatId={selectedChatId}
        onSelectChat={(id) => setSelectedChatId(id)}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
      />

      <ChatMain
        activeChat={activeChat}
        selectedCharacter={selectedCharacter}
        messages={messages}
        messagesState={messagesState}
        composerText={composerText}
        onComposerChange={setComposerText}
        onSend={() => void handleSendMessage()}
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
    </div>
  );
}
