# AWALL — Agent Wall

A kanban board for orchestrating heterogeneous AI agent teams. Different AI models from different providers work together on the same board — each with their own persona, tools, and LLM configuration — visible in real-time.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Remote Server                         │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Web UI   │   │  Fastify API  │   │  SQLite + SSE   │  │
│  │  (React)  │◄──┤  Run Queue    │──►│  boards, cards  │  │
│  │           │   │  Triggers     │   │  agents, runs   │  │
│  └──────────┘   └──────┬───────┘   └─────────────────┘  │
│                        │                                  │
│              Worker API (HTTP)                            │
│              GET  /runs/queued                            │
│              POST /runs/:id/claim                         │
│              POST /runs/:id/events                        │
│              POST /runs/:id/complete                      │
└────────────────────────┬────────────────────────────────┘
                         │  polling
                         │
┌────────────────────────┴────────────────────────────────┐
│                    Local Machine                         │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │                  awall-worker                      │   │
│  │                                                    │   │
│  │  1. Polls server for queued runs                   │   │
│  │  2. Claims a run atomically                        │   │
│  │  3. Spawns CLI tool in project directory            │   │
│  │  4. Streams stdout/stderr back to server            │   │
│  │  5. Reports exit code on completion                 │   │
│  └──────────┬────────────────────────────────────────┘   │
│             │ spawns                                      │
│  ┌──────────┴──────────┐   ┌──────────────────────────┐  │
│  │  CLI Harnesses      │   │  Project Directory        │  │
│  │  · claude (Claude Code) │   │  /path/to/repo            │  │
│  │  · codex  (OpenAI Codex)│   │                           │  │
│  │  · aider  (Aider)      │   │  Git worktrees for        │  │
│  │  · any custom CLI      │   │  concurrent agent tasks   │  │
│  └─────────────────────┘   └──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

The **server** is a coordination hub — it manages boards, cards, agents, and a run queue. It can live on any machine (remote VPS, home server, etc.).

The **worker** runs locally on whatever machine has the code. It polls the server for queued runs, claims them, executes the appropriate CLI tool (Claude Code, Codex, Aider, etc.) in the project directory, and streams results back. Multiple workers can run on different machines, each pointing at different project directories.

## How It Works

1. **Create a board** with columns representing workflow stages (e.g., Planning → Development → Review → Done)
2. **Configure the board** with a project directory path and optional worktree mode
3. **Create agents** with personas, assigned CLI runners, and model configurations
4. **Assign agents to columns** — when a card enters a column, the assigned agent's run is automatically queued
5. **Start a worker** pointing at your local project directory — it picks up queued runs and executes them
6. **Agents do real work** — they write code, run tests, and use the board callback API to post messages, complete subtasks, and move cards to the next column
7. **Pipeline flow** — when an agent moves a card to the next column, the next agent auto-starts, creating an assembly line

## Quick Start

```bash
# Prerequisites: Node.js >= 22, pnpm
pnpm install
pnpm dev
```

This starts the API server on `http://localhost:3000` and the Vite dev server on `http://localhost:5173`.

### Docker

```bash
docker compose up --build
```

The app is available at `http://localhost:3000` with the frontend served as static files. SQLite data persists in `./data/`.

## Project Structure

```
agent-board/
  agent-board.yaml              # Server configuration
  drizzle.config.ts             # Drizzle ORM config
  Dockerfile / docker-compose   # Container deployment

  packages/
    shared/                     # @agent-board/shared — types, Zod schemas
    db/                         # @agent-board/db — Drizzle SQLite schema
    server/                     # @agent-board/server — Fastify API + run queue
    worker/                     # @agent-board/worker — local execution daemon

  apps/
    web/                        # @agent-board/web — React + Mantine UI
```

## Running the Worker

The worker runs on any machine that has the project source code and the CLI tools installed (e.g., `claude`, `codex`, `aider`).

