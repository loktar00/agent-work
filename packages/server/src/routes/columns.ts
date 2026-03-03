import type { FastifyPluginAsync } from "fastify";
import { createColumnSchema, updateColumnSchema } from "@agent-board/shared";
import { z } from "zod";

const columnRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.columns;
  const audit = fastify.services.audit;

  fastify.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/columns",
    async (req) => {
      return svc.listByBoard(req.params.boardId);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/columns/:id",
    async (req, reply) => {
      const col = svc.getById(req.params.id);
      if (!col) return reply.code(404).send({ error: "Column not found" });
      return col;
    },
  );

  fastify.post<{ Params: { boardId: string } }>(
    "/boards/:boardId/columns",
    async (req, reply) => {
      const input = createColumnSchema.parse({
        ...(req.body as object),
        boardId: req.params.boardId,
      });
      const col = svc.create(input);
      audit.log({
        boardId: input.boardId,
        entity: "column",
        entityId: col.id,
        action: "create",
        actorType: "human",
        actorId: "system",
      });
      fastify.sse.emit(`board:${input.boardId}`, "column:created", col);
      return reply.code(201).send(col);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/columns/:id",
    async (req, reply) => {
      const input = updateColumnSchema.parse(req.body);
      const col = svc.update(req.params.id, input);
      if (!col) return reply.code(404).send({ error: "Column not found" });
      audit.log({
        boardId: col.boardId,
        entity: "column",
        entityId: col.id,
        action: "update",
        actorType: "human",
        actorId: "system",
        diff: input as Record<string, unknown>,
      });
      fastify.sse.emit(`board:${col.boardId}`, "column:updated", col);
      return col;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/columns/:id",
    async (req, reply) => {
      const col = svc.getById(req.params.id);
      if (!col) return reply.code(404).send({ error: "Column not found" });
      svc.delete(req.params.id);
      fastify.sse.emit(`board:${col.boardId}`, "column:deleted", {
        id: req.params.id,
      });
      return { success: true };
    },
  );

  fastify.post<{ Params: { boardId: string } }>(
    "/boards/:boardId/columns/reorder",
    async (req) => {
      const { orderedIds } = z
        .object({ orderedIds: z.array(z.string().min(1)) })
        .parse(req.body);
      const cols = svc.reorder(req.params.boardId, orderedIds);
      fastify.sse.emit(
        `board:${req.params.boardId}`,
        "columns:reordered",
        cols,
      );
      return cols;
    },
  );
};

export default columnRoutes;
