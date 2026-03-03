import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { cards } from "./cards.ts";
import { runs } from "./runs.ts";

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => runs.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    content: text("content"),
    metadata: text("metadata"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("artifacts_card_id_idx").on(table.cardId),
    index("artifacts_run_id_idx").on(table.runId),
  ],
);
