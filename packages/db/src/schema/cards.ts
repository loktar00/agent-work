import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { boards, columns } from "./boards.ts";

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  columnId: text("column_id")
    .notNull()
    .references(() => columns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"),
  priority: text("priority").notNull().default("medium"),
  position: integer("position").notNull().default(0),
  assigneeAgentId: text("assignee_agent_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const subtasks = sqliteTable("subtasks", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const acceptanceCriteria = sqliteTable("acceptance_criteria", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  position: integer("position").notNull().default(0),
});
