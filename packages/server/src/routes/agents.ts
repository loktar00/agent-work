import type { FastifyPluginAsync } from "fastify";
import { createAgentSchema, updateAgentSchema } from "@agent-board/shared";
import { z } from "zod";

const agentRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.agents;

  fastify.get("/", async () => {
    return svc.list();
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const agent = svc.getById(req.params.id);
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    return agent;
  });

  fastify.post("/", async (req, reply) => {
    const input = createAgentSchema.parse(req.body);
    const agent = svc.create(input);
    return reply.code(201).send(agent);
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const input = updateAgentSchema.parse(req.body);
    const agent = svc.update(req.params.id, input);
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    return agent;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const deleted = svc.delete(req.params.id);
    if (!deleted) return reply.code(404).send({ error: "Agent not found" });
    return { success: true };
  });

  // Skills for agent
  fastify.get<{ Params: { id: string } }>(
    "/:id/skills",
    async (req) => {
      return svc.getSkills(req.params.id);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/:id/skills",
    async (req, reply) => {
      const { skillId } = z
        .object({ skillId: z.string().min(1) })
        .parse(req.body);
      svc.attachSkill(req.params.id, skillId);
      return reply.code(201).send({ success: true });
    },
  );

  fastify.delete<{ Params: { id: string; skillId: string } }>(
    "/:id/skills/:skillId",
    async (req) => {
      svc.detachSkill(req.params.id, req.params.skillId);
      return { success: true };
    },
  );
};

export default agentRoutes;
