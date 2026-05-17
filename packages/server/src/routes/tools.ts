import type { FastifyPluginAsync } from "fastify";

type ToolActorType = "human" | "agent" | "system" | "worker";

const toolRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { boardId: string };
    Querystring: { agentId?: string };
  }>("/boards/:boardId/tools", async (req) => {
    const { agentId } = req.query;
    return fastify.toolRegistry
      .listTools({
        boardId: req.params.boardId,
        actorType: agentId ? "agent" : "human",
        actorId: agentId ?? "tool-api",
        agentId: agentId ?? null,
      })
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
  });

  fastify.post<{
    Params: { boardId: string; toolName: string };
    Body: {
      input: Record<string, unknown>;
      actorType?: ToolActorType;
      actorId?: string;
      agentId?: string | null;
      runId?: string | null;
      messageId?: string | null;
    };
  }>("/boards/:boardId/tools/:toolName", async (req, reply) => {
    const { boardId, toolName } = req.params;
    const {
      input,
      actorType,
      actorId,
      agentId,
      runId,
      messageId,
    } = req.body as {
      input: Record<string, unknown>;
      actorType?: ToolActorType;
      actorId?: string;
      agentId?: string | null;
      runId?: string | null;
      messageId?: string | null;
    };

    const resolvedActorType = actorType ?? (agentId ? "agent" : "human");
    const resolvedActorId = actorId ?? agentId ?? "tool-api";

    const toolDef = fastify.toolRegistry
      .listTools({
        boardId,
        actorType: "human",
        actorId: "tool-api",
      })
      .find((tool) => tool.name === toolName);

    if (!toolDef) {
      return reply.code(404).send({ error: `Unknown tool: ${toolName}` });
    }

    try {
      const result = await fastify.toolRegistry.execute(
        toolName,
        { ...input, boardId },
        {
          boardId,
          actorType: resolvedActorType,
          actorId: resolvedActorId,
          agentId: agentId ?? null,
          runId: runId ?? null,
          messageId: messageId ?? null,
        },
      );

      return { result };
    } catch (err: any) {
      fastify.log.error(err, `Tool execution error: ${toolName}`);
      return reply
        .code(500)
        .send({ error: err.message ?? "Tool execution failed" });
    }
  });
};

export default toolRoutes;
