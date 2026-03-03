import type { FastifyPluginAsync } from "fastify";

const auditRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = fastify.services.audit;

  fastify.get<{
    Params: { boardId: string };
    Querystring: { limit?: string };
  }>("/boards/:boardId/audit", async (req) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    return svc.listByBoard(req.params.boardId, limit);
  });
};

export default auditRoutes;
