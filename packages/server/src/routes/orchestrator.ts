import type { FastifyPluginAsync } from "fastify";

const orchestratorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Params: { boardId: string };
    Body: { message: string; history?: Array<{ role: string; content: string }> };
  }>("/boards/:boardId/orchestrate", async (req, reply) => {
    const { boardId } = req.params;
    const { message, history } = req.body as {
      message: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message || typeof message !== "string") {
      return reply.code(400).send({ error: "message is required" });
    }

    try {
      const result = await fastify.orchestrator.chat(boardId, message, history);

      // Emit SSE event so board updates
      if (result.toolCalls.length > 0) {
        fastify.sse.emitter.emit(boardId, {
          type: "board:updated",
          data: { source: "orchestrator", toolCalls: result.toolCalls.length },
        });
      }

      return result;
    } catch (err: any) {
      if (err.message?.includes("LLM not configured")) {
        return reply.code(400).send({ error: err.message });
      }
      fastify.log.error(err, "Orchestrator error");
      return reply
        .code(500)
        .send({ error: err.message ?? "Orchestrator failed" });
    }
  });

  // Multi-agent chat
  fastify.post<{
    Params: { boardId: string };
    Body: { message: string; agentIds: string[]; maxRounds?: number };
  }>("/boards/:boardId/multi-chat", async (req, reply) => {
    const { boardId } = req.params;
    const { message, agentIds, maxRounds } = req.body as {
      message: string;
      agentIds: string[];
      maxRounds?: number;
    };

    if (!message || typeof message !== "string") {
      return reply.code(400).send({ error: "message is required" });
    }

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return reply
        .code(400)
        .send({ error: "agentIds must be a non-empty array" });
    }

    try {
      const result = await fastify.multiAgentChat.chat(
        boardId,
        message,
        agentIds,
        maxRounds ?? 3,
      );
      return result;
    } catch (err: any) {
      fastify.log.error(err, "Multi-agent chat error");
      return reply
        .code(500)
        .send({ error: err.message ?? "Multi-agent chat failed" });
    }
  });
};

export default orchestratorRoutes;
