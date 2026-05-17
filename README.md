# AWALL - Agent Wall

AWALL is a local-first control plane for coordinating AI agents on software work.
It combines a Kanban board, agent catalog, run queue, external worker protocol,
and CLI-accessible board tools so heterogeneous agents can collaborate on the
same project.

The important idea: the board is the source of truth. Agents should inspect the
board, claim or receive work through runs, report progress back to the board,
and hand work to other agents by moving cards or creating runs.

## Agent Quick Start

If you are an AI agent pointed at this repository, start here.

1. Read this README.
2. Inspect the actual code before changing behavior. Key paths are listed below.
3. Run verification before reporting completion:

```bash
pnpm -r build
pnpm -r test
```

4. Do not mutate unrelated dirty files. This repo may have local generated
   artifacts or user-owned changes.

If you are an external task agent working on an AWALL run, prefer the `awall`
CLI instead of raw HTTP:

```bash
awall context --server http://localhost:3000 --run <run-id>
awall tools --server http://localhost:3000 --board <board-id> --agent <agent-id>
awall message --server http://localhost:3000 --board <board-id> --card <card-id> --agent <agent-id> --run <run-id> --text "Progress update"
awall call move_card --server http://localhost:3000 --board <board-id> --agent <agent-id> --run <run-id> --input "{\"cardId\":\"<card-id>\",\"columnId\":\"<target-column-id>\"}"
```

Use board tools for board state. Do not write directly to the SQLite database.

## What This Project Does

AWALL lets a user define:

- Boards for projects.
- Columns for workflow stages.
- Cards for tasks.
- Agents with personas, runners, models, and tool permissions.
- Catalog presets that can be inspected and instantiated into live agents.
- A commanding agent for each board.
- Runs that execute agents against cards.

Agents can collaborate by:

- Reading board/card/run context.
- Creating cards, subtasks, agents, and columns.
- Posting board or card messages.
- Updating project documents.
- Queueing runs for other agents.
- Moving cards between columns to trigger downstream agents.

## Current Integration Model

The primary external-agent integration surface is CLI-first.

- `awall-worker` polls the server, claims queued runs, spawns local agent
  harnesses, streams logs, and reports completion.
- `awall` exposes agent-friendly commands for context, tool discovery, tool
  execution, messages, and run heartbeat.
- HTTP endpoints remain available underneath the CLI.
- MCP is not the primary interface yet. It should be built later as a thin
  adapter over the same server-side tool registry.

## Repository Layout

