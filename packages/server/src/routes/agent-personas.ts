import type { FastifyPluginAsync } from "fastify";

const personaCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const agentPersonaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { division: string; filename: string } }>(
    "/agent-personas/:division/:filename",
    async (req, reply) => {
      const { division, filename } = req.params;

      // Validate inputs to prevent path traversal
      if (
        /[^a-zA-Z0-9_-]/.test(division) ||
        !/^[a-zA-Z0-9_-]+\.md$/.test(filename)
      ) {
        return reply.code(400).send({ error: "Invalid path parameters" });
      }

      const cacheKey = `${division}/${filename}`;
      const cached = personaCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        reply.header("Cache-Control", "public, max-age=3600");
        return { content: cached.content };
      }

      const url = `https://raw.githubusercontent.com/msitarzewski/agency-agents/main/${division}/${filename}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          return reply
            .code(res.status)
            .send({ error: `GitHub returned ${res.status}` });
        }

        const content = await res.text();
        personaCache.set(cacheKey, { content, timestamp: Date.now() });

        reply.header("Cache-Control", "public, max-age=3600");
        return { content };
      } catch (err) {
        fastify.log.error(err, "Failed to fetch agent persona from GitHub");
        return reply
          .code(502)
          .send({ error: "Failed to fetch persona from GitHub" });
      }
    },
  );
};

export default agentPersonaRoutes;
