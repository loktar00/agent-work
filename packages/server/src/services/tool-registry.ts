import type { EventEmitter } from "node:events";
import { boardTools } from "../llm/tools.js";
import type { ToolDef } from "../llm/provider.js";
import type { boardService } from "./boards.js";
import type { columnService } from "./columns.js";
import type { cardService } from "./cards.js";
import type { subtaskService } from "./subtasks.js";
import type { agentService } from "./agents.js";
import type { messageService } from "./messages.js";
import type { documentService } from "./documents.js";
import type { runService } from "./runs.js";
import type { auditService } from "./audit.js";
import type { agentCatalogService } from "./agent-catalog.js";
import type { toolCallService } from "./tool-calls.js";
import { now } from "../utils.js";

export interface ToolRegistryServices {
  boards: ReturnType<typeof boardService>;
  columns: ReturnType<typeof columnService>;
  cards: ReturnType<typeof cardService>;
  subtasks: ReturnType<typeof subtaskService>;
  agents: ReturnType<typeof agentService>;
  messages: ReturnType<typeof messageService>;
  documents: ReturnType<typeof documentService>;
  runs: ReturnType<typeof runService>;
  audit: ReturnType<typeof auditService>;
  agentCatalog: ReturnType<typeof agentCatalogService>;
  toolCalls: ReturnType<typeof toolCallService>;
}

export interface ToolExecutionContext {
  boardId: string;
  actorType: "human" | "agent" | "system" | "worker";
  actorId: string;
  agentId?: string | null;
  runId?: string | null;
  messageId?: string | null;
}

