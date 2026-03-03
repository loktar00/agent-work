import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@agent-board/db";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fp from "fastify-plugin";
import { EventEmitter } from "node:events";
import { boardService } from "../src/services/boards.js";
import { columnService } from "../src/services/columns.js";
import { cardService } from "../src/services/cards.js";
import { subtaskService } from "../src/services/subtasks.js";
import { acceptanceCriteriaService } from "../src/services/acceptance-criteria.js";
import { agentService } from "../src/services/agents.js";
import { skillService } from "../src/services/skills.js";
import { messageService } from "../src/services/messages.js";
import { artifactService } from "../src/services/artifacts.js";
import { auditService } from "../src/services/audit.js";
import { secretService } from "../src/services/secrets.js";
import { leaseService } from "../src/services/leases.js";
import { runService } from "../src/services/runs.js";
import { contextBuilder } from "../src/services/context.js";
import { RunnerRegistry } from "../src/runners/registry.js";
import { RunQueue } from "../src/runners/queue.js";
import { columnEntryTrigger } from "../src/runners/trigger.js";
import boardRoutes from "../src/routes/boards.js";
import columnRoutes from "../src/routes/columns.js";
import cardRoutes from "../src/routes/cards.js";
import subtaskRoutes from "../src/routes/subtasks.js";
import acRoutes from "../src/routes/acceptance-criteria.js";
import agentRoutes from "../src/routes/agents.js";
import skillRoutes from "../src/routes/skills.js";
import messageRoutes from "../src/routes/messages.js";
import artifactRoutes from "../src/routes/artifacts.js";
import auditRoutes from "../src/routes/audit.js";
import secretRoutes from "../src/routes/secrets.js";
import leaseRoutes from "../src/routes/leases.js";
import runRoutes from "../src/routes/runs.js";
import eventRoutes from "../src/routes/events.js";
import errorHandler from "../src/plugins/error-handler.js";
import ssePlugin from "../src/plugins/sse.js";
import type { DB } from "@agent-board/db";

// SQL statements to create all tables (matching the Drizzle schema)
const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    agent_id TEXT,
    wip_limit INTEGER
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    persona TEXT,
    runner_id TEXT,
    model_config TEXT,
    tool_permissions TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    position INTEGER NOT NULL DEFAULT 0,
    assignee_agent_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS acceptance_criteria (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    source TEXT
  );

  CREATE TABLE IF NOT EXISTS agent_skills (
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, skill_id)
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    runner_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    prompt TEXT,
    started_at TEXT,
    finished_at TEXT,
    exit_code INTEGER
  );
  CREATE INDEX IF NOT EXISTS runs_card_id_idx ON runs(card_id);
  CREATE INDEX IF NOT EXISTS runs_agent_id_idx ON runs(agent_id);
  CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status);

  CREATE TABLE IF NOT EXISTS run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS run_events_run_id_idx ON run_events(run_id);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
    run_id TEXT REFERENCES runs(id) ON DELETE SET NULL,
    author_type TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS messages_board_id_idx ON messages(board_id);
  CREATE INDEX IF NOT EXISTS messages_card_id_idx ON messages(card_id);

  CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    run_id TEXT REFERENCES runs(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS artifacts_card_id_idx ON artifacts(card_id);
  CREATE INDEX IF NOT EXISTS artifacts_run_id_idx ON artifacts(run_id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    diff TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS audit_log_board_id_idx ON audit_log(board_id);
  CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity, entity_id);

  CREATE TABLE IF NOT EXISTS secrets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leases (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    renewed_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS leases_card_id_idx ON leases(card_id);
  CREATE INDEX IF NOT EXISTS leases_expires_at_idx ON leases(expires_at);
`;

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(CREATE_TABLES);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export async function createTestApp() {
  const { db, sqlite } = createTestDb();

  const app = Fastify({ logger: false });

  // Error handler
  await app.register(errorHandler);

  // SSE plugin
  await app.register(ssePlugin);

  // CORS
  await app.register(cors, { origin: true });

  // Services
  const services = {
    boards: boardService(db),
    columns: columnService(db),
    cards: cardService(db),
    subtasks: subtaskService(db),
    acceptanceCriteria: acceptanceCriteriaService(db),
    agents: agentService(db),
    skills: skillService(db),
    messages: messageService(db),
    artifacts: artifactService(db),
    audit: auditService(db),
    secrets: secretService(db),
    leases: leaseService(db),
    runs: runService(db),
    context: contextBuilder(db),
  };

  app.decorate("services", services);
  app.decorate("config", {
    server: { host: "0.0.0.0", port: 3000 },
    database: { path: ":memory:" },
    skillsDirs: [],
    runners: {},
  });

  // Runner system
  const runnerRegistry = new RunnerRegistry({});
  const runQueue = new RunQueue({
    db,
    registry: runnerRegistry,
    sseEmitter: app.sse.emitter,
    maxConcurrency: 2,
  });
  const trigger = columnEntryTrigger(db, runQueue);

  app.decorate("runnerRegistry", runnerRegistry);
  app.decorate("runQueue", runQueue);
  app.decorate("trigger", trigger);

  // Health check
  app.get("/api/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // Routes
  await app.register(boardRoutes, { prefix: "/api/boards" });
  await app.register(columnRoutes, { prefix: "/api" });
  await app.register(cardRoutes, { prefix: "/api" });
  await app.register(subtaskRoutes, { prefix: "/api" });
  await app.register(acRoutes, { prefix: "/api" });
  await app.register(agentRoutes, { prefix: "/api/agents" });
  await app.register(skillRoutes, { prefix: "/api/skills" });
  await app.register(messageRoutes, { prefix: "/api" });
  await app.register(artifactRoutes, { prefix: "/api" });
  await app.register(auditRoutes, { prefix: "/api" });
  await app.register(secretRoutes, { prefix: "/api/secrets" });
  await app.register(leaseRoutes, { prefix: "/api" });
  await app.register(runRoutes, { prefix: "/api" });
  await app.register(eventRoutes, { prefix: "/api" });

  // Cleanup on close
  app.addHook("onClose", async () => {
    sqlite.close();
  });

  await app.ready();

  return { app, db, sqlite };
}

// Helper functions to create test data via inject
export async function createBoard(app: ReturnType<typeof Fastify>, name = "Test Board") {
  const res = await app.inject({
    method: "POST",
    url: "/api/boards",
    payload: { name },
  });
  return JSON.parse(res.body);
}

export async function createColumn(
  app: ReturnType<typeof Fastify>,
  boardId: string,
  name = "Test Column",
  position = 0,
  agentId?: string
) {
  const res = await app.inject({
    method: "POST",
    url: `/api/boards/${boardId}/columns`,
    payload: { name, position, agentId: agentId ?? null },
  });
  return JSON.parse(res.body);
}

export async function createCard(
  app: ReturnType<typeof Fastify>,
  boardId: string,
  columnId: string,
  title = "Test Card"
) {
  const res = await app.inject({
    method: "POST",
    url: `/api/boards/${boardId}/cards`,
    payload: { columnId, title },
  });
  return JSON.parse(res.body);
}

export async function createAgent(
  app: ReturnType<typeof Fastify>,
  name = "Test Agent",
  role = "developer"
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/agents",
    payload: { name, role },
  });
  return JSON.parse(res.body);
}
