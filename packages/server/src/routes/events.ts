import type { FastifyPluginAsync } from "fastify";
import { sseStream } from "../plugins/sse.js";

const eventRoutes: FastifyPluginAsync = async (fastify) => {
  // SSE stream for board-level events
  fastify.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/events",
    async (req, reply) => {
      sseStream(reply, fastify.sse.emitter, `board:${req.params.boardId}`);
    },
  );

  // SSE stream for global board events (creates/updates/deletes)
  fastify.get("/events/boards", async (req, reply) => {
    sseStream(reply, fastify.sse.emitter, "boards");
  });

  // Live activity feed (board-level: moves, messages, runs, approvals)
  fastify.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/feed",
    async (req, reply) => {
      sseStream(reply, fastify.sse.emitter, `board:${req.params.boardId}`);
    },
  );

  // Card-level event stream
  fastify.get<{ Params: { cardId: string } }>(
    "/cards/:cardId/events",
    async (req, reply) => {
      sseStream(reply, fastify.sse.emitter, `card:${req.params.cardId}`);
    },
  );
};

export default eventRoutes;
