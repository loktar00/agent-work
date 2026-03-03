import type { FastifyPluginAsync } from "fastify";
import {
  createSubtaskSchema,
  updateSubtaskSchema,
} from "@agent-board/shared";

const subtaskRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.subtasks;

  fastify.get<{ Params: { cardId: string } }>(
    "/cards/:cardId/subtasks",
    async (req) => {
      return svc.listByCard(req.params.cardId);
    },
  );

  fastify.post<{ Params: { cardId: string } }>(
    "/cards/:cardId/subtasks",
    async (req, reply) => {
      const input = createSubtaskSchema.parse({
        ...(req.body as object),
        cardId: req.params.cardId,
      });
      const subtask = svc.create(input);
      return reply.code(201).send(subtask);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/subtasks/:id",
    async (req, reply) => {
      const input = updateSubtaskSchema.parse(req.body);
      const subtask = svc.update(req.params.id, input);
      if (!subtask)
        return reply.code(404).send({ error: "Subtask not found" });
      return subtask;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/subtasks/:id",
    async (req, reply) => {
      const deleted = svc.delete(req.params.id);
      if (!deleted)
        return reply.code(404).send({ error: "Subtask not found" });
      return { success: true };
    },
  );
};

export default subtaskRoutes;
