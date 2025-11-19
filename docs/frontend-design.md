# Frontend Design

## 1. Goals and Principles

- Mirror the backend domain model: characters, chats, messages, presets, lorebooks, LLM connections, MCP servers, chat runs.
- Keep dependency inversion: React components depend on small typed API modules, not raw `fetch` scattered everywhere.
- No special cases: use consistent list + detail + form patterns for all CRUD-ish domains.
- Prefer simple, explicit state over clever abstractions. Add indirection only when a real problem appears.

Result: the frontend becomes a thin, boring shell around the backend ports (HTTP API), with clear seams for replacement and testing.

## 2. High-Level Architecture

- **Runtime**: React + TypeScript, Vite.
- **Routing**: React Router (or similar), route-per-domain.
- **Data access**: axios via a central HTTP client.
- **State**: local component state + light domain-level caches; no global store until we actually need one.

The code is organized in domain slices under `frontend/src`:

- `src/api/` – HTTP client and domain API modules (DTOs + calls).
- `src/features/` – UI components grouped by domain (`chat`, `characters`, etc.).
- `src/routes/` – route components that compose features for each URL.
- `src/components/` – shared UI primitives (buttons, layout, forms).
- `src/hooks/` – cross-cutting React hooks (if needed later).

### 2.1 Routing Sketch

- `/` → redirect to `/chat`.
- `/chat` → Chat Workspace.
- `/characters` → Characters list.
- `/characters/:characterId` → Character detail (Overview / Persona / Prompt Builder tabs).
- `/presets` → Presets library.
- `/lorebooks` → Lorebooks + entries.
- `/llm-connections` → LLM connections.
- `/mcp-servers` → MCP servers.
- `/runs` → Chat runs (debug/ops).
- `/settings` → UI-only app settings.
- `/health` → Backend health status.

Routes are thin: they orchestrate data fetching via `src/api/*` and render feature components. No business logic belongs in routing.

## 3. HTTP and DTO Layer

### 3.1 Central HTTP Client

- Located at `src/api/httpClient.ts`.
- Uses axios with:
  - configurable `baseURL` (from env or a simple config file),
  - JSON handling,
  - basic error normalization.
- All domain API modules import this client; we never re-create axios instances ad hoc.

Example responsibilities of `httpClient.ts`:

- Export a preconfigured `http` instance.
- Optionally export a helper to unwrap `.data` and map backend `AppError` into a typed error for the UI.

### 3.2 DTO Design

DTOs mirror backend HTTP responses and payloads, not the UI views. For each domain we define:

- **Entity DTOs**: the shapes returned by GET endpoints, usually 1:1 with backend entities.
- **Input DTOs**:
  - `CreateXRequest` – payload for `POST` endpoints.
  - `UpdateXRequest` – partial payload for `PATCH` endpoints.

No UI-only flags (`busy`, `selected`, etc.) live in DTO types. These are derived in components.

## 4. Domain API Modules

Each domain gets its own file under `src/api/`. Files remain small and focused; if one gets too large, split it by subdomain.

### 4.1 Characters – `src/api/characters.ts`

Responsible for `/characters` endpoints.

DTOs:

- `Character` – `{ id, name, description, persona, avatarPath, creatorNotes }`.
- `CreateCharacterRequest` – `{ name, description, persona, avatarPath, creatorNotes? }`.
- `UpdateCharacterRequest` – partial of `CreateCharacterRequest`.

API functions:

- `listCharacters(params?: { name?: string })` → `Promise<Character[]>`.
- `getCharacter(id: string)` → `Promise<Character>`.
- `createCharacter(payload: CreateCharacterRequest)` → `Promise<Character>`.
- `updateCharacter(id: string, payload: UpdateCharacterRequest)` → `Promise<Character>`.
- `deleteCharacter(id: string)` → `Promise<void>`.

Usage:

- `CharactersListPage` uses `listCharacters` and `deleteCharacter`.
- `CharacterDetailPage` uses `getCharacter`, `updateCharacter`.
- Create dialog/form uses `createCharacter`.

### 4.2 Chats, Messages, Runs – `src/api/chats.ts`, `src/api/messages.ts`, `src/api/runs.ts`

#### Chats – `src/api/chats.ts`

DTOs:

- `Chat` – `{ id, characterId, title, createdAt, updatedAt }`.
- `ChatLLMConfig` – `{ id, chatId, llmConnectionId, model, temperature, maxOutputTokens }`.
- `CreateChatRequest` – `{ characterId, title, initialConfig?: Omit<ChatLLMConfig, "id" | "chatId"> }`.
- `UpdateChatConfigRequest` – partial of `Omit<ChatLLMConfig, "id" | "chatId">`.

