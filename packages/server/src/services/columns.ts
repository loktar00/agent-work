import { eq, asc } from "drizzle-orm";
import { columns } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type {
  CreateColumnInput,
  UpdateColumnInput,
} from "@agent-board/shared";
import { newId } from "../utils.js";

export function columnService(db: DB) {
  return {
    listByBoard(boardId: string) {
      return db
        .select()
        .from(columns)
        .where(eq(columns.boardId, boardId))
        .orderBy(asc(columns.position))
        .all();
    },

    getById(id: string) {
      return db.select().from(columns).where(eq(columns.id, id)).get();
    },

    create(input: CreateColumnInput) {
      const id = newId();
      const row = {
        id,
        boardId: input.boardId,
        name: input.name,
        position: input.position,
        agentId: input.agentId ?? null,
        wipLimit: input.wipLimit ?? null,
      };
      db.insert(columns).values(row).run();
      return row;
    },

    update(id: string, input: UpdateColumnInput) {
      const existing = db
        .select()
        .from(columns)
        .where(eq(columns.id, id))
        .get();
      if (!existing) return null;
      db.update(columns).set(input).where(eq(columns.id, id)).run();
      return db.select().from(columns).where(eq(columns.id, id)).get();
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(columns)
        .where(eq(columns.id, id))
        .get();
      if (!existing) return false;
      db.delete(columns).where(eq(columns.id, id)).run();
      return true;
    },

    reorder(boardId: string, orderedIds: string[]) {
      for (let i = 0; i < orderedIds.length; i++) {
        db.update(columns)
          .set({ position: i })
          .where(eq(columns.id, orderedIds[i]))
          .run();
      }
      return this.listByBoard(boardId);
    },
  };
}