```text
.
|-- agent-board.yaml              # Local server configuration
|-- package.json                  # Root pnpm workspace scripts
|-- apps/
|   `-- web/                      # React + Mantine UI
|-- packages/
|   |-- shared/                   # Shared TypeScript types and Zod schemas
|   |-- db/                       # Drizzle SQLite schema and migrations
|   |-- server/                   # Fastify API, tool registry, run queue
|   `-- worker/                   # awall and awall-worker CLIs
|-- e2e/                          # Playwright tests
`-- docs/                         # Product/use-case notes
```

Key implementation files:

- `packages/server/src/services/tool-registry.ts`
  Central board tool execution path. Permissions, tool-call logging, events, and
  post-action hooks belong here.
- `packages/server/src/llm/tools.ts`
  Tool manifest exposed to LLMs, CLI clients, and future MCP adapters.
- `packages/server/src/services/agent-catalog.ts`
  Built-in and persisted agent catalog presets.
- `packages/server/src/services/orchestrator.ts`
  Board chat commanding-agent flow.
- `packages/server/src/services/multi-agent-chat.ts`
  Multi-agent discussion flow.
- `packages/server/src/runners/*`
  Server-side runner adapters.
- `packages/worker/src/cli.ts`
  `awall` and `awall-worker` command entrypoint.
- `packages/worker/src/runner.ts`
  External worker prompt and harness execution.
- `apps/web/src/pages/BoardPage.tsx`
  Board UI, board settings, commanding-agent selection.
- `apps/web/src/components/card/CardDetailDrawer.tsx`
  Card detail and manual agent run control.

## Core Concepts

### Board

A board represents one project. It has columns, cards, a project directory, a
worktree mode, and an optional commanding agent.

### Column

A workflow stage. A column can have an assigned agent. When a card enters an
agent-owned column, AWALL creates a queued run for that agent.

### Card

A work item. Cards can have subtasks, acceptance criteria, artifacts, messages,
run history, status, priority, and an assignee.

### Agent

A configured live worker identity. Agents have:

- Name and role.
- Persona/system prompt.
- Runner ID, such as `claude-code`, `codex`, `opencode`, `droid`, or `llm`.
- Model config.
- Optional LLM config.
- Tool permissions.

### Agent Catalog Preset

A reusable template for creating agents. Presets are not live workers until they
are instantiated into agents. Commanding agents can inspect presets and create
the agents required for a board or task.

### Commanding Agent

The board-level coordinator. Board chat PM mode runs as the selected commanding
agent when one is configured. By default, this role is allowed to shape the board:
create agents, create columns, create cards, assign agents, update docs, and
queue runs.

### Run

One execution of one agent against one card. Runs move through:

```text
queued -> running -> completed | failed | cancelled
```

### Tool Call

A durable record of a board tool execution. Tool calls capture caller, input,
result, status, error, timing, run/message linkage, and board linkage.

## Running Locally

Prerequisites:

- Node.js 22 or newer.
- pnpm.

Install and run:

```bash
pnpm install
pnpm dev
```

Default URLs:

- API: `http://localhost:3000`
- Web UI: `http://localhost:5173`

Build and test:

```bash
pnpm -r build
pnpm -r test
```

E2E tests:

```bash
pnpm e2e
```

## Configuration

Configuration is read from `agent-board.yaml`.

```yaml
server:
  host: "0.0.0.0"
  port: 3000

database:
  path: "./data/agent-board.db"

# Optional network allowlist. If omitted, all clients are allowed.
# allowedCidrs:
#   - "10.0.0.0/8"
#   - "192.168.0.0/16"

skillsDirs: []

runners: {}
# claude-code:
#   type: "claude-code"
#   command: "claude"
# codex:
#   type: "codex"
#   command: "codex"
```

Security note: the local API is intentionally unauthenticated for LAN/local use.
Use `allowedCidrs` when exposing it beyond localhost or a trusted internal
network.

## Running Workers

Build the worker package:

```bash
pnpm --filter @agent-board/worker build
```

Run a worker against a project directory:

```bash
awall-worker --server http://localhost:3000 --dir /path/to/project
```

Equivalent through the combined CLI:

```bash
awall worker --server http://localhost:3000 --dir /path/to/project
```

Useful worker flags:

| Flag | Meaning | Default |
| --- | --- | --- |
| `--server` | AWALL server URL | required |
| `--dir` | Local project directory where the agent runs | required |
| `--worker-id` | Stable worker identity | `worker-<pid>` |
| `--board-id` | Only process runs for one board | all boards |
| `--poll-interval` | Poll interval in milliseconds | `5000` |

## Agent CLI Contract

External agents should prefer `awall` commands.

Get a versioned context envelope:

```bash
awall context --server http://localhost:3000 --run <run-id>
```

List tools available to an agent:

```bash
awall tools --server http://localhost:3000 --board <board-id> --agent <agent-id>
```

Call a tool:

```bash
awall call <tool-name> \
  --server http://localhost:3000 \
  --board <board-id> \
  --agent <agent-id> \
  --run <run-id> \
  --input "{\"key\":\"value\"}"
```

Post a card message:

```bash
awall message \
  --server http://localhost:3000 \
  --board <board-id> \
  --card <card-id> \
  --agent <agent-id> \
  --run <run-id> \
  --text "Implemented the API route and started tests."
```

Send a run heartbeat:

```bash
awall heartbeat --server http://localhost:3000 --run <run-id> --worker-id <worker-id>
```

## Important Board Tools

The canonical tool manifest lives in `packages/server/src/llm/tools.ts`.

Common tools:

- `get_board_context`
- `list_columns`
- `create_column`
- `list_cards`
- `create_card`
- `update_card`
- `move_card`
- `create_subtask`
- `complete_subtask`
- `update_subtask`
- `send_message`
- `handoff_to_agent`
- `list_agent_columns`
- `read_project_doc`
- `update_project_doc_section`
- `list_agent_presets`
- `inspect_agent_preset`
- `recommend_agents_for_goal`
- `create_agent_from_preset`
- `assign_agent_to_column`
- `create_run`

Tool behavior rules:

- Tool execution must go through `toolRegistry.execute`.
- Tool permissions are enforced server-side.
- Denied calls are logged.
- `move_card` and `handoff_to_agent` trigger column-entry automation.
- `create_run` queues the run through the server run queue.

## Tool Permissions

Agents can have `toolPermissions`.

Example:

```json
{
  "allowedTools": [
    "list_cards",
    "get_board_context",
    "send_message",
    "update_subtask",
    "move_card"
  ],
  "deniedTools": ["create_agent_from_preset"]
}
```

If `allowedTools` is absent or empty, all tools are allowed unless explicitly
listed in `deniedTools`.

## API Overview

All API routes are prefixed with `/api`.

Core routes:

```text
GET    /api/health

GET    /api/boards
POST   /api/boards
GET    /api/boards/:id
PATCH  /api/boards/:id

GET    /api/boards/:boardId/columns
POST   /api/boards/:boardId/columns
PATCH  /api/columns/:id

GET    /api/boards/:boardId/cards
POST   /api/boards/:boardId/cards
PATCH  /api/cards/:id
POST   /api/cards/:id/move

GET    /api/agents
POST   /api/agents
PATCH  /api/agents/:id

GET    /api/agent-catalog
GET    /api/agent-catalog/:id
POST   /api/agent-catalog
POST   /api/agent-catalog/:id/instantiate

GET    /api/boards/:boardId/tools
POST   /api/boards/:boardId/tools/:toolName

POST   /api/boards/:boardId/orchestrate
POST   /api/boards/:boardId/multi-chat

POST   /api/runs
GET    /api/runs/queued
GET    /api/runs/:id
GET    /api/runs/:id/context
POST   /api/runs/:id/claim
POST   /api/runs/:id/heartbeat
POST   /api/runs/:id/events
POST   /api/runs/:id/complete
POST   /api/runs/:id/cancel
```

SSE routes:

```text
GET /api/boards/:boardId/events
GET /api/boards/:boardId/feed
GET /api/cards/:cardId/events
GET /api/runs/:id/stream
```

## Database And Migrations

Database package:

```text
packages/db
```

Schema files:

```text
packages/db/src/schema
```

Migrations:

```text
packages/db/src/migrations
```

Generate a migration after schema changes:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

The app uses SQLite with WAL mode. Runtime data defaults to `./data/`, which is
ignored by git.

## Development Workflow For Agents

When changing this repo:

1. Check worktree state:

```bash
git status --short
```

2. Read the relevant code path before editing.
3. Keep edits scoped.
4. Prefer existing patterns and service boundaries.
5. Add or update focused tests when behavior changes.
6. Run:

```bash
pnpm -r build
pnpm -r test
```

7. Report what changed, what passed, and any remaining risk.

Do not:

- Reset or revert user changes without explicit instruction.
- Edit generated runtime artifacts unless asked.
- Bypass the tool registry for board tool behavior.
- Add a second tool execution path for MCP or another interface.

## Tech Stack

| Area | Technology |
| --- | --- |
| API | Fastify |
| Database | SQLite + Drizzle ORM |
| Frontend | React + Mantine + Vite |
| Server state | React Query |
| UI state | Zustand |
| Realtime | Server-Sent Events |
| Worker | Node.js CLI |
| Tests | Vitest, React Testing Library, Playwright |
| Package manager | pnpm workspaces |

## Status Of The Architecture

Current strengths:

- Tool calls now have a single registry path.
- External agents can use CLI commands instead of memorizing raw HTTP.
- Commanding agents are configurable per board.
- Catalog presets are separate from live agent instances.
- Tool calls are persisted for audit/debugging.

Known follow-ups:

- MCP should be added as a thin adapter over the tool registry.
- Worker cancellation is exposed through heartbeat, but long-running spawned
  processes still need stronger cooperative cancellation behavior.
- Agent catalog can grow richer with health, cost, capabilities, and provider
  metadata.
- Approval gates for destructive repo actions and PR creation should remain
  explicit.

