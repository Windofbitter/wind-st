# Frontend Flows and Invariants

These are the user-space guarantees to keep intact. If any break, fix the flow before adding new features.

## Core happy path
1) Create an LLM connection (name, baseUrl, defaultModel, apiKey). `POST /llm-connections`.
2) Create a user persona (name/description/prompt, optional default flag). `POST /user-personas`.
3) Create a character (name/description/persona). `POST /characters`.
4) Create at least one preset (`static_text`) and a lorebook with entries (keywords, content, insertionOrder, isEnabled). `POST /presets`, `POST /lorebooks/.../entries`.
5) Attach presets to the character prompt stack with roles, order them via DnD (`PromptStackList` → `reorderPromptPresets` uses ordered `ids`). Attach lorebooks/MCP servers where needed.
6) Create a chat for that character, selecting a user persona, optionally with an initial LLM config. `POST /chats`.
7) Load chat messages (`listMessages`), history config (`getChatHistoryConfig`), prompt preview (`getPromptPreview`), and per-chat LLM config (`getChatConfig`) when a chat is selected.
8) Send a turn (`createTurn`); on success, messages refresh and prompt preview should reflect the new state.

## Prompt stack + ordering
- Drag-and-drop uses stable `PromptPreset.id`; `reorderPromptPresets` expects the full ordered `ids` array. Never fabricate ids client-side.
- Lorebook entries and MCP server attachments follow the same rule: keep returned ids intact and send them back in order when reordering.

## Config panels
- LLM config: `ChatLLMConfig` requires `llmConnectionId`, `model`, `temperature`, `maxOutputTokens`, `maxToolIterations`, `toolCallTimeoutMs`. Save via `updateChatConfig`.
- History: `ChatHistoryConfig` uses `{ historyEnabled, messageLimit }`. Keep UI tolerant of missing data and propagate `ApiError.message` on failure.

## MCP servers
- Attach/detach per character via `attachCharacterMCPServer` / `detachCharacterMCPServer`.
- Status checks (`getMCPServerStatus`) may return `status: "error"` with `error` text; surface it instead of hiding.

## i18n and theme
- Any new string goes into both `en` and `zh` dictionaries in `src/i18n.ts`.
- Respect CSS variables for colors/spacing to keep the dark theme consistent.

## Error handling
- Prefer surfacing `ApiError.message` inline. Keep lists stale-but-visible if a mutation fails; reload data after successful mutating calls.