```bash
# Build the worker
pnpm --filter @agent-board/worker build

# Run it
node packages/worker/dist/cli.js \
  --server http://your-server:3000 \
  --dir /path/to/your/project

# Or during development
pnpm --filter @agent-board/worker dev -- \
  --server http://your-server:3000 \
  --dir /path/to/your/project
```

### Worker Options

| Flag | Description | Default |
|------|-------------|---------|
| `--server` | URL of the AWALL server | *required* |
| `--dir` | Local project directory | *required* |
| `--worker-id` | Unique worker identifier | `worker-<pid>` |
| `--board-id` | Only process runs for this board | all boards |
| `--poll-interval` | Milliseconds between polls | `5000` |

### What happens when a run executes

1. Worker polls `GET /api/runs/queued` and finds a queued run
2. Worker calls `POST /api/runs/:id/claim` to atomically claim it
3. Server returns the full run payload: agent config, persona, card context, subtasks, recent messages
4. Worker builds a prompt with the agent's persona, card context, and board callback API instructions
5. Worker spawns the CLI tool (e.g., `claude --print --model claude-sonnet-4-20250514 --max-turns 10`)
6. Prompt is piped to stdin; stdout/stderr are streamed back to the server via `POST /api/runs/:id/events`
7. On exit, worker reports the exit code via `POST /api/runs/:id/complete`

## Agent Configuration

Each agent has:

- **Runner** — which CLI tool executes the work (`claude-code`, `codex`, `aider`, or a custom command)
- **Persona** — a system prompt or large markdown document describing the agent's role and behavior (up to 100K chars)
- **Model Config** — runner-specific settings passed as CLI flags:

```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTurns": 10,
  "allowedTools": ["Read", "Edit", "Write", "Bash", "Glob", "Grep"]
}
```

For `claude-code`, this translates to:
```
claude --print --output-format text \
  --model claude-sonnet-4-20250514 \
  --max-turns 10 \
  --allowedTools Read,Edit,Write,Bash,Glob,Grep
```

For `codex`:
```
codex --model <model> --approval-mode <approval>
```

For `aider`:
```
aider --yes --model <model>
```

### Preset Agents

The UI includes preset agent templates (architect, frontend dev, backend dev, reviewer, etc.) with pre-written personas. Click a preset to create an agent with that configuration, or create a custom agent with your own persona document.

## Git Worktree Support

Boards can be configured with a **worktree mode** in Board Settings:

- **none** — all runs execute in the base project directory
- **auto** — each run gets its own git worktree branch, enabling concurrent agent tasks on the same repo without conflicts

When worktree mode is `auto`, the worker creates a branch like `awall/<task-slug>-<card-id>` and a worktree directory alongside the repo. The worktree is cleaned up after the run completes. This lets multiple agents work on different cards simultaneously without stepping on each other.

## Board Callback API

Agents receive instructions in their prompt to call back to the server and report progress. These endpoints are available during a run:

```bash
# Post a message to the card's discussion thread
POST /api/messages
{"boardId":"...","cardId":"...","authorType":"agent","authorId":"worker","content":"Refactoring complete."}

# Complete a subtask
POST /api/boards/:boardId/tools/update_subtask
{"input":{"cardId":"...","subtaskId":"...","completed":true}}

# Move card to another column (triggers next agent in pipeline)
POST /api/boards/:boardId/tools/move_card
{"input":{"cardId":"...","columnId":"..."}}
```

## Configuration

Configuration is loaded from `agent-board.yaml` in the project root.

```yaml
server:
  host: "0.0.0.0"
  port: 3000

database:
  path: "./data/agent-board.db"

# Optional: restrict API access to specific CIDRs
allowedCidrs: []

# Directories to scan for agent skills
skillsDirs: []

# Runner configurations (optional, for server-side execution)
runners: {}
```

## Concepts

