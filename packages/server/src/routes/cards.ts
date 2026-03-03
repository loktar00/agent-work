import type { FastifyPluginAsync } from "fastify";
import {
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
} from "@agent-board/shared";

const cardRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.cards;
  const audit = fastify.services.audit;

  fastify.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/cards",
    async (req) => {
      return svc.listByBoard(req.params.boardId);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/cards/:id",
    async (req, reply) => {
      const card = svc.getById(req.params.id);
      if (!card) return reply.code(404).send({ error: "Card not found" });
      return card;
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/cards/:id/context",
    async (req, reply) => {
      const ctx = fastify.services.context.buildCardContext(req.params.id);
      if (!ctx) return reply.code(404).send({ error: "Card not found" });
      return ctx;
    },
  );

  fastify.post<{ Params: { boardId: string } }>(
    "/boards/:boardId/cards",
    async (req, reply) => {
      const input = createCardSchema.parse({
        ...(req.body as object),
        boardId: req.params.boardId,
      });
      const card = svc.create(input);
      audit.log({
        boardId: input.boardId,
        entity: "card",
        entityId: card.id,
        action: "create",
        actorType: "human",
        actorId: "system",
      });
      fastify.sse.emit(`board:${input.boardId}`, "card:created", card);
      return reply.code(201).send(card);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/cards/:id",
    async (req, reply) => {
      const input = updateCardSchema.parse(req.body);
      const card = svc.update(req.params.id, input);
      if (!card) return reply.code(404).send({ error: "Card not found" });
      audit.log({
        boardId: card.boardId,
        entity: "card",
        entityId: card.id,
        action: "update",
        actorType: "human",
        actorId: "system",
        diff: input as Record<string, unknown>,
      });
      fastify.sse.emit(`board:${card.boardId}`, "card:updated", card);
      return card;
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/cards/:id/move",
    async (req, reply) => {
      const input = moveCardSchema.parse(req.body);
      const card = svc.move(req.params.id, input);
      if (!card) return reply.code(404).send({ error: "Card not found" });
      audit.log({
        boardId: card.boardId,
        entity: "card",
        entityId: card.id,
        action: "move",
        actorType: "human",
        actorId: "system",
        diff: input as Record<string, unknown>,
      });
      fastify.sse.emit(`board:${card.boardId}`, "card:moved", card);

      // Trigger column-entry automation
      const run = fastify.trigger.onCardMoved(card);
      if (run) {
        fastify.sse.emit(`board:${card.boardId}`, "run:created", run);
      }

      return card;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/cards/:id",
    async (req, reply) => {
      const card = svc.getById(req.params.id);
      if (!card) return reply.code(404).send({ error: "Card not found" });
      svc.delete(req.params.id);
      audit.log({
        boardId: card.boardId,
        entity: "card",
        entityId: card.id,
        action: "delete",
        actorType: "human",
        actorId: "system",
      });
      fastify.sse.emit(`board:${card.boardId}`, "card:deleted", {
        id: req.params.id,
      });
      return { success: true };
    },
  );
};

export default cardRoutes;
