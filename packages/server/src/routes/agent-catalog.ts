import type { FastifyPluginAsync } from "fastify";
import {
  createAgentCatalogPresetSchema,
  instantiateAgentPresetSchema,
} from "@agent-board/shared";

const agentCatalogRoutes: FastifyPluginAsync = async (fastify) => {
  const catalog = fastify.services.agentCatalog;

  fastify.get("/agent-catalog", async (req) => {
    const { query, division } = req.query as {
      query?: string;
      division?: string;
    };
    return catalog
      .list()
      .filter((preset) => {
        if (division && preset.division !== division) return false;
        if (!query) return true;
        return [
          preset.name,
          preset.role,
          preset.division,
          preset.description,
          ...preset.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      });
  });

  fastify.get<{ Params: { id: string } }>("/agent-catalog/:id", async (req, reply) => {
    const preset = catalog.getById(req.params.id);
    if (!preset) return reply.code(404).send({ error: "Agent preset not found" });
    return preset;
  });

  fastify.post("/agent-catalog", async (req, reply) => {
    const input = createAgentCatalogPresetSchema.parse(req.body);
    const preset = catalog.create(input);
    return reply.code(201).send(preset);
  });

  fastify.post<{ Params: { id: string } }>(
    "/agent-catalog/:id/instantiate",
    async (req, reply) => {
      const input = instantiateAgentPresetSchema.parse(req.body ?? {});
      const agent = catalog.instantiate(
        req.params.id,
        input,
        fastify.services.agents,
      );
      if (!agent) return reply.code(404).send({ error: "Agent preset not found" });
      fastify.sse.emit("agents", "agent:created", agent);
      return reply.code(201).send(agent);
    },
  );
};

export default agentCatalogRoutes;