interface ToolRegistryOptions {
  services: ToolRegistryServices;
  sseEmitter: EventEmitter;
  trigger?: {
    onCardMoved(card: {
      id: string;
      boardId: string;
      columnId: string;
    }): unknown;
  };
  runQueue?: {
    enqueue(runId: string): void;
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function allowedByPermissions(
  permissions: Record<string, unknown> | null | undefined,
  toolName: string,
) {
  if (!permissions) return true;

  const allowed = Array.isArray(permissions.allowedTools)
    ? permissions.allowedTools.filter((item): item is string => typeof item === "string")
    : null;
  const denied = Array.isArray(permissions.deniedTools)
    ? permissions.deniedTools.filter((item): item is string => typeof item === "string")
    : [];

  if (denied.includes(toolName)) return false;
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes("*") || allowed.includes(toolName);
}

function matchesPresetQuery(
  preset: { name: string; role: string; division: string | null; description: string | null; tags: string[] },
  query?: string,
  division?: string,
) {
  if (division && preset.division !== division) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return [preset.name, preset.role, preset.division, preset.description, ...preset.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function toolRegistry({
  services,
  sseEmitter,
  trigger,
  runQueue,
}: ToolRegistryOptions) {
  async function isAllowed(ctx: ToolExecutionContext, toolName: string) {
    const agentId = ctx.agentId ?? (ctx.actorType === "agent" ? ctx.actorId : null);
    if (!agentId) return true;
    const agent = services.agents.getById(agentId);
    if (!agent) return false;
    return allowedByPermissions(agent.toolPermissions, toolName);
  }

  function listTools(ctx?: Partial<ToolExecutionContext>): ToolDef[] {
    if (!ctx?.agentId && ctx?.actorType !== "agent") return boardTools;

    const agentId = ctx.agentId ?? ctx.actorId;
    if (!agentId) return boardTools;
    const agent = agentId ? services.agents.getById(agentId) : null;
    if (!agent) return [];
    return boardTools.filter((tool) =>
      allowedByPermissions(agent.toolPermissions, tool.name),
    );
  }

  function emitBoardUpdated(boardId: string, source: string, toolName: string) {
    sseEmitter.emit(boardId, {
      type: "board:updated",
      data: { source, tool: toolName },
    });
    sseEmitter.emit(`board:${boardId}`, {
      event: "board:updated",
      data: { source, tool: toolName },
    });
  }

  function maybeTriggerCardMove(
    boardId: string,
    result: unknown,
  ) {
    if (!trigger || !result || typeof result !== "object") return;
    const card = result as { id?: string; boardId?: string; columnId?: string };
    if (card.id && card.columnId) {
      trigger.onCardMoved({
        id: card.id,
        boardId: card.boardId ?? boardId,
        columnId: card.columnId,
      });
    }
  }

  function executeInternal(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): unknown {
    const boardId = asString(input.boardId) ?? ctx.boardId;

    switch (name) {
      case "list_columns":
        return services.columns.listByBoard(boardId);

      case "create_column": {
        const cols = services.columns.listByBoard(boardId);
        return services.columns.create({
          boardId,
          name: asString(input.name) ?? "New Column",
          position: asNumber(input.position) ?? cols.length,
          agentId: (asString(input.agentId) as string | undefined) ?? null,
          wipLimit: asNumber(input.wipLimit) ?? null,
        });
      }

      case "list_cards":
        return services.cards.listByBoard(boardId);

      case "create_card":
        return services.cards.create({
          boardId,
          columnId: asString(input.columnId) ?? "",
          title: asString(input.title) ?? "Untitled Card",
          description: asString(input.description) ?? undefined,
          priority: asString(input.priority) ?? undefined,
        });

      case "update_card": {
        const updates: Record<string, unknown> = {};
        if (input.title) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.status) updates.status = input.status;
        if (input.priority) updates.priority = input.priority;
        if (input.columnId) updates.columnId = input.columnId;
        if (input.assigneeAgentId !== undefined)
          updates.assigneeAgentId = input.assigneeAgentId;
        return services.cards.update(asString(input.cardId) ?? "", updates);
      }

      case "create_subtask":
        return services.subtasks.create({
          cardId: asString(input.cardId) ?? "",
          title: asString(input.title) ?? "Untitled Subtask",
          description: asString(input.description) ?? undefined,
        });

      case "move_card":
        return services.cards.move(asString(input.cardId) ?? "", {
          columnId: asString(input.columnId) ?? "",
          position: asNumber(input.position) ?? 0,
        });

      case "assign_agent_to_column":
        return services.columns.update(asString(input.columnId) ?? "", {
          agentId: asString(input.agentId) ?? null,
        });

      case "list_agents":
        return services.agents.list();

      case "get_board_context": {
        const board = services.boards.getById(boardId);
        const cols = services.columns.listByBoard(boardId);
        const allCards = services.cards.listByBoard(boardId);
        return {
          board,
          columns: cols.map((col) => ({
            ...col,
            cards: allCards.filter((card) => card.columnId === col.id),
          })),
        };
      }

      case "send_message":
        return services.messages.create({
          boardId,
          cardId: asString(input.cardId) ?? null,
          runId: ctx.runId ?? asString(input.runId) ?? null,
          authorType: asString(input.authorType) ?? "agent",
          authorId: asString(input.authorId) ?? ctx.actorId,
          content: asString(input.content) ?? "",
        });

      case "complete_subtask": {
        const subtaskId = asString(input.subtaskId);
        const title = asString(input.title);
        const cardId = asString(input.cardId) ?? "";

        if (subtaskId) {
          return services.subtasks.update(subtaskId, {
            completed: true,
            status: "pass",
          });
        }
        if (title && cardId) {
          const match = services
            .subtasks
            .listByCard(cardId)
            .find((subtask) => subtask.title.toLowerCase() === title.toLowerCase());
          if (match) {
            return services.subtasks.update(match.id, {
              completed: true,
              status: "pass",
            });
          }
          return { error: `Subtask "${title}" not found on card ${cardId}` };
        }
        return { error: "Provide subtaskId or both cardId and title" };
      }

      case "update_subtask": {
        const updateData: Record<string, unknown> = {};
        if (input.completed !== undefined) updateData.completed = input.completed;
        if (input.status !== undefined) updateData.status = input.status;
        return services.subtasks.update(asString(input.subtaskId) ?? "", updateData);
      }

      case "handoff_to_agent": {
        const cardId = asString(input.cardId) ?? "";
        const targetAgentId = asString(input.targetAgentId) ?? "";
        const message = asString(input.message) ?? "Handing off to next agent.";
        const targetCol = services
          .columns
          .listByBoard(boardId)
          .find((col) => col.agentId === targetAgentId);
        if (!targetCol) return { error: `No column assigned to agent ${targetAgentId}` };

        services.messages.create({
          boardId,
          cardId,
          runId: ctx.runId ?? null,
          authorType: "agent",
          authorId: asString(input.authorId) ?? ctx.actorId,
          content: `**Handoff**: ${message}`,
        });

        return services.cards.move(cardId, {
          columnId: targetCol.id,
          position: 0,
        });
      }

      case "list_agent_columns": {
        const agentList = services.agents.list();
        const agentMap = new Map(agentList.map((agent) => [agent.id, agent]));
        return services.columns.listByBoard(boardId).map((col) => ({
          columnId: col.id,
          columnName: col.name,
          agentId: col.agentId,
          agentName: col.agentId ? agentMap.get(col.agentId)?.name ?? null : null,
          agentRole: col.agentId ? agentMap.get(col.agentId)?.role ?? null : null,
        }));
      }

      case "read_project_doc":
        return services.documents.listByBoard(boardId);

      case "update_project_doc_section": {
        const section = asString(input.section) ?? "";
        const content = asString(input.content) ?? "";
        const title =
          asString(input.title) ??
          section.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const updatedBy = asString(input.updatedBy) ?? ctx.actorId;
        const existing = services.documents.getByBoardAndSection(boardId, section);
        if (existing) {
          return services.documents.update(existing.id, { content, title, updatedBy });
        }
        const docs = services.documents.listByBoard(boardId);
        const position =
          docs.length > 0 ? Math.max(...docs.map((doc) => doc.position)) + 1 : 0;
        return services.documents.create({
          boardId,
          section,
          title,
          content,
          updatedBy,
          position,
        });
      }

      case "list_agent_presets": {
        const query = asString(input.query);
        const division = asString(input.division);
        return services.agentCatalog
          .list()
          .filter((preset) => matchesPresetQuery(preset, query, division));
      }

      case "inspect_agent_preset":
        return (
          services.agentCatalog.getById(asString(input.presetId) ?? "") ??
          { error: "Agent preset not found" }
        );

      case "recommend_agents_for_goal":
        return services.agentCatalog.recommend(
          asString(input.goal) ?? "",
          asNumber(input.limit) ?? 5,
        );

      case "create_agent_from_preset": {
        const agent = services.agentCatalog.instantiate(
          asString(input.presetId) ?? "",
          {
            name: asString(input.name),
            runnerId: asString(input.runnerId) ?? undefined,
            modelConfig: asRecord(input.modelConfig) ?? undefined,
            toolPermissions: asRecord(input.toolPermissions) ?? undefined,
          },
          services.agents,
        );
        return agent ?? { error: "Agent preset not found" };
      }

      case "create_run": {
        const run = services.runs.create({
          boardId,
          cardId: asString(input.cardId) ?? "",
          agentId: asString(input.agentId) ?? "",
          runnerId: asString(input.runnerId) ?? undefined,
          prompt: asString(input.prompt) ?? undefined,
        });
        services.audit.log({
          boardId,
          entity: "run",
          entityId: run.id,
          action: "create",
          actorType: ctx.actorType,
          actorId: ctx.actorId,
          diff: { tool: "create_run", agentId: run.agentId, cardId: run.cardId },
        });
        runQueue?.enqueue(run.id);
        return run;
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async function execute(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ) {
    const boardId = asString(input.boardId) ?? ctx.boardId;
    const startedAt = now();
    const started = Date.now();
    const agentId = ctx.agentId ?? (ctx.actorType === "agent" ? ctx.actorId : null);

    if (!(await isAllowed(ctx, name))) {
      const finishedAt = now();
      const result = { error: `Tool "${name}" is not allowed for this agent.` };
      services.toolCalls.record({
        boardId,
        runId: ctx.runId,
        messageId: ctx.messageId,
        agentId,
        toolName: name,
        input,
        result,
        status: "denied",
        error: result.error,
        startedAt,
        finishedAt,
        durationMs: Date.now() - started,
      });
      return result;
    }

    try {
      const result = executeInternal(name, { ...input, boardId }, ctx);
      const finishedAt = now();
      services.toolCalls.record({
        boardId,
        runId: ctx.runId,
        messageId: ctx.messageId,
        agentId,
        toolName: name,
        input,
        result,
        status: "completed",
        startedAt,
        finishedAt,
        durationMs: Date.now() - started,
      });

      emitBoardUpdated(boardId, ctx.actorType, name);
      if (name === "move_card" || name === "handoff_to_agent") {
        maybeTriggerCardMove(boardId, result);
      }
      return result;
    } catch (err: any) {
      const finishedAt = now();
      const error = err.message ?? "Tool execution failed";
      services.toolCalls.record({
        boardId,
        runId: ctx.runId,
        messageId: ctx.messageId,
        agentId,
        toolName: name,
        input,
        status: "failed",
        error,
        startedAt,
        finishedAt,
        durationMs: Date.now() - started,
      });
      return { error };
    }
  }

  return {
    listTools,
    execute,
  };
}

export type ToolRegistry = ReturnType<typeof toolRegistry>;
