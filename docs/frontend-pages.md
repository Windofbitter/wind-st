# Frontend Pages Design

## 1. Goals and Principles

- Mirror the backend domain: characters, chats, messages, presets, lorebooks, MCP servers, LLM connections, chat runs.
- Prefer simple list + detail patterns; no special-case UIs that require bespoke logic per entity.
- Keep orchestration concerns (busy chats, runs) out of the core data models in the UI; derive them from API state.
- Use React with client-side routing; a single layout shell with navigation and nested routes.

At a high level, the app has:

- A **Chat Workspace** where users actually talk to characters.
- A **Character Prompt Builder** to configure personas and prompt stacks per character.
- **Resource management pages** for presets, lorebooks, LLM connections, MCP servers.
- Optional **debug/ops views** for chat runs and system health.

## 2. Global Layout and Navigation

### 2.1 Layout Shell

Top-level layout shared across all routes:

- Left sidebar:
  - App logo/name.
  - Primary navigation:
    - `Chat`
    - `Characters`
    - `Presets`
    - `Lorebooks`
    - `LLM Connections`
    - `MCP Servers`
    - `Runs` (optional, mainly for debugging)
  - Secondary links:
    - `Settings` (app-level, optional).
    - `Health` (shows backend health).
- Main content area:
  - Header with current section title and contextual actions (e.g., "New Character", "New Preset").
  - Body where the active page is rendered.

Routing sketch (React Router style):

- `/` → redirects to `/chat`.
- `/chat` → Chat Workspace.
- `/characters` → Characters list.
- `/characters/:characterId` → Character detail with tabs.
- `/presets` → Preset library.
- `/lorebooks` → Lorebooks and entries.
- `/llm-connections` → LLM connections.
- `/mcp-servers` → MCP servers.
- `/runs` → Chat runs (optional, for debugging / ops).
- `/settings` → App-wide settings (theme, base URLs, etc., as needed).
- `/health` → Backend health status.

## 3. Chat Workspace (`/chat`)

### 3.1 Purpose

Primary working surface where the user:

- Picks a character and chat.
- Reads conversation history.
- Sends new turns (user → orchestrated assistant via `/chats/:id/turns`).
- Adjusts per-chat LLM settings.

### 3.2 Layout

- Left column: **Character + Chat selector**
  - Character dropdown / list:
    - Lists characters from `GET /characters`.
    - Search by name (uses `name` filter when added; initially client-side).
    - "New Character" button linking to `/characters/new` or opening a modal.
  - Chat list for selected character:
    - List chats from `GET /chats?characterId=...` (backend can be extended; initially client-side filter).
    - Each item: chat title, updatedAt, small status indicator if last run failed.
    - "New Chat" button:
      - Calls `POST /chats` with `characterId` + optional initial config.
  - Delete chat:
    - Action on list item.
    - Calls `DELETE /chats/:id`.
    - Confirm dialog; on success, removes from list.

- Center column: **Conversation**
  - Header:
    - Character name and avatar.
    - Chat title (editable inline; uses a future `PATCH /chats/:id` if added, or client-only title if not).
  - Message timeline:
    - Messages from `GET /chats/:id/messages`.
    - Roles:
      - `user` messages left-aligned.
      - `assistant` messages right-aligned.
      - `system` messages grouped/visually separated.
      - `tool` messages collapsed or shown as expandable "Tool call/result" blocks.
    - Pagination:
      - Uses `limit` / `before` / `after` when available; otherwise simple "load more" pattern derived from current API.
  - Composer:
    - Textarea for user content.
    - "Send" button:
      - Calls `POST /chats/:id/turns` with `{ content }`.
      - While request is in flight for this chat:
        - Disable input and button.
        - Show "Chat is thinking…" spinner.
      - On error:
        - If backend returns a "chat busy" error or `409` in the future, show a clear banner.
        - For validation or other `AppError`s, surface `error.message`.

### 3.3 Right Sidebar: Chat Settings and Context

- **LLM config panel**
  - Loaded via `GET /chats/:id/config`.
  - Fields:
    - Connection (select from `GET /llm-connections`).
    - Model (string; may be suggested from connection).
    - Temperature (number input / slider).
    - Max output tokens (number).
  - Save:
    - Calls `PATCH /chats/:id/config`.
    - Show validation errors based on `AppError` responses.

- **Prompt stack preview**
  - Shows effective prompt components for the selected character:
    - Fetch via `GET /characters/:characterId/prompt-stack`.
  - Read-only in the Chat Workspace.
  - Each entry:
    - Title, kind (static_text / lorebook / history / mcp_tools), role, sort order.
  - Link "Edit prompt" → `/characters/:characterId#prompt-builder` (Character detail page).

- **Lore and tools summary (optional)**
  - For the current chat, show which lorebooks and MCP servers might be active based on the prompt stack:
    - Derived client-side from presets / configs; no extra backend endpoint required.

## 4. Characters (`/characters`, `/characters/:id`)

### 4.1 Characters List (`/characters`)

Purpose:

- Manage character definitions that drive chats and prompt stacks.

UI:

- Table or cards of characters from `GET /characters` (with optional `name` filter).
- Columns:
  - Avatar.
  - Name.
  - Description.
- Actions:
  - "New Character" button:
    - Opens a create form.
    - On submit, calls `POST /characters`.
  - Row actions:
    - "Edit" → `/characters/:id`.
    - "Delete":
      - Calls `DELETE /characters/:id`.
      - Confirm dialog; on success, removes from list and any associated UI state.

### 4.2 Character Detail (`/characters/:id`)

Tabbed view, reusing the global shell header:

- Tabs:
  - `Overview`
  - `Persona`
  - `Prompt Builder`

#### 4.2.1 Overview tab

- Basic fields from `GET /characters/:id`:
  - Name (editable).
  - Description (editable).
  - Avatar path / upload control (implementation detail).
  - Creator notes.
- Save button:
  - Calls `PATCH /characters/:id` with only changed fields.

#### 4.2.2 Persona tab

- Large textarea for `persona` field.
- Shows simple statistics (character count, token estimate).
- Save button:
  - Calls `PATCH /characters/:id` with `{ persona }`.

#### 4.2.3 Prompt Builder tab

Purpose:

- Single place to build the full character prompt: persona + ordered prompt presets.

Data:

- Stack:
  - `GET /characters/:characterId/prompt-stack` to list `PromptPreset` entries with their sort order, role, and linked `Preset`.
- Preset library:
  - `GET /presets` to choose from existing presets.
- (Optional) Lorebooks and MCP servers for structured config in new presets:
  - `GET /lorebooks`
  - `GET /mcp-servers`

UI:

- Top: **Quick persona editor**
  - Small textarea for `persona` (full-screen editing still available in the `Persona` tab).
  - Save button calling `PATCH /characters/:id` with `{ persona }`.

- Left column: **Palettes + Quick Create**
  - Multiple palette sections act as sources (not separate stacks):
    - **Static Blocks**:
      - List of `static_text` presets (optionally filterable via `GET /presets?kind=static_text`).
      - Each card is draggable into the Current Stack.
    - **Lorebooks**:
      - List of lorebooks from `GET /lorebooks`, each represented as a `lorebook` preset card.
      - Cards are draggable into the Current Stack.
    - **MCP Tool Sets**:
      - List of tool-set presets (or MCP servers grouped into presets) from `GET /presets?kind=mcp_tools` / `GET /mcp-servers`.
      - Cards are draggable into the Current Stack.
    - **Built-ins / History**:
      - Shows built-in presets like default system prompt or history strategy (typically non-removable).
      - Dragging them into the Current Stack pins them there as special rows.
  - Quick-create helpers (mainly for static text):
    - "Add text block":
      - Shows inline form for title/description/content.
      - On save:
        - `POST /presets` with `kind = static_text`.
        - `POST /characters/:characterId/prompt-stack` to attach it at the drop/append position using the current role context.

- Right column: **Prompt Stack + Preview**
  - "Current Stack" panel:
    - Header:
      - Title: "Current Stack".
      - Single role selector next to it:
        - Values: `All roles`, `System`, `Assistant`, `User`.
        - Acts as a view filter and as the default role for new `static_text` presets created via "Quick Create".
    - Body:
      - Vertical list of attached prompt presets sorted by `sortOrder`, filtered by the selected role (or all).
      - Each row:
        - Preset title.
        - Badges for role and kind (e.g. `System · Static`, `System · Lorebook`).
        - Drag handle.
        - Remove button.
      - Visual grouping is by role (System / Assistant / User), but data remains a single ordered stack.
  - "Prompt Preview" panel:
    - Read-only textual preview of the messages the backend will see, composed from:
      - Persona.
      - Static text presets.
      - Lorebook/history/tool presets as markers/sections.

Interactions:

- Attach preset:
  - Drag from left list onto stack or use "Add" buttons that create+attach.
  - Calls `POST /characters/:characterId/prompt-stack` with `{ presetId, role, position? }`.
- Reorder stack:
  - Drag-and-drop within stack.
  - On drop, send new ordered IDs:
    - `POST /characters/:characterId/prompt-stack/reorder` with `{ ids }`.
- Remove entry:
  - Click "Remove" on stack item.
  - Calls `DELETE /prompt-presets/:id`.
- Edit preset:
  - Inline edit fields for text presets (title/description/content) and save via `PATCH /presets/:id`.

Validation:

- All validation errors surface from `AppError` responses; e.g. invalid presetId or role.

## 5. Presets (`/presets`)

### 5.1 Purpose

Manage reusable prompt blocks used in character stacks.

### 5.2 UI Structure

- Table/list of presets from `GET /presets`.
  - Filters:
    - Kind (static_text, lorebook, history, mcp_tools).
    - Built-in `true|false` via query (`builtIn`).
    - Title search via `titleContains`.
- Columns:
  - Title.
  - Kind.
  - Description.
  - Built-in flag (badge, non-editable).