API functions:

- `listChats(params?: { characterId?: string })` → `Promise<Chat[]>`.
- `getChat(id: string)` → `Promise<Chat>`.
- `createChat(payload: CreateChatRequest)` → `Promise<{ chat: Chat; llmConfig: ChatLLMConfig }>`.
- `deleteChat(id: string)` → `Promise<void>`.
- `getChatConfig(chatId: string)` → `Promise<ChatLLMConfig>`.
- `updateChatConfig(chatId: string, payload: UpdateChatConfigRequest)` → `Promise<ChatLLMConfig>`.
- `createTurn(chatId: string, payload: { content: string })` → `Promise<Message>`.

#### Messages – `src/api/messages.ts`

DTOs:

- `MessageRole` – `"user" | "assistant" | "system" | "tool"`.
- `Message` – `{ id, chatId, role, content, toolCalls, toolResults, tokenCount }`.
- `AppendMessageRequest` – `{ role, content, toolCalls?, toolResults?, tokenCount? }`.

API functions:

- `listMessages(chatId: string, params?: { limit?: number; offset?: number })` → `Promise<Message[]>`.
- `appendMessage(chatId: string, payload: AppendMessageRequest)` → `Promise<Message>`.

#### Runs – `src/api/runs.ts`

DTOs:

- `ChatRunStatus` – `"pending" | "running" | "completed" | "failed" | "canceled"`.
- `ChatRunTokenUsage` – `{ prompt: number; completion: number; total: number }`.
- `ChatRun` – `{ id, chatId, status, userMessageId, assistantMessageId, startedAt, finishedAt, error, tokenUsage }`.

API functions:

- `listChatRuns(chatId: string)` → `Promise<ChatRun[]>`.

### 4.3 Presets + Prompt Stack – `src/api/presets.ts`, `src/api/promptStack.ts`

#### Presets – `src/api/presets.ts`

DTOs:

- `PresetKind` – `"static_text"`.
- `Preset` – `{ id, title, description, kind, content, builtIn }`.
- `CreatePresetRequest` – `{ title, description, kind, content?, builtIn? }`.
- `UpdatePresetRequest` – partial of `CreatePresetRequest`.

API functions:

- `listPresets(params?: { kind?: PresetKind; builtIn?: boolean; titleContains?: string })` → `Promise<Preset[]>`.
- `getPreset(id: string)` → `Promise<Preset>`.
- `createPreset(payload: CreatePresetRequest)` → `Promise<Preset>`.
- `updatePreset(id: string, payload: UpdatePresetRequest)` → `Promise<Preset>`.
- `deletePreset(id: string)` → `Promise<void>`.

#### Prompt Stack – `src/api/promptStack.ts`

DTOs:

- `PromptRole` – `"system" | "assistant" | "user"`.
- `PromptPreset` – `{ id, characterId, presetId, role, sortOrder }`.
- `AttachPromptPresetRequest` – `{ presetId: string; role: PromptRole; position?: number }`.
- `ReorderPromptPresetsRequest` – `{ ids: string[] }`.

API functions:

- `getPromptStack(characterId: string)` → `Promise<PromptPreset[]>`.
- `attachPromptPreset(characterId: string, payload: AttachPromptPresetRequest)` → `Promise<PromptPreset>`.
- `reorderPromptPresets(characterId: string, payload: ReorderPromptPresetsRequest)` → `Promise<void>`.
- `detachPromptPreset(promptPresetId: string)` → `Promise<void>`.

### 4.4 Lorebooks – `src/api/lorebooks.ts`

DTOs:

- `Lorebook` – `{ id, name, description }`.
- `LorebookEntry` – `{ id, lorebookId, keywords, content, insertionOrder, isEnabled }`.
- `CreateLorebookRequest` – `{ name, description }`.
- `UpdateLorebookRequest` – partial of `CreateLorebookRequest`.
- `CreateLorebookEntryRequest` – `{ keywords: string[]; content: string; insertionOrder: number; isEnabled?: boolean }`.
- `UpdateLorebookEntryRequest` – partial of `CreateLorebookEntryRequest`.

API functions:

- `listLorebooks(params?: { nameContains?: string })` → `Promise<Lorebook[]>`.
- `getLorebook(id: string)` → `Promise<Lorebook>`.
- `createLorebook(payload: CreateLorebookRequest)` → `Promise<Lorebook>`.
- `updateLorebook(id: string, payload: UpdateLorebookRequest)` → `Promise<Lorebook>`.
- `deleteLorebook(id: string)` → `Promise<void>`.
- `listLorebookEntries(lorebookId: string)` → `Promise<LorebookEntry[]>`.
- `createLorebookEntry(lorebookId: string, payload: CreateLorebookEntryRequest)` → `Promise<LorebookEntry>`.
- `updateLorebookEntry(entryId: string, payload: UpdateLorebookEntryRequest)` → `Promise<LorebookEntry>`.
- `deleteLorebookEntry(entryId: string)` → `Promise<void>`.

