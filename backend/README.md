# Backend (Fastify + SQLite)

This folder contains the backend API and data layer for the project. It is a small, synchronous TypeScript service built on:

- Fastify (HTTP server)
- better-sqlite3 (synchronous SQLite)
- Vitest (tests)

The design is deliberately simple: clear data structures, explicit repositories, and thin services with a few business rules.

## Quick start

```bash
cd backend
npm install

# Dev server (Fastify, auto-reload via ts-node-dev)
npm run dev

# Build + run compiled server
npm run build
npm start
```

By default the server listens on `0.0.0.0:3000` (or `PORT` env var).

## Configuration

Config is loaded from `config.json` in the current working directory (`process.cwd()`):

- Example config: `backend/config.json`

```json
{
  "database": {
    "sqlitePath": "./data/app.db"
  }
}
```

When you run scripts from `backend/` (e.g. `npm run dev`), the example `backend/config.json` is used by default. In other environments, ensure a compatible `config.json` exists in the working directory.

The config is normalized in `src/config.ts` and exposed as:

- `appConfig.database.sqlitePath` (absolute path).

## Git layout

- `src/core/entities/*` – Plain TypeScript domain entities (no logic).
- `src/core/ports/*` – Repository interfaces (ports) for each domain.
- `src/application/services/*` – Application services, built on the ports.
- `src/application/orchestrators/*` – Higher-level orchestration (e.g., chat turns).
- `src/application/errors/AppError.ts` – Small error type with stable error codes used across the application.
- `src/infrastructure/sqlite/*` – SQLite implementations:
  - `db.ts` – `openDatabase()` + `runMigrations` call.
  - `migrations.ts` – Creates tables + indexes idempotently.
  - `*RepositorySqlite.ts` – One file per repository implementation.
- `src/infrastructure/http/app.ts` – Fastify app factory: wires DB, repositories, services, routes and error handling.
- `src/infrastructure/http/routes/*` – HTTP route modules (e.g. health, characters).
- `src/infrastructure/http/errorHandler.ts` – Global Fastify error + not-found handler mapping `AppError` to HTTP responses.
- `src/server.ts` – Process entrypoint that calls `buildApp()` and starts listening.

## Database and migrations

The backend uses a single SQLite database with foreign keys enabled:

- `openDatabase()` (`src/infrastructure/sqlite/db.ts`):
  - Ensures parent directory for the DB file exists.
  - Opens the DB via better-sqlite3.
  - Enables `PRAGMA foreign_keys = ON`.
  - Runs `runMigrations(db)`.

`runMigrations` (`src/infrastructure/sqlite/migrations.ts`) is a single idempotent migration that:

- Creates tables for:
  - `characters`, `chats`, `messages`
  - `presets`, `prompt_presets`
  - `lorebooks`, `lorebook_entries`
  - `mcp_servers`
  - `llm_connections`, `chat_llm_configs`
  - `chat_runs`
- Sets up indexes for common lookups.
- Enables cascade behavior at the DB level where appropriate:
  - `characters` → `chats` → `messages` (ON DELETE CASCADE).
  - `lorebooks` → `lorebook_entries` (ON DELETE CASCADE).
  - `characters` / `presets` → `prompt_presets` (ON DELETE CASCADE).

Messages are indexed by `chat_id`; we do not index directly on `rowid` to avoid SQLite quirks.

## Repositories (SQLite)

Each `*RepositorySqlite` file implements its corresponding port from `src/core/ports`.

Patterns:

- Constructors take a `SqliteDatabase` (better-sqlite3 instance).
- `create` methods:
  - Generate IDs with `crypto.randomUUID()`.
  - Apply default flags (e.g. `builtIn`, `isGlobal`, `isEnabled`).
  - Encode flexible fields as JSON where appropriate:
    - `LorebookEntry.keywords` → JSON string
    - `Message.toolCalls` / `toolResults` → JSON
    - `MCPServer.args` / `env` → JSON
    - `Preset.config` → JSON
- `list` methods:
  - Accept typed filters (`CharacterFilter`, `PresetFilter`, etc.).
  - Build `WHERE` clauses dynamically and order sensibly.
