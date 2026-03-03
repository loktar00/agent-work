import type { FastifyPluginAsync } from "fastify";
import { createArtifactSchema } from "@agent-board/shared";

const artifactRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.artifacts;

  fastify.get<{ Params: { cardId: string } }>(
    "/cards/:cardId/artifacts",
    async (req) => {
      return svc.listByCard(req.params.cardId);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/artifacts/:id",
    async (req, reply) => {
      const artifact = svc.getById(req.params.id);
      if (!artifact)
        return reply.code(404).send({ error: "Artifact not found" });
      return artifact;
    },
  );

  fastify.post("/artifacts", async (req, reply) => {
    const input = createArtifactSchema.parse(req.body);
    const artifact = svc.create(input);
    return reply.code(201).send(artifact);
  });

  fastify.delete<{ Params: { id: string } }>(
    "/artifacts/:id",
    async (req, reply) => {
      const deleted = svc.delete(req.params.id);
      if (!deleted)
        return reply.code(404).send({ error: "Artifact not found" });
      return { success: true };
    },
  );
};

export default artifactRoutes;
