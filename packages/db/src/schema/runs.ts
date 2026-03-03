import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { boards } from "./boards.ts";
import { cards } from "./cards.ts";
import { agents } from "./agents.ts";

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    runnerId: text("runner_id"),
    status: text("status").notNull().default("queued"),
    prompt: text("prompt"),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    exitCode: integer("exit_code"),
  },
  (table) => [
    index("runs_card_id_idx").on(table.cardId),
    index("runs_agent_id_idx").on(table.agentId),
    index("runs_status_idx").on(table.status),
  ],
);

export const runEvents = sqliteTable(
  "run_events",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: text("data").notNull(),
    timestamp: text("timestamp").notNull(),
  },
  (table) => [index("run_events_run_id_idx").on(table.runId)],
);
