import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { boards } from "./boards.ts";

export const boardDocuments = sqliteTable(
  "board_documents",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    updatedBy: text("updated_by"),
    updatedAt: text("updated_at").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [index("board_documents_board_id_idx").on(table.boardId)],
);
