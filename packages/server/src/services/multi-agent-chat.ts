import type { EventEmitter } from "node:events";
import type { boardService } from "./boards.js";
import type { columnService } from "./columns.js";
import type { cardService } from "./cards.js";
import type { subtaskService } from "./subtasks.js";
import type { agentService } from "./agents.js";
import type { messageService } from "./messages.js";
import type { settingsService } from "./settings.js";
import { callLLM } from "../llm/provider.js";
import type { ChatMessage } from "../llm/provider.js";
import { boardTools } from "../llm/tools.js";
import { executeTool } from "../llm/executor.js";
import type { LLMSettings } from "@agent-board/shared";

interface Services {
  boards: ReturnType<typeof boardService>;
  columns: ReturnType<typeof columnService>;
  cards: ReturnType<typeof cardService>;
  subtasks: ReturnType<typeof subtaskService>;
  agents: ReturnType<typeof agentService>;
  messages: ReturnType<typeof messageService>;
}

export function multiAgentChatService(
  services: Services,
  settingsSvc: ReturnType<typeof settingsService>,
  sseEmitter: EventEmitter,
) {
  return {
    async chat(
      boardId: string,
      userMessage: string,
      agentIds: string[],
      maxRounds = 3,
    ) {
      const board = services.boards.getById(boardId);
      if (!board) throw new Error("Board not found");

      // Save user message
      const userMsg = services.messages.create({
        boardId,
        authorType: "human",
        authorId: "user",
        content: userMessage,
      });

      // Build shared conversation history
      const conversationHistory: Array<{
        agentId: string;
        agentName: string;
        content: string;
      }> = [];

      const results: Array<{
        agentId: string;
        agentName: string;
        message: string;
        toolCalls: Array<{ name: string; input: unknown; result: unknown }>;
      }> = [];

      // Round-robin conversation
      for (let round = 0; round < maxRounds; round++) {
        for (const agentId of agentIds) {
          const agent = services.agents.getById(agentId);
          if (!agent) continue;

          // Resolve LLM settings for this agent
          const llmSettings: LLMSettings | null = agent.llmConfig
            ? JSON.parse(agent.llmConfig)
            : settingsSvc.getLLMSettings();

          if (!llmSettings) {
            const errMsg = `No LLM settings for agent ${agent.name}`;
            results.push({
              agentId,
              agentName: agent.name,
              message: errMsg,
              toolCalls: [],
            });
            continue;
          }

          // Emit SSE event for agent's turn
          sseEmitter.emit(`board:${boardId}`, {
            type: "multi-chat:agent-turn",
            data: { agentId, agentName: agent.name, round },
          });

          // Build messages for this agent
          const systemPrompt = [
            `You are ${agent.name}, a ${agent.role}.`,
            agent.persona ?? "",
            `\nYou are participating in a multi-agent discussion on board "${board.name}".`,
            `Other agents in this discussion: ${agentIds
              .filter((id) => id !== agentId)
              .map((id) => {
                const a = services.agents.getById(id);
                return a ? `${a.name} (${a.role})` : id;
              })
              .join(", ")}`,
            `\nRespond concisely. You can use board tools to take actions.`,
            `Board ID: ${boardId}`,
          ]
            .filter(Boolean)
            .join("\n");

          const msgs: ChatMessage[] = [
            { role: "system", content: systemPrompt },
          ];

          // Add conversation history as context
          if (conversationHistory.length > 0) {
            const historyText = conversationHistory
              .map((h) => `**${h.agentName}**: ${h.content}`)
              .join("\n\n");
            msgs.push({
              role: "user",
              content: `Previous discussion:\n${historyText}\n\nUser's original message: ${userMessage}\n\nIt's your turn to respond.`,
            });
          } else {
            msgs.push({ role: "user", content: userMessage });
          }

          const agentToolCalls: Array<{
            name: string;
            input: unknown;
            result: unknown;
          }> = [];

          // Tool-use loop
          let response = await callLLM(llmSettings, msgs, boardTools);

          let iterations = 0;
          while (response.toolCalls.length > 0 && iterations < 5) {
            iterations++;
            msgs.push({
              role: "assistant",
              content: response.content ?? "",
              tool_calls: response.toolCalls,
            });

            for (const tc of response.toolCalls) {
              const toolInput = JSON.parse(tc.arguments);
              if (!toolInput.boardId) toolInput.boardId = boardId;
              const result = executeTool(tc.name, toolInput, services);
              agentToolCalls.push({
                name: tc.name,
                input: toolInput,
                result,
              });
              msgs.push({
                role: "tool",
                content: JSON.stringify(result),
                tool_call_id: tc.id,
              });
            }

            response = await callLLM(llmSettings, msgs, boardTools);
          }

          const agentMessage = response.content ?? "";

          // Save agent's message to board thread
          services.messages.create({
            boardId,
            authorType: "agent",
            authorId: agent.name,
            content: agentMessage,
          });

          conversationHistory.push({
            agentId,
            agentName: agent.name,
            content: agentMessage,
          });

          results.push({
            agentId,
            agentName: agent.name,
            message: agentMessage,
            toolCalls: agentToolCalls,
          });

          // Emit SSE for the response
          sseEmitter.emit(`board:${boardId}`, {
            type: "multi-chat:agent-response",
            data: { agentId, agentName: agent.name, message: agentMessage },
          });
        }
      }

      // Emit SSE that board was updated (tools may have been called)
      sseEmitter.emit(`board:${boardId}`, {
        type: "board:updated",
        data: { source: "multi-chat" },
      });

      return {
        userMessage: userMsg,
        results,
        rounds: maxRounds,
      };
    },
  };
}