- `update` methods:
  - Dynamically construct `SET` clauses from provided patch fields.
  - If the patch is empty, they return the current row unchanged.
  - Return `null` when no row was affected.

### LLM connection deletion guard

`LLMConnectionRepositorySqlite.delete` has explicit protection:

- Schema: `chat_llm_configs.llm_connection_id` is a foreign key to `llm_connections.id` with no `ON DELETE` clause (SQLite `RESTRICT` behavior).
- Behavior:
  - If a connection is referenced by any `chat_llm_configs` row:
    - The DB raises a foreign key error.
    - The repository catches it and throws an `AppError` with a clear message:
      - `CANNOT_DELETE_LLM_CONNECTION_IN_USE` /
        `"Cannot delete LLM connection: it is used by one or more chats. Disable it or move those chats to another connection first."`
  - Result:
    - No dangling configs.
    - Normal way to retire a connection is `updateConnection(id, { isEnabled: false })`.

If you ever add a “force delete” path, keep it separate and explicit; do not relax this invariant in the default `delete` call.

### Chat runs and orchestration

`ChatRun` records a single orchestrated LLM turn for a chat:

- `ChatRun` rows live in `chat_runs`, keyed by `chat_id`.
- Each run links the initiating `user` message and the final `assistant` message and tracks status/usage.

`ChatOrchestrator` (`src/application/orchestrators/ChatOrchestrator.ts`):

- Is the only layer that:
  - Calls the `LLMClient` (currently implemented by `OpenAILLMClient`).
  - Appends assistant messages as part of an orchestrated turn.
- Enforces per-chat concurrency via an in-memory lock:
  - At most one `handleUserMessage(chatId, ...)` may run for a given chat at any time.
  - A second concurrent call fails fast with a “Chat is busy” error.
- Uses `ChatRunRepository` to:
  - Create a `running` run when a user turn starts.
  - Mark the run `completed`/`failed` with timestamps, assistant message ID and token usage.

The `LLMClient` port abstracts the actual LLM API; the default implementation is `OpenAILLMClient` (`src/infrastructure/llm/OpenAILLMClient.ts`), which uses the official `openai` SDK in “OpenAI-compatible” mode.

For `openai_compatible` connections, `OpenAILLMClient` expects the per-connection `apiKey` field on `LLMConnection` to be set; there is no environment-variable fallback. The connection’s `baseUrl` and `model` are taken from the `LLMConnection` and `ChatLLMConfig` rows for the chat.

## Services (application layer)

Services in `src/application/services` are thin, and primarily:

- Forward CRUD operations to repositories.
- Enforce a few core business rules.

Key rules:

- `PresetService`:
  - `deletePreset(id)`:
    - If preset is built-in (`builtIn === true`), throws:
      - `"Cannot delete built-in preset"`.
    - Otherwise deletes it (FK cascade clears related `prompt_presets`).

- `PromptStackService`:
  - Validates that `characterId` and `presetId` exist before attaching.
  - Manages `PromptPreset.sortOrder`:
    - New attach without `position` → appended at the end.
    - Attach with `position`:
      - Inserts at that index.
      - Increments `sortOrder` for existing entries at or after it.
    - Detach:
      - Removes the entry and compacts `sortOrder` of subsequent entries.
    - Reorder:
      - Requires the reorder list to contain *all* existing IDs.
      - Validates that every ID belongs to that character.
      - Rewrites `sortOrder` to match the new order.

- `LorebookService`:
  - `createLorebookEntry(lorebookId, data)`:
    - Throws `AppError("LOREBOOK_NOT_FOUND", "Lorebook not found")` if the lorebook does not exist.

- `ChatService`:
  - `createChat(data, initialConfig?)`:
    - Creates the chat.
    - Optionally creates an initial `ChatLLMConfig` wired with the chat’s ID.
  - `deleteChat(id)`:
    - Deletes the chat.
    - Deletes the associated `ChatLLMConfig` via `deleteByChatId`.

Most other services (`CharacterService`, `MessageService`, `MCPServerService`, `LLMConnectionService`) are straightforward pass-through layers over their repositories.

## HTTP API and error handling

The HTTP API is a thin adapter over the application layer:

