# Frontend Architecture

- Stack: React 19 + TypeScript + Vite 7. Entrypoint `src/main.tsx` mounts `App` inside `BrowserRouter`.
- Layout shell: `src/components/layout/AppLayout.tsx` owns sidebar nav + header; routes render inside `<Outlet />` via React Router.
- Routing map (see `src/App.tsx`): `/chat`, `/characters`, `/characters/:characterId`, `/presets`, `/lorebooks`, `/lorebooks/:lorebookId`, `/llm-connections`, `/mcp-servers`, `/runs`, `/health`, `/settings`. `/` redirects to `/chat`.
- Data flow: each feature uses its own `useState`/`useEffect` and calls typed API wrappers from `src/api/**`. No global store. Keep functions shallow; avoid deep nesting.
- HTTP: `src/api/httpClient.ts` sets `baseURL` from `import.meta.env.VITE_API_BASE_URL ?? "/api"`; `unwrap` normalizes axios errors into `ApiError` (use the `message` for UI).
- Env/proxy: dev proxy lives in `vite.config.ts` (rewrites `/api` to `http://localhost:3000`). Set `VITE_API_BASE_URL` to an absolute URL in prod to bypass the proxy.
- i18n: `src/i18n.ts` with `react-i18next`, languages `en` and `zh`, preference stored in `wind-st-language` (localStorage). Add strings to both dictionaries.
- Styling: dark-first theme via CSS variables in `src/index.css`; layout components in `src/App.css`. Reuse variables instead of hardcoded colors.
- Drag and drop: `@dnd-kit` powers prompt stack ordering (`src/features/promptBuilder/PromptStackList.tsx`) and lorebook entry ordering (`src/features/lorebooks/LorebookEntriesTable.tsx`). Preserve stable `id` values when reordering; backend expects ordered `ids` arrays.
- History/config: chat history toggles live in `src/api/historyConfig.ts`; per-chat LLM config in `src/api/chats.ts`. UI should load these when a chat is selected and save with minimal coupling.
- Build/lint: `npm run dev`, `npm run build` (runs `tsc -b` first), `npm run preview`, `npm run lint`.
- Simplicity rules: keep components small, avoid third-level indentation, and eliminate special-case branches by fixing data shape instead of adding booleans.
