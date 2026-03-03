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
};

export default runRoutes;
