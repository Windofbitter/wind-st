# Backend Design

## Architecture

- **Goal**: SillyTavern-like chat server with clean layering, MCP integration, and configurable LLM backends.
- **Pattern**: Hexagonal / ports-and-adapters with dependency inversion.
- **Layers**:
  - `core`: domain models and ports (interfaces).
  - `application`: use-case services and orchestrators.
  - `infrastructure`: database repositories, LLM/MCP clients.
  - `http`: Fastify routes/controllers wiring requests to application services.

Application and HTTP layers depend only on ports defined in `core`; infrastructure implements those ports and is wired in at startup.

## Core Domain Services and Ports

### Characters and Prompt Stack

- `CharacterService`
  - `createCharacter(data)`
  - `getCharacter(id)`
  - `listCharacters(filter?)`
  - `updateCharacter(id, patch)`
  - `deleteCharacter(id)`
- `PromptStackService` (for `Preset` + `PromptPreset`)
  - `getPromptStackForCharacter(characterId)`
  - `attachPresetToCharacter(characterId, presetId, role, position?)`
  - `detachPromptPreset(promptPresetId)`
  - `reorderPromptPresets(characterId, orderedPromptPresetIds)`
- Ports:
  - `CharacterRepository`
  - `PresetRepository`
  - `PromptPresetRepository`

### Presets and Lorebooks

- `PresetService`
  - `createPreset(data)`
  - `listPresets(filter?)`
  - `getPreset(id)`
  - `updatePreset(id, patch)`
  - `deletePreset(id)` (usually not for `built_in` presets)
- `LorebookService`
  - `createLorebook(data)`
  - `listLorebooks(filter?)`
  - `getLorebook(id)`
  - `updateLorebook(id, patch)`
  - `deleteLorebook(id)`
  - `createLorebookEntry(lorebookId, data)`
  - `listLorebookEntries(lorebookId)`
  - `updateLorebookEntry(entryId, patch)`
  - `deleteLorebookEntry(entryId)`
- Ports:
  - `LorebookRepository`
  - `LorebookEntryRepository`

### Chats, Messages, LLM Config

- `ChatService`
  - `createChat(characterId, initialConfig?)`
  - `getChat(id)`
  - `listChats(filter?)`
  - `deleteChat(id)`
  - `getChatLLMConfig(chatId)`
  - `updateChatLLMConfig(chatId, patch)`
- `MessageService`
  - `appendMessage(chatId, messageData)`
  - `listMessages(chatId, options?)`
- Ports:
  - `ChatRepository`
  - `MessageRepository`
  - `ChatLLMConfigRepository`

### LLM Connections

- `LLMConnectionService`
  - `createConnection(data)`
  - `listConnections()`
  - `getConnection(id)`
  - `updateConnection(id, patch)`
  - `deleteConnection(id)`
- Ports:
  - `LLMConnectionRepository`
  - `LLMClient`
    - `completeChat({ connection, model, messages, tools?, maxTokens?, temperature? })`

### MCP Servers and Tools

- `MCPServerService`
  - `registerServer(data)`
  - `listServers()`
  - `getServer(id)`
  - `updateServer(id, patch)`
  - `deleteServer(id)`
  - `setServerEnabled(id, isEnabled)`
- `ToolRegistry`
  - `getToolsForChat(chatId)`
- Ports:
  - `MCPServerRepository`
  - `MCPClient`
    - `listTools(server)`
    - `callTool(server, toolName, args)`

### Prompt Builder and Orchestration

- `PromptBuilder`
  - `buildPromptForChat(chatId)` → `{ messages, tools }`
  - Resolves:
    - character `PromptPreset` stack (`static_text`, `lorebook`, `history`, `mcp_tools`),
    - triggered `LorebookEntry`s and their insertion order,
    - history strategy from `history` presets,
    - MCP tools from `mcp_tools` presets.
- `ChatOrchestrator`
  - `handleUserMessage(chatId, userContent)`
  - Responsibilities:
    - Single entrypoint for orchestrated user → assistant turns for a chat.
    - Only layer allowed to call `LLMClient` and append assistant/tool messages via `MessageService`.
  - Steps for a turn:
    1. Append user message.
    2. Build prompt via `PromptBuilder`.
    3. Call `LLMClient.completeChat` with tools from `ToolRegistry`.
    4. If tool calls exist, execute via `MCPClient`, append `tool` messages, and call LLM once more.
    5. Append final assistant message and return it.

`ChatOrchestrator` depends only on ports: `PromptBuilder`, `LLMClient`, `MCPClient`, `MessageService`, `ChatService`.

#### Concurrency and "chat busy"

- Guarantee:
  - At most one orchestrated turn (`handleUserMessage`) may run for a given `chatId` at any time.
- Implementation (initial):
  - Enforce a per-process lock keyed by `chatId` inside `ChatOrchestrator` so concurrent calls for the same chat either wait, fail fast, or are explicitly queued.
  - HTTP `POST /chats/:id/turns` should treat an in-flight turn for `:id` as "chat busy" and return a deterministic error (for example, HTTP 409) instead of starting another turn.
