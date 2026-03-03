import { eq, desc } from "drizzle-orm";
import { runs, runEvents } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateRunInput, UpdateRunInput } from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function runService(db: DB) {
  return {
    listByCard(cardId: string) {
      return db
        .select()
        .from(runs)
        .where(eq(runs.cardId, cardId))
        .orderBy(desc(runs.startedAt))
        .all();
    },

    listByBoard(boardId: string) {
      return db
        .select()
        .from(runs)
        .where(eq(runs.boardId, boardId))
        .orderBy(desc(runs.startedAt))
        .all();
    },

    getById(id: string) {
      return db.select().from(runs).where(eq(runs.id, id)).get();
    },

    create(input: CreateRunInput) {
      const id = newId();
      const row = {
        id,
        boardId: input.boardId,
        cardId: input.cardId,
        agentId: input.agentId,
        runnerId: input.runnerId ?? null,
        status: "queued",
        prompt: input.prompt ?? null,
        startedAt: null,
        finishedAt: null,
        exitCode: null,
      };
      db.insert(runs).values(row).run();
      return row;
    },

    update(id: string, input: UpdateRunInput & { startedAt?: string; finishedAt?: string }) {
      const existing = db.select().from(runs).where(eq(runs.id, id)).get();
      if (!existing) return null;
      db.update(runs).set(input).where(eq(runs.id, id)).run();
      return db.select().from(runs).where(eq(runs.id, id)).get();
    },

    cancel(id: string) {
      return this.update(id, { status: "cancelled", finishedAt: now() });
    },

    addEvent(runId: string, type: string, data: string) {
      const id = newId();
      const ts = now();
      const row = { id, runId, type, data, timestamp: ts };
      db.insert(runEvents).values(row).run();
      return row;
    },

    getEvents(runId: string) {
      return db
        .select()
        .from(runEvents)
        .where(eq(runEvents.runId, runId))
        .all();
    },
  };
}
