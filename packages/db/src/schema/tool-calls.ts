import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { boards } from "./boards.ts";
import { runs } from "./runs.ts";
import { messages } from "./messages.ts";
import { agents } from "./agents.ts";

export const toolCalls = sqliteTable(
  "tool_calls",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => runs.id, { onDelete: "set null" }),
    messageId: text("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    agentId: text("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    toolName: text("tool_name").notNull(),
    input: text("input"),
    result: text("result"),
    status: text("status").notNull(),
    error: text("error"),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at").notNull(),
    durationMs: integer("duration_ms").notNull(),
  },
  (table) => [
    index("tool_calls_board_id_idx").on(table.boardId),
    index("tool_calls_run_id_idx").on(table.runId),
    index("tool_calls_agent_id_idx").on(table.agentId),
    index("tool_calls_tool_name_idx").on(table.toolName),
  ],
);
