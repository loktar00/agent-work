import type { FastifyPluginAsync } from "fastify";
import { boardTools } from "../llm/tools.js";
import { executeTool } from "../llm/executor.js";

const toolRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/boards/:boardId/tools — tool manifest
  fastify.get<{
    Params: { boardId: string };
  }>("/boards/:boardId/tools", async (req) => {
    return boardTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  });

  // POST /api/boards/:boardId/tools/:toolName — execute a single tool
  fastify.post<{
    Params: { boardId: string; toolName: string };
    Body: { input: Record<string, unknown> };
  }>("/boards/:boardId/tools/:toolName", async (req, reply) => {
    const { boardId, toolName } = req.params;
    const { input } = req.body as { input: Record<string, unknown> };

    const toolDef = boardTools.find((t) => t.name === toolName);
    if (!toolDef) {
      return reply.code(404).send({ error: `Unknown tool: ${toolName}` });
    }

    try {
      const result = executeTool(toolName, { ...input, boardId }, fastify.services);

      // Emit SSE event so board updates
      fastify.sse.emitter.emit(boardId, {
        type: "board:updated",
        data: { source: "tool-api", tool: toolName },
      });

      // If move_card was called, trigger the next agent's column entry
      if (toolName === "move_card" && result && typeof result === "object") {
        const card = result as { id: string; boardId: string; columnId: string };
        if (card.id && card.columnId) {
          fastify.trigger.onCardMoved({
            id: card.id,
            boardId,
            columnId: card.columnId,
          });
        }
      }

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
