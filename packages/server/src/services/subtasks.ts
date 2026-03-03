import { eq, asc } from "drizzle-orm";
import { subtasks } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type {
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from "@agent-board/shared";
import { newId } from "../utils.js";

export function subtaskService(db: DB) {
  return {
    listByCard(cardId: string) {
      return db
        .select()
        .from(subtasks)
        .where(eq(subtasks.cardId, cardId))
        .orderBy(asc(subtasks.position))
        .all();
    },

    getById(id: string) {
      return db.select().from(subtasks).where(eq(subtasks.id, id)).get();
    },

    create(input: CreateSubtaskInput) {
      const id = newId();
      const row = {
        id,
        cardId: input.cardId,
        title: input.title,
        completed: false,
        position: input.position ?? 0,
      };
      db.insert(subtasks).values(row).run();
      return row;
    },

    update(id: string, input: UpdateSubtaskInput) {
      const existing = db
        .select()
        .from(subtasks)
        .where(eq(subtasks.id, id))
        .get();
      if (!existing) return null;
      db.update(subtasks).set(input).where(eq(subtasks.id, id)).run();
      return db.select().from(subtasks).where(eq(subtasks.id, id)).get();
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(subtasks)
        .where(eq(subtasks.id, id))
        .get();
      if (!existing) return false;
      db.delete(subtasks).where(eq(subtasks.id, id)).run();
      return true;
    },
  };
}
