import type { boardService } from "./boards.js";
import type { columnService } from "./columns.js";
import type { cardService } from "./cards.js";
import type { subtaskService } from "./subtasks.js";
import type { agentService } from "./agents.js";
import type { messageService } from "./messages.js";
import type { contextBuilder } from "./context.js";
import type { settingsService } from "./settings.js";
import { callLLM } from "../llm/provider.js";
import type { ChatMessage } from "../llm/provider.js";
import { boardTools } from "../llm/tools.js";
import { executeTool } from "../llm/executor.js";

interface Services {
  boards: ReturnType<typeof boardService>;
  columns: ReturnType<typeof columnService>;
  cards: ReturnType<typeof cardService>;
  subtasks: ReturnType<typeof subtaskService>;
  agents: ReturnType<typeof agentService>;
  messages: ReturnType<typeof messageService>;
  context: ReturnType<typeof contextBuilder>;
}

export function orchestratorService(
  services: Services,
  settings: ReturnType<typeof settingsService>,
) {
  return {
    async chat(
      boardId: string,
      message: string,
      history?: Array<{ role: string; content: string }>,
    ) {
      const llmSettings = settings.getLLMSettings();
      if (!llmSettings) {
        throw new Error("LLM not configured. Go to Settings to set up a provider.");
      }

      const board = services.boards.getById(boardId);
      if (!board) throw new Error("Board not found");

      // Save user message to board thread
      const userMsg = services.messages.create({
        boardId,
        authorType: "human",
        authorId: "user",
        content: message,
      });

      const systemPrompt = `You are a Project Manager (PM) for the board "${board.name}". You help manage the kanban board by creating columns, cards, subtasks, and organizing work.

When the user asks you to do something on the board, use the available tools to make changes. Always use boardId="${boardId}" when calling tools that need it.

Be concise in your responses. After making changes, briefly summarize what you did.`;

      // Build messages array
      const msgs: ChatMessage[] = [
        { role: "system", content: systemPrompt },
      ];

      if (history) {
        for (const h of history) {
          msgs.push({
            role: h.role as "user" | "assistant",
            content: h.content,
          });
        }
      }
      msgs.push({ role: "user", content: message });

      const toolCallResults: Array<{
        name: string;
        input: Record<string, unknown>;
        result: unknown;
      }> = [];

      // Tool-use loop
      let response = await callLLM(llmSettings, msgs, boardTools);

      while (response.toolCalls.length > 0) {
        // Add assistant message with tool calls
        msgs.push({
          role: "assistant",
          content: response.content ?? "",
          tool_calls: response.toolCalls,
        });

        // Execute each tool and add results
        for (const tc of response.toolCalls) {
          const input = JSON.parse(tc.arguments);
          const result = executeTool(tc.name, input, services);
          toolCallResults.push({ name: tc.name, input, result });
          msgs.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: tc.id,
          });
        }

        response = await callLLM(llmSettings, msgs, boardTools);
      }

      const finalText = response.content ?? "";

      // Save assistant response
      services.messages.create({
        boardId,
        authorType: "agent",
        authorId: "orchestrator",
        content: finalText,
      });

      return {
        message: finalText,
        toolCalls: toolCallResults,
        userMessage: userMsg,
      };
    },
  };
}
