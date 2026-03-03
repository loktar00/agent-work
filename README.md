# Agent Board

A local-first Kanban board for multi-agent software delivery. AI runners (Claude Code, Droid, Codex, OpenCode) collaborate on cards through a REST API, while humans observe, approve, and manage work through a React UI.

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
  agent-board.yaml              # Configuration file
  drizzle.config.ts             # Drizzle ORM config
  Dockerfile                    # Multi-stage build
  docker-compose.yml            # Single-command startup

  packages/
    shared/                     # @agent-board/shared — types, enums, Zod schemas
    db/                         # @agent-board/db — Drizzle SQLite schema (15 tables)
    server/                     # @agent-board/server — Fastify v5 REST API

  apps/
    web/                        # @agent-board/web — React + Mantine v7 frontend
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API server + Vite dev server in parallel |
| `pnpm dev:server` | Start API server only |
| `pnpm dev:web` | Start Vite dev server only |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all test suites |
| `pnpm db:generate` | Generate Drizzle migration |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Configuration

Configuration is loaded from `agent-board.yaml` in the project root.

```yaml
server:
  host: "0.0.0.0"              # Bind address (default: 0.0.0.0)
  port: 3000                   # Listen port (default: 3000)

database:
  path: "./data/agent-board.db" # SQLite database path

# Optional: restrict API access to specific CIDRs
allowedCidrs: []
#   - "10.0.0.0/8"
#   - "192.168.0.0/16"
#   - "172.16.0.0/12"

# Directories to scan for agent skills
skillsDirs: []
#   - "/path/to/skills"

# Runner configurations
runners: {}
#   claude-code:
#     type: "claude-code"
#     command: "claude"
#   droid:
#     type: "droid"
#     command: "droid"
```

### Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `server.host` | string | `"0.0.0.0"` | Server bind address |
| `server.port` | number | `3000` | Server listen port |
| `database.path` | string | `"./data/agent-board.db"` | Path to SQLite database file |
| `allowedCidrs` | string[] | `[]` | CIDR ranges allowed to access the API. Empty = no restriction |
| `skillsDirs` | string[] | `[]` | Directories to scan for skill definitions |
| `runners` | object | `{}` | Runner adapter configurations (see Runners section) |

## Runners

Agent Board supports four runner adapters that execute AI agents on cards:

| Runner | Type | Description |
|--------|------|-------------|
| Claude Code | `claude-code` | Claude Code CLI runner |
| Droid | `droid` | Droid runner |
| Codex | `codex` | Codex runner |
| OpenCode | `opencode` | OpenCode runner |

Configure runners in `agent-board.yaml`:

```yaml
runners:
  my-claude:
    type: "claude-code"
    command: "claude"        # CLI command to invoke
    args: []                 # Optional CLI arguments
    env: {}                  # Optional environment variables
```

When a card moves to a column with an assigned agent, a run is automatically enqueued using that agent's configured runner. The run queue processes up to 2 concurrent runs by default.

## Concepts

- **Board** — A Kanban board containing columns and cards
- **Column** — A stage in the workflow. Can be assigned an agent to auto-trigger runs when cards enter
- **Card** — A unit of work with subtasks, acceptance criteria, artifacts, and a discussion thread
- **Agent** — An AI runner configuration with a name, role, persona, and attached skills
- **Run** — An execution of an agent against a card. Streams stdout/stderr events via SSE
- **Lease** — A lock on a card preventing concurrent agent claims
- **Skill** — A capability that can be attached to agents
- **Secret** — An encrypted value stored with AES-256-GCM

### Card Statuses

`backlog` | `todo` | `in_progress` | `in_review` | `done` | `archived`

### Card Priorities

`low` | `medium` | `high` | `critical`

### Run Lifecycle

`queued` &rarr; `running` &rarr; `completed` | `failed` | `cancelled`

## API Reference

All endpoints are prefixed with `/api`. The server returns JSON responses.

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create board |
| GET | `/api/boards/:id` | Get board |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |

### Columns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/columns` | List columns |
| POST | `/api/boards/:boardId/columns` | Create column |
| POST | `/api/boards/:boardId/columns/reorder` | Reorder columns |
| GET | `/api/columns/:id` | Get column |
| PATCH | `/api/columns/:id` | Update column |
| DELETE | `/api/columns/:id` | Delete column |

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/cards` | List cards |
| POST | `/api/boards/:boardId/cards` | Create card |
| GET | `/api/cards/:id` | Get card |
| GET | `/api/cards/:id/context` | Get card with full context (subtasks, criteria, messages, artifacts) |
| PATCH | `/api/cards/:id` | Update card |
| POST | `/api/cards/:id/move` | Move card to column (triggers automation if target column has agent) |
| DELETE | `/api/cards/:id` | Delete card |

### Subtasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/subtasks` | List subtasks |
| POST | `/api/cards/:cardId/subtasks` | Create subtask |
| PATCH | `/api/subtasks/:id` | Update subtask |
| DELETE | `/api/subtasks/:id` | Delete subtask |