- `buildApp()` (`src/infrastructure/http/app.ts`):
  - Opens the SQLite DB.
  - Wires repositories and application services.
  - Registers routes and the global error handler on a Fastify instance.
- Routes in `src/infrastructure/http/routes/*`:
  - Expose domain operations over HTTP (e.g. `/health`, `/characters`).
  - Stay small and focused: parse/validate input, call a service, return JSON.

Errors are handled centrally via `AppError`:

- Domain and infrastructure code throw `AppError` with a stable `code` and default HTTP status.
- The global Fastify `setErrorHandler` (`src/infrastructure/http/errorHandler.ts`):
  - Detects `AppError` and returns a JSON body:

    ```jsonc
    {
      "error": {
        "code": "CHARACTER_NOT_FOUND",
        "message": "Character not found",
        "details": { /* optional */ }
      }
    }
    ```

  - Maps Fastify validation errors to `code: "VALIDATION_ERROR"`.
  - Maps unknown errors to `code: "INTERNAL_ERROR"` with HTTP 500.

Route handlers should not catch and rewrap `AppError`; they just throw and let the global handler map to HTTP. This keeps the HTTP layer simple, consistent, and easy to extend as new endpoints are added.

## Testing

All tests are Vitest (Node environment) and run under the `backend/` package:

- From the root of the repository:

  ```bash
  npm test
  ```

- Or directly inside `backend/`:

  ```bash
  cd backend
  npm test
  ```

### Test layout

- `tests/integration/*`:
  - Integration tests against real SQLite (in-memory).
  - Use `createTestDatabase()` from `tests/utils/testDb`:
    - Opens `":memory:"` DB with better-sqlite3.
    - Enables foreign keys.
    - Runs `runMigrations(db)` directly (no `config.json`).
  - One file per repository:
    - `CharacterRepositorySqlite.test.ts`
    - `ChatRepositorySqlite.test.ts`
    - `ChatLLMConfigRepositorySqlite.test.ts`
    - `LLMConnectionRepositorySqlite.test.ts`
    - `LorebookRepositorySqlite.test.ts`
    - `LorebookEntryRepositorySqlite.test.ts`
    - `MCPServerRepositorySqlite.test.ts`
    - `MessageRepositorySqlite.test.ts`
    - `PresetRepositorySqlite.test.ts`
    - `PromptPresetRepositorySqlite.test.ts`
  - Each exercises:
    - CRUD behavior.
    - JSON encoding/decoding for relevant fields.
    - Filter behavior (where applicable).
    - Foreign key cascades (characters, lorebooks, prompt presets).
    - Edge cases like “empty patch” updates.

- `tests/services/*`:
  - Pure TypeScript tests for application services.
  - Use in-memory fake repositories from:
    - `tests/services/fakeRepositories.ts`
  - Cover business rules:
    - Built-in preset deletion protection.
    - Prompt stack ordering, detach, and reorder invariants.
    - Lorebook entry creation requires an existing lorebook.
    - Chat creation with/without initial LLM config.
    - Message pagination is passed through.
    - MCP server enable/disable behavior.

### Adding new tests

- For new repositories:
  - Create a new file in `tests/integration/`.
  - Use `createTestDatabase()` and the real SQLite implementation.
  - Test: `create → get → list → update → delete`, plus any JSON fields and FK behavior.

- For new service logic:
  - Prefer adding to `tests/services/*` using fake repositories.
  - Only hit SQLite from services if you are explicitly testing integration behavior.

Keep test files small and focused (ideally under ~300–400 lines) and share helpers instead of duplicating setup logic.

## Adding new domains

The typical path for a new domain is:

1. Add entity to `src/core/entities`.
2. Define a repository port in `src/core/ports`.
3. Implement a SQLite repository in `src/infrastructure/sqlite`.
4. Add an application service in `src/application/services`.
5. Add:
   - Integration tests for the SQLite repository.
   - Service tests with a fake repository.
6. Wire the service into `src/infrastructure/http/app.ts` and expose HTTP endpoints via a new route module in `src/infrastructure/http/routes`.

Follow the existing repositories and services as templates, and keep the data structures and control flow as simple as possible. When you feel tempted to add another abstraction layer, add a test instead.***
