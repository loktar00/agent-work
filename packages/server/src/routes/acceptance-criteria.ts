import type { FastifyPluginAsync } from "fastify";
import {
  createAcceptanceCriterionSchema,
  updateAcceptanceCriterionSchema,
} from "@agent-board/shared";

const acRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.acceptanceCriteria;

  fastify.get<{ Params: { cardId: string } }>(
    "/cards/:cardId/acceptance-criteria",
    async (req) => {
      return svc.listByCard(req.params.cardId);
    },
  );

  fastify.post<{ Params: { cardId: string } }>(
    "/cards/:cardId/acceptance-criteria",
    async (req, reply) => {
      const input = createAcceptanceCriterionSchema.parse({
        ...(req.body as object),
        cardId: req.params.cardId,
      });
      const ac = svc.create(input);
      return reply.code(201).send(ac);
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/acceptance-criteria/:id",
    async (req, reply) => {
      const input = updateAcceptanceCriterionSchema.parse(req.body);
      const ac = svc.update(req.params.id, input);
      if (!ac)
        return reply
          .code(404)
          .send({ error: "Acceptance criterion not found" });
      return ac;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/acceptance-criteria/:id",
    async (req, reply) => {
      const deleted = svc.delete(req.params.id);
      if (!deleted)
        return reply
          .code(404)
          .send({ error: "Acceptance criterion not found" });
      return { success: true };
    },
  );
};

export default acRoutes;