### 4.5 LLM Connections – `src/api/llmConnections.ts`

DTOs:

- `LLMProvider` – `"openai_compatible"` (for now).
- `LLMConnection` – `{ id, name, provider, baseUrl, defaultModel, apiKey, isEnabled }`.
- `CreateLLMConnectionRequest` – `{ name, provider, baseUrl, defaultModel, apiKey, isEnabled?: boolean }`.
- `UpdateLLMConnectionRequest` – partial of `CreateLLMConnectionRequest`.

API functions:

- `listLLMConnections()` → `Promise<LLMConnection[]>`.
- `getLLMConnection(id: string)` → `Promise<LLMConnection>`.
- `createLLMConnection(payload: CreateLLMConnectionRequest)` → `Promise<LLMConnection>`.
- `updateLLMConnection(id: string, payload: UpdateLLMConnectionRequest)` → `Promise<LLMConnection>`.
- `deleteLLMConnection(id: string)` → `Promise<void>`.

### 4.6 MCP Servers – `src/api/mcpServers.ts`

DTOs:

- `MCPServer` – `{ id, name, command, args: string[]; env: Record<string, string>; isEnabled }`.
- `CreateMCPServerRequest` – `{ name, command, args: string[]; env: Record<string, string>; isEnabled?: boolean }`.
- `UpdateMCPServerRequest` – partial of `CreateMCPServerRequest`.

API functions:

- `listMCPServers()` → `Promise<MCPServer[]>`.
- `getMCPServer(id: string)` → `Promise<MCPServer>`.
- `createMCPServer(payload: CreateMCPServerRequest)` → `Promise<MCPServer>`.
- `updateMCPServer(id: string, payload: UpdateMCPServerRequest)` → `Promise<MCPServer>`.
- `deleteMCPServer(id: string)` → `Promise<void>`.

### 4.7 Health – `src/api/health.ts`

DTOs:

- `HealthStatus` – `{ status: "ok" }` (extendable later).

API functions:

- `getHealth()` → `Promise<HealthStatus>`.

## 5. Features and File Structure

The feature layer consumes the domain API modules and renders UI. Suggested structure:

- `src/features/chat/`
  - `ChatWorkspace.tsx` – main `/chat` layout.
  - `ChatSidebar.tsx` – characters + chats selector.
  - `MessageList.tsx` – renders messages.
  - `ChatComposer.tsx` – input form using `createTurn`.
  - `ChatConfigPanel.tsx` – uses `getChatConfig` / `updateChatConfig` + LLM connections.
- `src/features/characters/`
  - `CharactersListPage.tsx`.
  - `CharacterDetailPage.tsx` (with tabs for Overview, Persona, Prompt Builder).
  - `CharacterForm.tsx`, `PersonaEditor.tsx`.
- `src/features/presets/`
  - `PresetsPage.tsx`, `PresetForm.tsx`.
- `src/features/promptBuilder/`
  - `PromptBuilderTab.tsx`, `PresetPalette.tsx`, `PromptStackList.tsx`.
- `src/features/lorebooks/`
  - `LorebooksPage.tsx`, `LorebookDetailPage.tsx`, `LorebookForm.tsx`, `LorebookEntriesTable.tsx`.
- `src/features/llmConnections/`
  - `LLMConnectionsPage.tsx`, `LLMConnectionForm.tsx`.
- `src/features/mcpServers/`
  - `MCPServersPage.tsx`, `MCPServerForm.tsx`.
- `src/features/runs/`
  - `RunsPage.tsx`, `ChatRunsTable.tsx`.
- `src/features/health/`
  - `HealthPage.tsx`.

Each feature file stays under ~300 lines by pushing reusable bits into smaller components or hooks.

## 6. State and Error Handling

- Keep state normalized per domain where it matters (e.g., maps keyed by `id` for characters, chats, presets).
- For now, use simple `useEffect` + `useState` or minimal fetch hooks; introduce something like React Query only when it clearly solves a problem.
- On errors, show backend `AppError.message` and, when useful, `AppError.code` in banners or inline form errors.

This design keeps the frontend “dumb but clean”: domain DTOs and API services form the stable contract; everything else is replaceable UI sugar on top.

