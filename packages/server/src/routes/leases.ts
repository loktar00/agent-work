import type { FastifyPluginAsync } from "fastify";
import { claimLeaseSchema, renewLeaseSchema } from "@agent-board/shared";

const leaseRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.leases;

  fastify.get<{ Params: { cardId: string } }>(
    "/cards/:cardId/lease",
    async (req) => {
      const lease = svc.getActiveByCard(req.params.cardId);
      return lease ?? { active: false };
    },
  );

  fastify.post("/leases/claim", async (req, reply) => {
    const input = claimLeaseSchema.parse(req.body);
    const lease = svc.claim(input.cardId, input.agentId, input.durationMs);
    if (!lease)
      return reply
        .code(409)
        .send({ error: "Card is already claimed by another agent" });

    fastify.services.audit.log({
      boardId: "system",
      entity: "lease",
      entityId: lease.id,
      action: "claim",
      actorType: "agent",
      actorId: input.agentId,
    });
    return reply.code(201).send(lease);
  });

  fastify.post<{ Params: { id: string } }>(
    "/leases/:id/renew",
    async (req, reply) => {
      const input = renewLeaseSchema.parse(req.body);
      const lease = svc.renew(req.params.id, input.durationMs);
      if (!lease)
        return reply.code(404).send({ error: "Lease not found" });
      return lease;
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/leases/:id/release",
    async (req, reply) => {
      const released = svc.release(req.params.id);
      if (!released)
        return reply.code(404).send({ error: "Lease not found" });
      return { success: true };
    },
  );
};

export default leaseRoutes;
