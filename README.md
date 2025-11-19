# wind-st

SillyTavern-like chat frontend/backend focused on prompt engineering, lorebooks, and MCP tool integration.

The goal is to let creators build rich character experiences by composing reusable prompt presets (static text, lorebooks, history, MCP tools) and ordering them per character, then running conversations against OpenAI-compatible LLM endpoints.

## Features (planned)

- Character-centric chats with stored message history.
- Lorebooks and lore entries with keyword triggers and insertion order.
- Preset / PromptPreset model for building ordered prompt stacks.
- MCP tool integration configured via presets and per-character settings.
- Configurable LLM connections and per-chat LLM settings.
- Orchestrated chat turns with per-chat runs and basic concurrency (“chat busy”) semantics.

## Tech Stack

- **Database**: SQLite first, with a path to PostgreSQL via ORM.
- **Backend**: Fastify + TypeScript, integrating MCP and LLM calls.
- **Frontend**: React + Vite for a drag-and-drop prompt builder UI.

## Docs

- Data entities: `docs/entities.md`
- Tech stack overview: `docs/tech-stack.md`
- Backend design (including ChatRun and ChatOrchestrator): `docs/backend-design.md`
