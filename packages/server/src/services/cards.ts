import { eq, and, asc } from "drizzle-orm";
import { cards } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type {
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
} from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function cardService(db: DB) {
  return {
    listByBoard(boardId: string) {
      return db
        .select()
        .from(cards)
        .where(eq(cards.boardId, boardId))
        .orderBy(asc(cards.position))
        .all();
    },

    listByColumn(columnId: string) {
      return db
        .select()
        .from(cards)
        .where(eq(cards.columnId, columnId))
        .orderBy(asc(cards.position))
        .all();
    },

    getById(id: string) {
      return db.select().from(cards).where(eq(cards.id, id)).get();
    },

    create(input: CreateCardInput) {
      const id = newId();
      const ts = now();
      const row = {
        id,
        boardId: input.boardId,
        columnId: input.columnId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "backlog",
        priority: input.priority ?? "medium",
        position: input.position ?? 0,
        assigneeAgentId: input.assigneeAgentId ?? null,
        createdAt: ts,
        updatedAt: ts,
      };
      db.insert(cards).values(row).run();
      return row;
    },

    update(id: string, input: UpdateCardInput) {
      const existing = db.select().from(cards).where(eq(cards.id, id)).get();
      if (!existing) return null;
      const ts = now();
      db.update(cards)
        .set({ ...input, updatedAt: ts })
        .where(eq(cards.id, id))
        .run();
      return db.select().from(cards).where(eq(cards.id, id)).get();
    },

    move(id: string, input: MoveCardInput) {
      const existing = db.select().from(cards).where(eq(cards.id, id)).get();
      if (!existing) return null;
      const ts = now();
      db.update(cards)
        .set({ columnId: input.columnId, position: input.position, updatedAt: ts })
        .where(eq(cards.id, id))
        .run();
      return db.select().from(cards).where(eq(cards.id, id)).get();
    },

    delete(id: string) {
      const existing = db.select().from(cards).where(eq(cards.id, id)).get();
      if (!existing) return false;
      db.delete(cards).where(eq(cards.id, id)).run();
      return true;
    },
  };
}
