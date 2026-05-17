import { eq } from "drizzle-orm";
import { boards } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateBoardInput, UpdateBoardInput } from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function boardService(db: DB) {
  return {
    list() {
      return db.select().from(boards).all();
    },

    getById(id: string) {
      return db.select().from(boards).where(eq(boards.id, id)).get();
    },

    create(input: CreateBoardInput) {
      const id = newId();
      const ts = now();
      const row = {
        id,
        name: input.name,
        description: input.description ?? null,
        projectDir: input.projectDir ?? null,
        worktreeMode: input.worktreeMode ?? "none",
        commandingAgentId: input.commandingAgentId ?? null,
        createdAt: ts,
        updatedAt: ts,
      };
      db.insert(boards).values(row).run();
      return row;
    },

    update(id: string, input: UpdateBoardInput) {
      const existing = db.select().from(boards).where(eq(boards.id, id)).get();
      if (!existing) return null;
      const ts = now();
      db.update(boards)
        .set({ ...input, updatedAt: ts })
        .where(eq(boards.id, id))
        .run();
      return db.select().from(boards).where(eq(boards.id, id)).get();
    },

    delete(id: string) {
      const existing = db.select().from(boards).where(eq(boards.id, id)).get();
      if (!existing) return false;
      db.delete(boards).where(eq(boards.id, id)).run();
      return true;
    },
  };
}
