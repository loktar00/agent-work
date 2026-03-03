import type { FastifyPluginAsync } from "fastify";
import { createSecretSchema } from "@agent-board/shared";

const secretRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.secrets;

  fastify.get("/", async () => {
    return svc.list();
  });

  fastify.post("/", async (req, reply) => {
    const input = createSecretSchema.parse(req.body);
    const secret = svc.create(input.name, input.value);
    return reply.code(201).send(secret);
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const deleted = svc.delete(req.params.id);
    if (!deleted) return reply.code(404).send({ error: "Secret not found" });
    return { success: true };
  });
};

export default secretRoutes;
