import type { FastifyPluginAsync } from "fastify";
import { createBoardSchema, updateBoardSchema } from "@agent-board/shared";

const boardRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.boards;
  const audit = fastify.services.audit;

  fastify.get("/", async () => {
    return svc.list();
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const board = svc.getById(req.params.id);
    if (!board) return reply.code(404).send({ error: "Board not found" });
    return board;
  });

  fastify.post("/", async (req, reply) => {
    const input = createBoardSchema.parse(req.body);
    const board = svc.create(input);
    audit.log({
      boardId: board.id,
      entity: "board",
      entityId: board.id,
      action: "create",
      actorType: "human",
      actorId: "system",
    });
    fastify.sse.emit("boards", "board:created", board);
    return reply.code(201).send(board);
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const input = updateBoardSchema.parse(req.body);
    const board = svc.update(req.params.id, input);
    if (!board) return reply.code(404).send({ error: "Board not found" });
    audit.log({
      boardId: board.id,
      entity: "board",
      entityId: board.id,
      action: "update",
      actorType: "human",
      actorId: "system",
      diff: input as Record<string, unknown>,
    });
    fastify.sse.emit("boards", "board:updated", board);
    return board;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const deleted = svc.delete(req.params.id);
    if (!deleted) return reply.code(404).send({ error: "Board not found" });
    fastify.sse.emit("boards", "board:deleted", { id: req.params.id });
    return { success: true };
  });
};

export default boardRoutes;
