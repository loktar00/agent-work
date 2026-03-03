import Fastify from "fastify";
import cors from "@fastify/cors";
import { createConnection } from "@agent-board/db";
import type { AppConfig } from "./config.js";
import cidrGuard from "./plugins/cidr-guard.js";
import errorHandler from "./plugins/error-handler.js";
import ssePlugin from "./plugins/sse.js";
import { boardService } from "./services/boards.js";
import { columnService } from "./services/columns.js";
import { cardService } from "./services/cards.js";
import { subtaskService } from "./services/subtasks.js";
import { acceptanceCriteriaService } from "./services/acceptance-criteria.js";
import { agentService } from "./services/agents.js";
import { skillService } from "./services/skills.js";
import { messageService } from "./services/messages.js";
import { artifactService } from "./services/artifacts.js";
import { auditService } from "./services/audit.js";
import { secretService } from "./services/secrets.js";
import { leaseService } from "./services/leases.js";
import { runService } from "./services/runs.js";
import { contextBuilder } from "./services/context.js";
import { RunnerRegistry } from "./runners/registry.js";
import { RunQueue } from "./runners/queue.js";
import { columnEntryTrigger } from "./runners/trigger.js";
import boardRoutes from "./routes/boards.js";
import columnRoutes from "./routes/columns.js";
import cardRoutes from "./routes/cards.js";
import subtaskRoutes from "./routes/subtasks.js";
import acRoutes from "./routes/acceptance-criteria.js";
import agentRoutes from "./routes/agents.js";
import skillRoutes from "./routes/skills.js";
import messageRoutes from "./routes/messages.js";
import artifactRoutes from "./routes/artifacts.js";
import auditRoutes from "./routes/audit.js";
import secretRoutes from "./routes/secrets.js";
import leaseRoutes from "./routes/leases.js";
import runRoutes from "./routes/runs.js";
import eventRoutes from "./routes/events.js";
import fastifyStatic from "@fastify/static";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

declare module "fastify" {
  interface FastifyInstance {
    services: {
      boards: ReturnType<typeof boardService>;
      columns: ReturnType<typeof columnService>;
      cards: ReturnType<typeof cardService>;
      subtasks: ReturnType<typeof subtaskService>;
      acceptanceCriteria: ReturnType<typeof acceptanceCriteriaService>;
      agents: ReturnType<typeof agentService>;
      skills: ReturnType<typeof skillService>;
      messages: ReturnType<typeof messageService>;
      artifacts: ReturnType<typeof artifactService>;
      audit: ReturnType<typeof auditService>;
      secrets: ReturnType<typeof secretService>;
      leases: ReturnType<typeof leaseService>;
      runs: ReturnType<typeof runService>;
      context: ReturnType<typeof contextBuilder>;
    };
    config: AppConfig;
    runQueue: RunQueue;
    runnerRegistry: RunnerRegistry;
    trigger: ReturnType<typeof columnEntryTrigger>;
  }
}

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: { level: "info" },
  });

  // Ensure data directory exists
  mkdirSync(dirname(config.database.path), { recursive: true });

  // Database
  const { db, sqlite } = createConnection(config.database.path);

  // Run migrations
  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../db/src/migrations",
  );
  migrate(db, { migrationsFolder });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(errorHandler);
  await app.register(ssePlugin);
  await app.register(cidrGuard, { allowedCidrs: config.allowedCidrs });

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
  app.decorate("config", config);

  // Runner system
  const runnerRegistry = new RunnerRegistry(config.runners);
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

  // Recover orphaned runs from previous crash
  runQueue.recoverOrphanedRuns();

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

  // Serve static frontend in production
  const webDistPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../apps/web/dist",
  );
  if (existsSync(webDistPath)) {
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: "/",
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  // Cleanup on close
  app.addHook("onClose", async () => {
    sqlite.close();
  });

  return app;
}