- Actions:
  - "New Preset" button:
    - Opens creation form.
    - Calls `POST /presets`.
  - Row actions:
    - "Edit" → opens inline drawer or separate detail view.
    - "Delete":
      - Calls `DELETE /presets/:id`.
      - If the backend throws `AppError("CANNOT_DELETE_BUILT_IN_PRESET", ...)` (or similar), show the message and keep preset.

### 5.3 Preset Editor

- Fields:
  - Title.
  - Description.
  - Kind (select).
  - Content (for `static_text` only).
  - Config (JSON-backed, but the UI can be structured form per kind):
    - `lorebook` kind: select `lorebookId` from `GET /lorebooks`.
    - `history` kind: options for history strategy (e.g. max messages, tokens).
    - `mcp_tools` kind: multi-select of MCP servers from `GET /mcp-servers`.
- Save:
  - New preset: `POST /presets`.
  - Existing preset: `PATCH /presets/:id`.

## 6. Lorebooks (`/lorebooks`)

### 6.1 Lorebooks List

- List from `GET /lorebooks`.
- Columns:
  - Name.
  - Description.
  - `isGlobal` flag.
- Actions:
  - "New Lorebook" → `POST /lorebooks`.
  - Row actions:
    - "Edit" (name, description, global flag) via `PATCH /lorebooks/:id`.
    - "Delete" via `DELETE /lorebooks/:id` (cascades entries).

### 6.2 Lorebook Detail and Entries

Detail view for a single lorebook combining metadata and entries:

- Top: lorebook metadata editor (name, description, global).
- Bottom: entries table for `GET /lorebooks/:id/entries`.
  - Columns:
    - Keywords (chips).
    - Content (first line).
    - Insertion order.
    - Enabled flag.
  - Actions:
    - "New Entry":
      - `POST /lorebooks/:id/entries`.
    - Edit entry:
      - `PATCH /lorebook-entries/:entryId`.
    - Delete entry:
      - `DELETE /lorebook-entries/:entryId`.

## 7. LLM Connections (`/llm-connections`)

### 7.1 Purpose

Manage LLM provider endpoints used by chats.

### 7.2 UI

- List from `GET /llm-connections`.
- Columns:
  - Name.
  - Provider.
  - Base URL.
  - Default model.
  - Enabled flag.
- Actions:
  - "New Connection" → `POST /llm-connections`.
  - Row actions:
    - "Edit" → `PATCH /llm-connections/:id`.
      - Includes fields: name, baseUrl, defaultModel, apiKey, isEnabled.
      - `apiKey` is write-only: never display current value; only accept new value.
    - "Delete":
      - Calls `DELETE /llm-connections/:id`.
      - If backend returns an `AppError` indicating the connection is in use by chats, surface the message and keep the row.

## 8. MCP Servers (`/mcp-servers`)

### 8.1 Purpose

Configure external MCP tool servers used in prompt stacks.

### 8.2 UI

- List from `GET /mcp-servers`.
- Columns:
  - Name.
  - Command + args (shortened).
  - Enabled flag.
- Actions:
  - "New MCP Server" → `POST /mcp-servers`.
  - Row actions:
    - "Edit" → `PATCH /mcp-servers/:id`.
      - Fields: name, command, args (array editor), env (key/value editor), isEnabled.
    - "Delete" → `DELETE /mcp-servers/:id`.
    - Optional:
      - "Test connection" → future `POST /mcp-servers/:id/test`.
      - "List tools" → future `GET /mcp-servers/:id/tools`.

## 9. Runs (`/runs`) – Optional Debug View

### 9.1 Purpose

Operational view of chat runs for debugging orchestration.

### 9.2 UI

- Filter bar:
  - Chat selector.
  - Status filter (pending, running, completed, failed, canceled).
- Table from a future `GET /chat-runs` or `GET /chats/:id/runs` with aggregation:
  - For now, can focus on a per-chat detail page:
    - Inside Chat Workspace, link "View runs" → `/runs?chatId=...` or inline modal that calls `GET /chats/:id/runs`.
- Columns:
  - Started at.
  - Finished at.
  - Status.
  - Token usage (total).
  - Error (if failed).

## 10. Health and Settings

### 10.1 Health (`/health`)

- Simple page that calls `GET /health`.
- Shows:
  - API status (up/down).
  - Database status (via health payload).

### 10.2 Settings (`/settings`)

- Placeholder for app-wide UI settings (theme, editor options, default connection).
- Backed by local storage rather than backend, unless explicit API is added later.

## 11. Component and State Considerations

- Keep state normalized by domain:
  - Characters, chats, messages, presets, lorebooks, connections, servers, runs.
- Avoid ad-hoc special flags on entities (e.g., `chat.busy`); derive from:
  - Pending `/chats/:id/turns` requests in the frontend.
  - `ChatRun` data from `GET /chats/:id/runs`.
- Treat roles as simple per-entry labels on a single unified stack:
  - Do not create separate stacks per role in the data model.
  - Use badges and optional grouping in the UI; editing roles can be added later if truly needed.
- Prefer simple "fetch on view enter" + minimal caching instead of complex global stores initially.
- Surface backend `AppError.code` and `message` directly in UI banners/snackbars to avoid inventing new error semantics.
