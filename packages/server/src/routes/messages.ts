import type { FastifyPluginAsync } from "fastify";
import { createMessageSchema } from "@agent-board/shared";

const messageRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.messages;

  // Card thread
  fastify.get<{ Params: { cardId: string }; Querystring: { limit?: string } }>(
    "/cards/:cardId/messages",
    async (req) => {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      return svc.listByCard(req.params.cardId, limit);
    },
  );

  // Project thread
  fastify.get<{
    Params: { boardId: string };
    Querystring: { limit?: string };
  }>("/boards/:boardId/messages", async (req) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    return svc.listProjectThread(req.params.boardId, limit);
  });

  // Post message (card thread or project thread depending on cardId presence)
  fastify.post("/messages", async (req, reply) => {
    const input = createMessageSchema.parse(req.body);
    const msg = svc.create(input);
    const channel = input.cardId
      ? `card:${input.cardId}`
      : `board:${input.boardId}`;
    fastify.sse.emit(channel, "message:created", msg);
    return reply.code(201).send(msg);
  });
};

export default messageRoutes;
