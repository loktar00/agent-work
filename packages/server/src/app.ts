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
import { agentService } from "./services/agents.js";
import { skillService } from "./services/skills.js";
import { messageService } from "./services/messages.js";
import { artifactService } from "./services/artifacts.js";
import { auditService } from "./services/audit.js";
import { secretService } from "./services/secrets.js";
import { leaseService } from "./services/leases.js";
import { runService } from "./services/runs.js";
import { contextBuilder } from "./services/context.js";
import { documentService } from "./services/documents.js";
import { agentCatalogService } from "./services/agent-catalog.js";
import { toolCallService } from "./services/tool-calls.js";
import { toolRegistry } from "./services/tool-registry.js";
import type { ToolRegistry } from "./services/tool-registry.js";
import { RunnerRegistry } from "./runners/registry.js";
import { RunQueue } from "./runners/queue.js";
import { columnEntryTrigger } from "./runners/trigger.js";
import boardRoutes from "./routes/boards.js";
import columnRoutes from "./routes/columns.js";
import cardRoutes from "./routes/cards.js";
import subtaskRoutes from "./routes/subtasks.js";
import agentRoutes from "./routes/agents.js";
import skillRoutes from "./routes/skills.js";
import messageRoutes from "./routes/messages.js";
import artifactRoutes from "./routes/artifacts.js";
import auditRoutes from "./routes/audit.js";
import secretRoutes from "./routes/secrets.js";
import leaseRoutes from "./routes/leases.js";
import runRoutes from "./routes/runs.js";
import eventRoutes from "./routes/events.js";
import agentPersonaRoutes from "./routes/agent-personas.js";
import orchestratorRoutes from "./routes/orchestrator.js";
import settingsRoutes from "./routes/settings.js";
import toolRoutes from "./routes/tools.js";
import documentRoutes from "./routes/documents.js";
import agentCatalogRoutes from "./routes/agent-catalog.js";
import onboardingRoutes from "./routes/onboarding.js";
import { orchestratorService } from "./services/orchestrator.js";
import { settingsService } from "./services/settings.js";
import { multiAgentChatService } from "./services/multi-agent-chat.js";
import { LLMRunnerAdapter } from "./runners/llm.js";
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
      agents: ReturnType<typeof agentService>;
      skills: ReturnType<typeof skillService>;
      messages: ReturnType<typeof messageService>;
      artifacts: ReturnType<typeof artifactService>;
      audit: ReturnType<typeof auditService>;
      secrets: ReturnType<typeof secretService>;
      leases: ReturnType<typeof leaseService>;
      runs: ReturnType<typeof runService>;
      documents: ReturnType<typeof documentService>;
      agentCatalog: ReturnType<typeof agentCatalogService>;
      toolCalls: ReturnType<typeof toolCallService>;
      context: ReturnType<typeof contextBuilder>;
    };
    config: AppConfig;
    runQueue: RunQueue;
    runnerRegistry: RunnerRegistry;
    trigger: ReturnType<typeof columnEntryTrigger>;
    toolRegistry: ToolRegistry;
    settingsService: ReturnType<typeof settingsService>;
    orchestrator: ReturnType<typeof orchestratorService>;
    multiAgentChat: ReturnType<typeof multiAgentChatService>;
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
    agents: agentService(db),
    skills: skillService(db),
    messages: messageService(db),
    artifacts: artifactService(db),
    audit: auditService(db),
    secrets: secretService(db),
    leases: leaseService(db),
    runs: runService(db),
    documents: documentService(db),
    agentCatalog: agentCatalogService(db),
    toolCalls: toolCallService(db),
    context: contextBuilder(db),
  };

  app.decorate("services", services);
  app.decorate("config", config);

  // Settings service
  const settingsSvc = settingsService(db);
  app.decorate("settingsService", settingsSvc);

  // Re-create agents service with settings dependency for getEffectiveLLMSettings
  services.agents = agentService(db, settingsSvc);

  // Runner system
  const boardApiUrl = `http://${config.server.host === "0.0.0.0" ? "localhost" : config.server.host}:${config.server.port}`;
  const runnerRegistry = new RunnerRegistry(config.runners);
  const runQueue = new RunQueue({
    db,
    registry: runnerRegistry,
    sseEmitter: app.sse.emitter,
    maxConcurrency: 2,
    boardApiUrl,
  });
  const trigger = columnEntryTrigger(db, runQueue);

  const registry = toolRegistry({
    services,
    sseEmitter: app.sse.emitter,
    trigger,
    runQueue,
  });
  app.decorate("toolRegistry", registry);

  // Orchestrator (reads LLM settings from DB at call time)
  const orchestrator = orchestratorService(services, settingsSvc, registry);
  app.decorate("orchestrator", orchestrator);

  // Multi-agent chat service
  const multiChat = multiAgentChatService(services, settingsSvc, app.sse.emitter, registry);
  app.decorate("multiAgentChat", multiChat);

  // Register LLM runner adapter
  runnerRegistry.register(
    "llm",
    new LLMRunnerAdapter({
      toolRegistry: registry,
      settingsSvc,
    }),
  );

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
  await app.register(agentRoutes, { prefix: "/api/agents" });
  await app.register(skillRoutes, { prefix: "/api/skills" });
  await app.register(messageRoutes, { prefix: "/api" });
  await app.register(artifactRoutes, { prefix: "/api" });
  await app.register(auditRoutes, { prefix: "/api" });
  await app.register(secretRoutes, { prefix: "/api/secrets" });
  await app.register(leaseRoutes, { prefix: "/api" });
  await app.register(runRoutes, { prefix: "/api" });
  await app.register(eventRoutes, { prefix: "/api" });
  await app.register(agentPersonaRoutes, { prefix: "/api" });
  await app.register(orchestratorRoutes, { prefix: "/api" });
  await app.register(settingsRoutes, { prefix: "/api" });
  await app.register(toolRoutes, { prefix: "/api" });
  await app.register(documentRoutes, { prefix: "/api" });
  await app.register(agentCatalogRoutes, { prefix: "/api" });
  await app.register(onboardingRoutes);

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