### Acceptance Criteria

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/acceptance-criteria` | List criteria |
| POST | `/api/cards/:cardId/acceptance-criteria` | Create criterion |
| PATCH | `/api/acceptance-criteria/:id` | Update criterion |
| DELETE | `/api/acceptance-criteria/:id` | Delete criterion |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/:id` | Get agent |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| GET | `/api/agents/:id/skills` | List agent's skills |
| POST | `/api/agents/:id/skills` | Attach skill |
| DELETE | `/api/agents/:id/skills/:skillId` | Detach skill |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List skills |
| POST | `/api/skills` | Create skill |
| GET | `/api/skills/:id` | Get skill |
| PATCH | `/api/skills/:id` | Update skill |
| DELETE | `/api/skills/:id` | Delete skill |
| POST | `/api/skills/scan` | Scan configured directories for skills |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/messages?limit=50` | List card thread messages |
| GET | `/api/boards/:boardId/messages?limit=50` | List project thread messages |
| POST | `/api/messages` | Create message (set `cardId` for card thread, omit for board thread) |

### Artifacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/artifacts` | List artifacts |
| GET | `/api/artifacts/:id` | Get artifact |
| POST | `/api/artifacts` | Create artifact |
| DELETE | `/api/artifacts/:id` | Delete artifact |

Artifact types: `log` | `file` | `url` | `test_result` | `diff`

### Runs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/runs` | List runs for card |
| GET | `/api/boards/:boardId/runs` | List runs for board |
| GET | `/api/runs/:id` | Get run |
| POST | `/api/runs` | Create and enqueue run |
| PATCH | `/api/runs/:id` | Update run |
| POST | `/api/runs/:id/cancel` | Cancel run |
| GET | `/api/runs/:id/events` | List run events |
| POST | `/api/runs/:id/events` | Add run event |
| GET | `/api/runs/:id/stream` | SSE stream of run events |
| GET | `/api/runners` | List available runners |

### Leases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/:cardId/lease` | Get active lease for card |
| POST | `/api/leases/claim` | Claim lease on card (409 if already claimed) |
| POST | `/api/leases/:id/renew` | Renew lease |
| POST | `/api/leases/:id/release` | Release lease |

### Secrets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/secrets` | List secrets (names only, no values) |
| POST | `/api/secrets` | Create secret (encrypted with AES-256-GCM) |
| DELETE | `/api/secrets/:id` | Delete secret |

### Audit Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/audit?limit=100` | List audit entries |

### SSE Streams

| Endpoint | Description |
|----------|-------------|
| `/api/events/boards` | Global board-level events |
| `/api/boards/:boardId/events` | Board-specific events |
| `/api/boards/:boardId/feed` | Board activity feed |
| `/api/cards/:cardId/events` | Card-specific events |
| `/api/runs/:id/stream` | Run stdout/stderr stream |

## Frontend

The web UI is built with React, Mantine v7, and a dark hacker aesthetic (hot pink primary, matrix green secondary).

### Pages

| Route | Description |
|-------|-------------|
| `/boards` | Board list with create modal |
| `/boards/:boardId` | Kanban board with drag-and-drop columns and cards |
| `/boards/:boardId/cards/:cardId` | Board with card detail drawer open |
| `/boards/:boardId/approve/:cardId` | Human approval page for a card |
| `/boards/:boardId/thread` | Project-level discussion thread |
| `/agents` | Agent management (list + detail form) |
| `/activity` | Full-page activity feed |

### Key Features

- **Drag and drop** — Move cards between columns with @dnd-kit
- **Card detail drawer** — Subtasks, acceptance criteria, artifacts, discussion thread, run history
- **Real-time updates** — SSE-powered live feed of board activity
- **Agent management** — Configure agents with personas, runners, skills, and tool permissions
- **Approval workflow** — Review completion checklists, acceptance criteria, diffs, and test results

## Tech Stack

| Layer | Technology |
|-------|------------|
| API framework | Fastify v5 |
| Database | SQLite (WAL mode) via Drizzle ORM |
| Frontend | React + Mantine v7 + Vite |
| State management | React Query (server state) + Zustand (UI state) |
| Drag and drop | @dnd-kit |
| Real-time | Server-Sent Events (SSE) |
| Testing | Vitest + React Testing Library |
| Package manager | pnpm workspaces |
| Containerization | Docker (multi-stage build) |

## Testing

```bash
pnpm test
```

Runs 86 tests across two suites:

- **Server** (12 files, 62 tests) — Board/column/card CRUD, card moves, claim/lease lifecycle, run queue, column-entry triggers, SSE streaming, audit log, secrets encryption, messages, subtasks/acceptance criteria, E2E smoke test
- **Web** (6 files, 24 tests) — KanbanBoard, KanbanCard, CardDetailDrawer, AgentList, AgentDetailForm, ActivityFeedPage

## Docker

The Dockerfile uses a multi-stage build:

1. **deps** — Install pnpm dependencies
2. **build** — Compile all TypeScript packages and build the Vite frontend
3. **runtime** — Slim Node 22 Alpine image with only production artifacts

```bash
# Build and run
docker compose up --build

# Custom port
PORT=8080 docker compose up --build
```

The `docker-compose.yml` mounts two volumes:
- `./data` &rarr; `/app/data` — SQLite database persistence
- `./agent-board.yaml` &rarr; `/app/agent-board.yaml` — Configuration file

## License

MIT
