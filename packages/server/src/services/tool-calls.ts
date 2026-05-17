import { toolCalls } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import { eq } from "drizzle-orm";
import { newId } from "../utils.js";

export interface RecordToolCallInput {
  boardId: string;
  runId?: string | null;
  messageId?: string | null;
  agentId?: string | null;
  toolName: string;
  input?: Record<string, unknown> | null;
  result?: unknown;
  status: "completed" | "failed" | "denied";
  error?: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

function parseResult(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function toolCallService(db: DB) {
  return {
    record(input: RecordToolCallInput) {
      const row = {
        id: newId(),
        boardId: input.boardId,
        runId: input.runId ?? null,
        messageId: input.messageId ?? null,
        agentId: input.agentId ?? null,
        toolName: input.toolName,
        input: input.input ? JSON.stringify(input.input) : null,
        result:
          input.result === undefined ? null : JSON.stringify(input.result),
        status: input.status,
        error: input.error ?? null,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationMs: input.durationMs,
      };
      db.insert(toolCalls).values(row).run();
      return {
        ...row,
        input: input.input ?? null,
        result: input.result ?? null,
      };
    },

    listByBoard(boardId: string) {
      return db
        .select()
        .from(toolCalls)
        .where(eq(toolCalls.boardId, boardId))
        .all()
        .map((row) => ({
          ...row,
          input: parseResult(row.input),
          result: parseResult(row.result),
        }));
    },
  };
}
