import type { FastifyPluginAsync } from "fastify";
import { createSkillSchema, updateSkillSchema } from "@agent-board/shared";
import { z } from "zod";

const skillRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.skills;

  fastify.get("/", async () => {
    return svc.list();
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const skill = svc.getById(req.params.id);
    if (!skill) return reply.code(404).send({ error: "Skill not found" });
    return skill;
  });

  fastify.post("/", async (req, reply) => {
    const input = createSkillSchema.parse(req.body);
    const skill = svc.create(input);
    return reply.code(201).send(skill);
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const input = updateSkillSchema.parse(req.body);
    const skill = svc.update(req.params.id, input);
    if (!skill) return reply.code(404).send({ error: "Skill not found" });
    return skill;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const deleted = svc.delete(req.params.id);
    if (!deleted) return reply.code(404).send({ error: "Skill not found" });
    return { success: true };
  });

  fastify.post("/scan", async (req) => {
    const { directory } = z
      .object({ directory: z.string().min(1) })
      .parse(req.body);
    return svc.scanDirectory(directory);
  });
};

export default skillRoutes;
