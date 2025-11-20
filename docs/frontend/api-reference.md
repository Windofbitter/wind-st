# Frontend API Reference

Source of truth for the DTOs used by the React app. Keep this in sync with `frontend/src/api/**`.

## HTTP base
- Client: `src/api/httpClient.ts` (`axios.create`).
- Base URL: `import.meta.env.VITE_API_BASE_URL ?? "/api"`; Vite dev proxies `/api` to `http://localhost:3000`.
- Errors: `unwrap` returns `data` or throws `ApiError(message, code?)`. Surface `message` directly to users.

## Domains

### Characters (`src/api/characters.ts`)
- `Character`: `{ id, name, description, persona, avatarPath, creatorNotes|null }`.
- `CreateCharacterRequest`: `{ name, description, persona, avatarPath, creatorNotes? }`.
- `UpdateCharacterRequest`: partial of create.
- Calls: `listCharacters({ name? })` (query key: `name`), `getCharacter(id)`, `createCharacter(payload)`, `updateCharacter(id, payload)`, `deleteCharacter(id)`.

### Chats (`src/api/chats.ts`)
- `Chat`: `{ id, characterId, title, createdAt, updatedAt }`.
- `ChatLLMConfig`: `{ id, chatId, llmConnectionId, model, temperature, maxOutputTokens, maxToolIterations, toolCallTimeoutMs }`.
- `CreateChatRequest`: `{ characterId, title, initialConfig?: { llmConnectionId, model, temperature, maxOutputTokens, maxToolIterations?, toolCallTimeoutMs? } }` (`maxToolIterations` defaults to `3`, `toolCallTimeoutMs` defaults to `15000` if omitted).
- `CreateChatResponse`: `{ chat, llmConfig }` (config always created alongside the chat).
- `UpdateChatConfigRequest`: partial of `ChatLLMConfig` minus ids.
- `PromptPreview`: `{ messages: { role: "system"|"user"|"assistant"|"tool"; content: string; toolCalls?: ToolCall[]; toolCallId?: string|null }[]; tools: { serverId, serverName }[] }` (messages mirror `LLMChatMessage`; tool calls appear when history contains tool use).
- Calls: `listChats({ characterId? })`, `getChat(id)`, `createChat(payload)`, `deleteChat(id)`, `getChatConfig(chatId)`, `updateChatConfig(chatId, payload)`, `createTurn(chatId, { content })`, `getPromptPreview(chatId)`.

### Chat history config (`src/api/historyConfig.ts`)
- `ChatHistoryConfig`: `{ historyEnabled: boolean; messageLimit: number }` (defaults to `{ historyEnabled: true, messageLimit: 20 }` when none is stored).
- Calls: `getChatHistoryConfig(chatId)`, `updateChatHistoryConfig(chatId, partial)` (creates config if missing).

### Messages (`src/api/messages.ts`)
- `MessageRole`: `"user" | "assistant" | "system" | "tool"`.
- `Message`: `{ id, chatId, role, content, toolCallId|null, toolCalls: unknown|null, toolResults: unknown|null, tokenCount: number|null }`.
- Calls: `listMessages(chatId, { limit?, offset? })`, `appendMessage(chatId, { role, content, toolCallId?, toolCalls?, toolResults?, tokenCount? })`.

### Presets (`src/api/presets.ts`)
- `PresetKind`: `"static_text"`.
- `Preset`: `{ id, title, description, kind, content|null, builtIn: boolean }`.
- Requests: `CreatePresetRequest` same fields; `UpdatePresetRequest` partial.
- Calls: `listPresets({ kind?, builtIn?, titleContains? })`, `getPreset(id)`, `createPreset(payload)`, `updatePreset(id, payload)`, `deletePreset(id)`.

### Prompt stack (`src/api/promptStack.ts`)
- `PromptRole`: `"system" | "assistant" | "user"`.
- `PromptPreset`: `{ id, characterId, presetId, role, sortOrder }`.
- `AttachPromptPresetRequest`: `{ presetId, role, position? }`.
- `ReorderPromptPresetsRequest`: `{ ids: string[] }` – order is authoritative; keep ids stable.
- Calls: `getPromptStack(characterId)`, `attachPromptPreset(characterId, payload)`, `reorderPromptPresets(characterId, payload)` (204), `detachPromptPreset(promptPresetId)`.

### Lorebooks (`src/api/lorebooks.ts`)
- `Lorebook`: `{ id, name, description }`.
- `LorebookEntry`: `{ id, lorebookId, keywords: string[], content, insertionOrder, isEnabled }` (order determines insertion priority; `isEnabled` defaults to `true` on create).
- `CharacterLorebook`: `{ id, characterId, lorebookId }`.
- Calls: `listLorebooks({ nameContains? })`, `getLorebook(id)`, `createLorebook(payload)`, `updateLorebook(id, payload)`, `deleteLorebook(id)`, `listLorebookEntries(lorebookId)`, `createLorebookEntry(lorebookId, payload)`, `updateLorebookEntry(entryId, payload)`, `deleteLorebookEntry(entryId)`, `listCharacterLorebooks(characterId)`, `attachCharacterLorebook(characterId, lorebookId)`, `detachCharacterLorebook(id)`.

### LLM connections (`src/api/llmConnections.ts`)
- `LLMProvider`: `"openai_compatible"`.
- `LLMConnection`: `{ id, name, provider, baseUrl, defaultModel, apiKey, isEnabled }`.
- `CreateLLMConnectionRequest`: same fields (`isEnabled` defaults to `true`).
- Calls: `listLLMConnections()`, `getLLMConnection(id)`, `createLLMConnection(payload)`, `updateLLMConnection(id, payload)`, `deleteLLMConnection(id)`.

### MCP servers (`src/api/mcpServers.ts`)
- `MCPServer`: `{ id, name, command, args: string[], env: Record<string,string>, isEnabled }`.
- `CharacterMCPServer`: `{ id, characterId, mcpServerId }`.
- `MCPServerStatusResponse`: `{ serverId, status: "ok"|"error", toolCount?, error? }` (disabled servers return `status: "error"` with an error string).
- Calls: `listMCPServers()`, `getMCPServer(id)`, `createMCPServer(payload)`, `updateMCPServer(id, payload)` (resets MCP connection), `deleteMCPServer(id)` (resets MCP connection), `getMCPServerStatus(id, { reset?: boolean, timeoutMs?: number })` (`timeoutMs` defaults to `5000`, `reset` accepts `true`/`1`), `listCharacterMCPServers(characterId)`, `attachCharacterMCPServer(characterId, mcpServerId)`, `detachCharacterMCPServer(id)`.

### Runs (`src/api/runs.ts`)
- `ChatRunStatus`: `"pending" | "running" | "completed" | "failed" | "canceled"`.
- `ChatRunTokenUsage`: `{ prompt: number; completion: number; total: number }`.
- `ChatRun`: `{ id, chatId, status, userMessageId, assistantMessageId|null, startedAt, finishedAt|null, error|null, tokenUsage|null }`.
- Calls: `listChatRuns(chatId)`.

### Health (`src/api/health.ts`)
- `HealthStatus`: `{ status: "ok" }`.
- Calls: `getHealth()`.
