import type { FastifyPluginAsync } from "fastify";
import {
  createRunSchema,
  updateRunSchema,
  createRunEventSchema,
} from "@agent-board/shared";
import { sseStream } from "../plugins/sse.js";

const runRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.runs;

  fastify.get<{ Params: { cardId: string } }>(
    "/cards/:cardId/runs",
    async (req) => {
      return svc.listByCard(req.params.cardId);
    },
  );

  fastify.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/runs",
    async (req) => {
      return svc.listByBoard(req.params.boardId);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/runs/:id",
    async (req, reply) => {
      const run = svc.getById(req.params.id);
      if (!run) return reply.code(404).send({ error: "Run not found" });
      return run;
    },
  );

  // List available runners
  fastify.get("/runners", async () => {
    return fastify.runnerRegistry.list();
  });

  fastify.post("/runs", async (req, reply) => {
    const input = createRunSchema.parse(req.body);
    const run = svc.create(input);
    fastify.services.audit.log({
      boardId: input.boardId,
      entity: "run",
      entityId: run.id,
      action: "create",
      actorType: "human",
      actorId: "system",
    });
    // Enqueue the run for execution
    fastify.runQueue.enqueue(run.id);
    fastify.sse.emit(`board:${input.boardId}`, "run:created", run);
    return reply.code(201).send(run);
  });

  fastify.patch<{ Params: { id: string } }>(
    "/runs/:id",
    async (req, reply) => {
      const input = updateRunSchema.parse(req.body);
      const run = svc.update(req.params.id, input);
      if (!run) return reply.code(404).send({ error: "Run not found" });
      fastify.sse.emit(`board:${run.boardId}`, "run:updated", run);
      return run;
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/runs/:id/cancel",
    async (req, reply) => {
      // Cancel via queue (kills process if running)
      fastify.runQueue.cancel(req.params.id);
      const run = svc.cancel(req.params.id);
      if (!run) return reply.code(404).send({ error: "Run not found" });
      fastify.sse.emit(`board:${run.boardId}`, "run:cancelled", run);
      return run;
    },
  );

  // Run events
  fastify.get<{ Params: { id: string } }>(
    "/runs/:id/events",
    async (req) => {
      return svc.getEvents(req.params.id);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/runs/:id/events",
    async (req, reply) => {
      const input = createRunEventSchema.parse({
        ...(req.body as object),
        runId: req.params.id,
      });
      const event = svc.addEvent(input.runId, input.type, input.data);
      fastify.sse.emit(`run:${input.runId}`, "run_event:created", event);
      return reply.code(201).send(event);
    },
  );

  // SSE stream for run events
  fastify.get<{ Params: { id: string } }>(
    "/runs/:id/stream",
    async (req, reply) => {
      sseStream(reply, fastify.sse.emitter, `run:${req.params.id}`);
    },
  );

  // ── Worker API ──────────────────────────────────────────────────
  // Workers poll this to find available runs
  fastify.get("/runs/queued", async (req) => {
    const { boardId } = req.query as { boardId?: string };
    return svc.listQueued(boardId);
  });

  // Worker claims a run — atomically transitions queued -> running
  fastify.post<{ Params: { id: string } }>(
    "/runs/:id/claim",
    async (req, reply) => {
      const { workerId } = (req.body as { workerId?: string }) ?? {};
      const run = svc.claim(req.params.id, workerId ?? "default");
      if (!run) return reply.code(409).send({ error: "Run already claimed or not found" });
      fastify.sse.emit(`board:${run.boardId}`, "run:started", { runId: run.id });

      // Build full run payload with agent config and context
      const agent = fastify.services.agents.getById(run.agentId);
      const board = fastify.services.boards.getById(run.boardId);
      const card = fastify.services.cards.getById(run.cardId);
      const cardContext = fastify.services.context.buildCardContext(run.cardId);

      // Build column → agent map so the worker can tell agents about their teammates
      const boardColumns = fastify.services.columns.listByBoard(run.boardId);
      const columnAgentMap = boardColumns.map((col) => {
        const colAgent = col.agentId ? fastify.services.agents.getById(col.agentId) : null;
        return {
          columnId: col.id,
          columnName: col.name,
          position: col.position,
          agentId: col.agentId ?? null,
          agentName: colAgent?.name ?? null,
          agentRole: colAgent?.role ?? null,
        };
      });

      // Build project document context
      const projectDoc = fastify.services.context.buildBoardDocumentContext(run.boardId);

      return {
        ...run,
        board: board ? { projectDir: board.projectDir, worktreeMode: board.worktreeMode } : null,
        card: card ? { title: card.title, description: card.description } : null,
        agentConfig: agent
          ? {
              name: agent.name,
              role: agent.role,
              persona: agent.persona,
              runnerId: agent.runnerId,
              modelConfig: agent.modelConfig ? JSON.parse(agent.modelConfig) : null,
              llmConfig: agent.llmConfig ? JSON.parse(agent.llmConfig) : null,
              toolPermissions: agent.toolPermissions ? JSON.parse(agent.toolPermissions) : null,
            }
          : null,
        context: cardContext
          ? {
              card: cardContext.card,
              subtasks: cardContext.subtasks,
              recentMessages: cardContext.recentMessages,
              artifacts: cardContext.artifacts,
            }
          : null,
        columns: columnAgentMap,
        projectDoc: projectDoc.length > 0 ? projectDoc : null,
      };
    },
  );

  // Worker reports completion
  fastify.post<{ Params: { id: string } }>(
    "/runs/:id/complete",
    async (req, reply) => {
      const { exitCode } = (req.body as { exitCode: number }) ?? {};
      if (exitCode == null) return reply.code(400).send({ error: "exitCode required" });
      const run = svc.complete(req.params.id, exitCode);
      if (!run) return reply.code(404).send({ error: "Run not found" });
      fastify.sse.emit(`board:${run.boardId}`, "run:finished", {
        runId: run.id,
        status: run.status,
        exitCode,
      });
      return run;
    },
  );
};

export default runRoutes;