- Representation:
  - "Busy" is an orchestration concern, not a `Chat` field: the `Chat` entity remains free of transient status flags.
  - The UI derives busy state from in-flight `/chats/:id/turns` calls or from the new `ChatRun` model (`status = running`).

#### Deleting the last turn

- Semantics:
  - Deleting history is defined as truncating the conversation at the last user turn.
  - When requested, the system deletes:
    - the last `user` message for a chat, and
    - all messages that come after it (assistant/tool/system) for that same chat.
- Constraints:
  - Only the tail of the conversation can be deleted; arbitrary deletion of messages in the middle of a chat is not supported.
  - Deletion is only allowed when there is no `ChatRun` in `running` status for that chat (i.e., chat is not busy).
- Implementation:
  - `ChatOrchestrator` (or a dedicated application service) is responsible for:
    - Listing messages for the chat in order.
    - Locating the last `user` message.
    - Deleting that message and all subsequent messages.
    - Optionally updating or marking the associated `ChatRun` as `canceled` or removing it.

#### ChatRun lifecycle and crash recovery

- Lifecycle:
  - `pending`: Run created but work not yet started (reserved for queued executions).
  - `running`: Turn is actively being processed by `ChatOrchestrator`.
  - `completed`: Turn finished successfully; associated assistant message has been appended.
  - `failed`: Turn failed with an error; details captured in `error`/logs.
  - `canceled`: Turn was aborted explicitly (for example, by a "stop generation" request).
- Process termination while a run is running:
  - If the process dies while a `ChatRun` is in `running`, that work is effectively lost.
  - On startup, the backend should treat any `ChatRun` that is still `running` as `failed` or `canceled` (implementation choice), mark it accordingly, and consider the chat idle again.
  - The transcript may contain partially generated assistant/tool messages; the orchestration layer should either:
    - append only fully-formed messages, or
    - mark partial runs as `failed` while leaving the truncated transcript as-is (client may choose to hide those runs).

## HTTP API (Fastify)

### Characters and Prompt Stack

- Characters:
  - `POST /characters`
  - `GET /characters`
  - `GET /characters/:id`
  - `PATCH /characters/:id`
  - `DELETE /characters/:id`
- Prompt stack:
  - `GET /characters/:id/prompt-presets`
  - `POST /characters/:id/prompt-presets`
  - `PATCH /prompt-presets/:id`
  - `DELETE /prompt-presets/:id`
  - `POST /characters/:id/prompt-presets/reorder`

### Presets and Lorebooks

- Presets:
  - `GET /presets`
  - `POST /presets`
  - `GET /presets/:id`
  - `PATCH /presets/:id`
  - `DELETE /presets/:id`
- Lorebooks:
  - `POST /lorebooks`
  - `GET /lorebooks`
  - `GET /lorebooks/:id`
  - `PATCH /lorebooks/:id`
  - `DELETE /lorebooks/:id`
- Lorebook entries:
  - `POST /lorebooks/:id/entries`
  - `GET /lorebooks/:id/entries`
  - `PATCH /lorebook-entries/:entryId`
  - `DELETE /lorebook-entries/:entryId`

### Chats, Messages, LLM Config

- Chats:
  - `POST /chats`
  - `GET /chats`
  - `GET /chats/:id`
  - `DELETE /chats/:id`
- Messages:
  - `GET /chats/:id/messages`
  - `POST /chats/:id/messages`
  - `POST /chats/:id/turns` (orchestrated user → assistant turn)
  - Optional future endpoints:
    - `DELETE /chats/:id/turns/last` (truncate conversation by deleting the last user turn and all following messages)
- LLM config:
  - `GET /chats/:id/llm-config`
  - `PATCH /chats/:id/llm-config`

### LLM Connections

- `POST /llm-connections`
- `GET /llm-connections`
- `GET /llm-connections/:id`
- `PATCH /llm-connections/:id`
- `DELETE /llm-connections/:id`

### MCP Servers

- `POST /mcp-servers`
- `GET /mcp-servers`
- `GET /mcp-servers/:id`
- `PATCH /mcp-servers/:id`
- `DELETE /mcp-servers/:id`
- Optional:
  - `POST /mcp-servers/:id/test`
  - `GET /mcp-servers/:id/tools`

## Folder Structure (Draft)

- `src/core`
  - `entities/`
  - `ports/` (repositories, LLMClient, MCPClient, PromptBuilder)
- `src/application`
  - `services/` (CharacterService, ChatService, PresetService, etc.)
  - `orchestrators/` (ChatOrchestrator)
- `src/infrastructure`
  - `db/` (SQLite adapters using ORM)
  - `llm/` (OpenAI-compatible LLMClient)
  - `mcp/` (MCPClient implementations)
- `src/http`
  - `routes/` (Fastify route modules)
  - `server.ts` (Fastify bootstrap + DI wiring)

All dependencies point inward towards `core`; infrastructure and HTTP are replaceable shells around the domain and application logic.
