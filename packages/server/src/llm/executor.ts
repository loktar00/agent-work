import type { boardService } from "../services/boards.js";
import type { columnService } from "../services/columns.js";
import type { cardService } from "../services/cards.js";
import type { subtaskService } from "../services/subtasks.js";
import type { agentService } from "../services/agents.js";
import type { messageService } from "../services/messages.js";

export interface ExecutorServices {
  boards: ReturnType<typeof boardService>;
  columns: ReturnType<typeof columnService>;
  cards: ReturnType<typeof cardService>;
  subtasks: ReturnType<typeof subtaskService>;
  agents: ReturnType<typeof agentService>;
  messages?: ReturnType<typeof messageService>;
}

export function executeTool(
  name: string,
  input: Record<string, unknown>,
  services: ExecutorServices,
): unknown {
  switch (name) {
    case "list_columns":
      return services.columns.listByBoard(input.boardId as string);

    case "create_column": {
      const cols = services.columns.listByBoard(input.boardId as string);
      return services.columns.create({
        boardId: input.boardId as string,
        name: input.name as string,
        position: (input.position as number) ?? cols.length,
      });
    }

    case "list_cards":
      return services.cards.listByBoard(input.boardId as string);

    case "create_card":
      return services.cards.create({
        boardId: input.boardId as string,
        columnId: input.columnId as string,
        title: input.title as string,
        description: (input.description as string) ?? undefined,
        priority: (input.priority as string) ?? undefined,
      });

    case "update_card": {
      const updates: Record<string, unknown> = {};
      if (input.title) updates.title = input.title;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.status) updates.status = input.status;
      if (input.priority) updates.priority = input.priority;
      if (input.columnId) updates.columnId = input.columnId;
      if (input.assigneeAgentId !== undefined)
        updates.assigneeAgentId = input.assigneeAgentId;
      return services.cards.update(input.cardId as string, updates);
    }

    case "create_subtask":
      return services.subtasks.create({
        cardId: input.cardId as string,
        title: input.title as string,
        description: (input.description as string) ?? undefined,
      });

    case "move_card":
      return services.cards.move(input.cardId as string, {
        columnId: input.columnId as string,
        position: (input.position as number) ?? 0,
      });

    case "assign_agent_to_column":
      return services.columns.update(input.columnId as string, {
        agentId: (input.agentId as string) ?? null,
      });

    case "list_agents":
      return services.agents.list();

    case "get_board_context": {
      const board = services.boards.getById(input.boardId as string);
      const cols = services.columns.listByBoard(input.boardId as string);
      const allCards = services.cards.listByBoard(input.boardId as string);
      return {
        board,
        columns: cols.map((col) => ({
          ...col,
          cards: allCards.filter((c) => c.columnId === col.id),
        })),
      };
    }

    case "send_message": {
      if (!services.messages) return { error: "Message service not available" };
      return services.messages.create({
        boardId: input.boardId as string,
        cardId: (input.cardId as string) ?? null,
        authorType: (input.authorType as string) ?? "agent",
        authorId: (input.authorId as string) ?? "agent",
        content: input.content as string,
      });
    }

    case "complete_subtask": {
      const subtaskId = input.subtaskId as string | undefined;
      const title = input.title as string | undefined;
      const cardId = input.cardId as string;

      if (subtaskId) {
        return services.subtasks.update(subtaskId, { completed: true, status: "done" });
      }
      if (title && cardId) {
        const allSubtasks = services.subtasks.listByCard(cardId);
        const match = allSubtasks.find(
          (s) => s.title.toLowerCase() === title.toLowerCase(),
        );
        if (match) {
          return services.subtasks.update(match.id, { completed: true, status: "done" });
        }
        return { error: `Subtask "${title}" not found on card ${cardId}` };
      }
      return { error: "Provide subtaskId or both cardId and title" };
    }

    case "update_subtask": {
      const sid = input.subtaskId as string;
      const completed = input.completed as boolean | undefined;
      const status = input.status as string | undefined;
      const updateData: Record<string, unknown> = {};
      if (completed !== undefined) updateData.completed = completed;
      if (status !== undefined) updateData.status = status;
      return services.subtasks.update(sid, updateData);
    }

    case "handoff_to_agent": {
      if (!services.messages) return { error: "Message service not available" };
      const handoffCardId = input.cardId as string;
      const targetAgentId = input.targetAgentId as string;
      const handoffMessage = (input.message as string) ?? "Handing off to next agent.";

      // Find target agent's column
      const allCols = services.columns.listByBoard(input.boardId as string);
      const targetCol = allCols.find((c) => c.agentId === targetAgentId);
      if (!targetCol) return { error: `No column assigned to agent ${targetAgentId}` };

      // Post handoff message
      services.messages.create({
        boardId: input.boardId as string,
        cardId: handoffCardId,
        authorType: "agent",
        authorId: (input.authorId as string) ?? "agent",
        content: `**Handoff**: ${handoffMessage}`,
      });

      // Move card to target agent's column
      return services.cards.move(handoffCardId, {
        columnId: targetCol.id,
        position: 0,
      });
    }

    case "list_agent_columns": {
      const cols = services.columns.listByBoard(input.boardId as string);
      const agentList = services.agents.list();
      const agentMap = new Map(agentList.map((a) => [a.id, a]));
      return cols.map((col) => ({
        columnId: col.id,
        columnName: col.name,
        agentId: col.agentId,
        agentName: col.agentId ? agentMap.get(col.agentId)?.name ?? null : null,
        agentRole: col.agentId ? agentMap.get(col.agentId)?.role ?? null : null,
      }));
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
