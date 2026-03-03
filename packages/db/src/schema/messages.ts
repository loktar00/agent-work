import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { boards } from "./boards.ts";
import { cards } from "./cards.ts";
import { runs } from "./runs.ts";

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    cardId: text("card_id").references(() => cards.id, {
      onDelete: "cascade",
    }),
    runId: text("run_id").references(() => runs.id, { onDelete: "set null" }),
    authorType: text("author_type").notNull(),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("messages_board_id_idx").on(table.boardId),
    index("messages_card_id_idx").on(table.cardId),
  ],
);
