import { eq } from "drizzle-orm";
import { artifacts } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateArtifactInput } from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function artifactService(db: DB) {
  return {
    listByCard(cardId: string) {
      return db
        .select()
        .from(artifacts)
        .where(eq(artifacts.cardId, cardId))
        .all();
    },

    listByRun(runId: string) {
      return db
        .select()
        .from(artifacts)
        .where(eq(artifacts.runId, runId))
        .all();
    },

    getById(id: string) {
      return db.select().from(artifacts).where(eq(artifacts.id, id)).get();
    },

    create(input: CreateArtifactInput) {
      const id = newId();
      const ts = now();
      const row = {
        id,
        cardId: input.cardId,
        runId: input.runId ?? null,
        type: input.type,
        name: input.name,
        content: input.content ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt: ts,
      };
      db.insert(artifacts).values(row).run();
      return row;
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(artifacts)
        .where(eq(artifacts.id, id))
        .get();
      if (!existing) return false;
      db.delete(artifacts).where(eq(artifacts.id, id)).run();
      return true;
    },
  };
}