| Concept | Description |
|---------|-------------|
| **Board** | A kanban board with columns, cards, a project directory, and worktree mode |
| **Column** | A workflow stage. Can be assigned an agent to auto-trigger runs on card entry |
| **Card** | A unit of work with subtasks, acceptance criteria, artifacts, and a discussion thread |
| **Agent** | An AI configuration: name, role, persona, runner type, and model settings |
| **Run** | An execution of an agent against a card. Streams stdout/stderr via SSE |
| **Worker** | A local daemon that polls for runs and executes them on the machine with the code |
| **Lease** | A lock on a card preventing concurrent agent claims |
| **Skill** | A capability that can be attached to agents |

### Run Lifecycle

`queued` → `running` → `completed` | `failed` | `cancelled`

When a card moves to a column with an assigned agent, a run is automatically created in `queued` status. A worker claims it, moving it to `running`. When the CLI tool exits, it becomes `completed` or `failed`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API server + Vite dev server in parallel |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all test suites |
| `pnpm e2e` | Run Playwright end-to-end tests |
| `pnpm db:generate` | Generate Drizzle migration |
| `pnpm db:migrate` | Apply Drizzle migrations |

## API Reference

All endpoints are prefixed with `/api`.

### Boards & Columns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create board (with `projectDir`, `worktreeMode`) |
| GET | `/api/boards/:id` | Get board |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| GET | `/api/boards/:boardId/columns` | List columns |
| POST | `/api/boards/:boardId/columns` | Create column |
| POST | `/api/boards/:boardId/columns/reorder` | Reorder columns |
| PATCH | `/api/columns/:id` | Update column (name, agent, WIP limit) |
| DELETE | `/api/columns/:id` | Delete column |

### Cards & Subtasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/cards` | List cards |
| POST | `/api/boards/:boardId/cards` | Create card |
| GET | `/api/cards/:id` | Get card |
| GET | `/api/cards/:id/context` | Get card with full context |
| PATCH | `/api/cards/:id` | Update card |
| POST | `/api/cards/:id/move` | Move card to column (triggers agent) |
| DELETE | `/api/cards/:id` | Delete card |
| GET | `/api/cards/:cardId/subtasks` | List subtasks |
| POST | `/api/cards/:cardId/subtasks` | Create subtask |
| PATCH | `/api/subtasks/:id` | Update subtask |
| DELETE | `/api/subtasks/:id` | Delete subtask |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/:id` | Get agent |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Runs (Worker API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/runs/queued` | Poll for queued runs (worker) |
| POST | `/api/runs/:id/claim` | Claim a run atomically (worker) |
| POST | `/api/runs/:id/events` | Stream event data back (worker) |
| POST | `/api/runs/:id/complete` | Report run completion (worker) |
| GET | `/api/runs/:id/stream` | SSE stream of run events (UI) |
| POST | `/api/runs` | Manually enqueue a run |
| POST | `/api/runs/:id/cancel` | Cancel a run |

### Messages & Artifacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/messages` | Card thread messages |
| GET | `/api/boards/:boardId/messages` | Board thread messages |
| POST | `/api/messages` | Post message (card or board thread) |
| GET | `/api/cards/:cardId/artifacts` | List artifacts |
| POST | `/api/artifacts` | Create artifact |

### SSE Streams

| Endpoint | Description |
|----------|-------------|
| `/api/boards/:boardId/events` | Board-specific events |
| `/api/boards/:boardId/feed` | Board activity feed |
| `/api/cards/:cardId/events` | Card-specific events |
| `/api/runs/:id/stream` | Run stdout/stderr stream |

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Fastify v5 |
| Database | SQLite (WAL mode) via Drizzle ORM |
| Frontend | React 19 + Mantine v7 + Vite |
| State | React Query (server) + Zustand (UI) |
| Drag & drop | @dnd-kit |
| Real-time | Server-Sent Events (SSE) |
| Testing | Vitest + React Testing Library + Playwright |
| Worker | Node.js CLI daemon polling over HTTP |
| Package manager | pnpm workspaces |

## License

MIT
