import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { boards } from "./boards.ts";

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    diff: text("diff"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("audit_log_board_id_idx").on(table.boardId),
    index("audit_log_entity_idx").on(table.entity, table.entityId),
  ],
);
