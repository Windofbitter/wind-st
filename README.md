# wind-st

SillyTavern-inspired chat stack with prompt stacking, lorebooks, and Model Context Protocol (MCP) tools baked in.

## What this is

- Character-first chats: separate histories and configs per character and per chat.
- Prompt stacks: ordered presets combining static text, lorebooks, chat history, and MCP tool wiring.
- Tool-aware turns: MCP servers registered once, tools exposed to the LLM per chat with iteration and timeout limits.
- Pluggable LLMs: OpenAI-compatible connections, per-chat model/temperature/token/tool limits.
- Runs and events: tracked chat runs, live chat events, and retry support.

## Tech stack

- **Backend**: Fastify + TypeScript, SQLite stores, OpenAI-compatible LLM client, MCP adapter.
- **Frontend**: React + Vite + TypeScript, drag-and-drop prompt builder and chat UI.
- **Data**: SQLite by default; schema kept simple for future Postgres path.

## Getting started

Requirements: Node.js 20+ and npm.

Windows (one-shot dev)

- Run `dev.bat` from the repo root. It wipes `backend/node_modules` and `frontend/node_modules`, runs `npm ci`, then opens two terminals.
- Optional ports: `dev.bat <backendPort> <frontendPort>` (defaults 3000 / 5173). The script auto-sets `VITE_API_BASE_URL`/proxy to the backend port.
- Backend at http://localhost:<backendPort>, frontend at http://localhost:<frontendPort>.

Manual setup (any OS)

```bash
# backend
npm install --prefix backend
npm run dev --prefix backend

# frontend (separate shell)
npm install --prefix frontend
npm run dev --prefix frontend
```

Build for production

```bash
npm run build --prefix backend
npm run build --prefix frontend
```

## Docs

- Data entities: `docs/entities.md`
- Tech stack overview: `docs/tech-stack.md`
- Backend design (ChatRun, ChatOrchestrator): `docs/backend-design.md`
- Frontend docs index (architecture, API shapes, flows): `docs/frontend/README.md`

---

# wind-st（中文）

受 SillyTavern 启发的聊天系统，内置提示栈、世界书，并接入 MCP 工具。

## 项目概览

- 角色与会话分离：每个角色、每个会话拥有独立的历史与配置。
- 提示栈：按顺序组合静态文本、世界书、历史记录与 MCP 工具绑定。
- 工具回路：统一注册 MCP 服务器，为会话暴露工具，并设置迭代次数和超时限制。
- 可插拔 LLM：OpenAI 兼容连接，每个会话可配置模型、温度、输出 Token、工具迭代与超时。
- 运行追踪：记录每次聊天运行，支持实时事件与重试。

## 技术栈

- **后端**：Fastify + TypeScript，默认 SQLite 存储，OpenAI 兼容 LLM 客户端，MCP 适配。
- **前端**：React + Vite + TypeScript，提供拖拽式提示构建与聊天界面。
- **数据**：默认使用 SQLite，设计上可平滑迁移到 Postgres。

## 快速开始

环境需求：Node.js 20+，npm。

Windows 一键启动

- 在仓库根目录运行 `dev.bat`。它会清理 `backend/node_modules` 和 `frontend/node_modules`，执行 `npm ci`，然后打开两个终端。
- 可选端口：`dev.bat <backendPort> <frontendPort>`（默认为 3000 / 5173）。脚本会自动设置 `VITE_API_BASE_URL`/proxy 指向对应后端端口。
- 后端：http://localhost:<backendPort>，前端：http://localhost:<frontendPort>。

手动方式（任意系统）

```bash
# 后端
npm install --prefix backend
npm run dev --prefix backend

# 前端（新终端）
npm install --prefix frontend
npm run dev --prefix frontend
```

生产构建

```bash
npm run build --prefix backend
npm run build --prefix frontend
```

## 文档

- 数据实体：`docs/entities.md`
- 技术栈概览：`docs/tech-stack.md`
- 后端设计（ChatRun、ChatOrchestrator）：`docs/backend-design.md`
- 前端文档索引（架构、API 结构、关键流程）：`docs/frontend/README.md`
