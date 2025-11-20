# Wind ST Frontend

React + TypeScript + Vite UI for the Wind ST project (SillyTavern-like prompt-builder/chat client). Routes cover chat, characters, presets, lorebooks, MCP servers, runs, health, and settings.

## Quick start

- Prereqs: Node 18+.
- Backend: `cd ../backend && npm install && npm run dev` (Fastify on port 3000 by default).
- Frontend: `cd frontend && npm install && npm run dev` then open the Vite URL (proxy sends `/api` to `http://localhost:3000`).
- Prod build: `npm run build` then `npm run preview` to sanity-check the bundle.

## Environment / API

- `VITE_API_BASE_URL` (optional): override the API origin. Defaults to `/api`; dev proxy lives in `vite.config.ts`. Set an absolute URL in production to bypass the proxy.
- HTTP client: `src/api/httpClient.ts` wraps axios, applies the base URL, and converts responses to `ApiError` with a human-readable message.

## Scripts

- `npm run dev` – Vite dev server with HMR.
- `npm run build` – type-check (`tsc -b`) then build.
- `npm run preview` – serve the built assets locally.
- `npm run lint` – ESLint over the repo.

## Project layout

- `src/api/**` – typed REST wrappers for backend endpoints (`unwrap` catches axios and throws `ApiError`).
- `src/features/**` – page-level features keyed to routes (chat, characters, presets, lorebooks, llm connections, mcp servers, runs, health, settings).
- `src/features/promptBuilder/**` – drag-and-drop prompt stack builder (`@dnd-kit`), including lorebook and MCP attachment sections.
- `src/components/layout/AppLayout.tsx` – shell, navigation, and header.
- `src/i18n.ts` – `react-i18next` setup, languages `en`/`zh`, preference stored in `wind-st-language` (localStorage).
- `src/index.css` and `src/App.css` – global styling (dark theme variables) and layout.

## Working conventions

- No global state lib; each feature owns its own `useState`/`useEffect` and calls the API layer directly. Keep functions short and avoid deep nesting.
- When calling the backend, use the API wrappers and surface `ApiError.message` to users; keep forms resilient to partial failures (reload lists after mutations).
- Drag-and-drop lists (`PromptStackList`, `LorebookEntriesTable`) depend on stable `id` fields; preserve them when reordering.
- Internationalization: add strings to both language dictionaries in `src/i18n.ts`; UI picks language from localStorage or browser default.
- UI is dark-first; new components should respect the CSS variables rather than hardcoding colors.

## Typical dev loop

1) Create an LLM connection, character, preset(s), and lorebook entries via the UI.
2) Attach presets/lore/MCP servers in the Prompt Builder tab for the character.
3) Start a chat, tweak per-chat LLM config/history settings, and verify prompt preview + tool list load correctly.

If you break any of these flows, you broke userspace—fix that before adding new toys.
