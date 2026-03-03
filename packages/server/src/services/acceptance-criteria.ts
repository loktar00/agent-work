import { eq, asc } from "drizzle-orm";
import { acceptanceCriteria } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type {
  CreateAcceptanceCriterionInput,
  UpdateAcceptanceCriterionInput,
} from "@agent-board/shared";
import { newId } from "../utils.js";

export function acceptanceCriteriaService(db: DB) {
  return {
    listByCard(cardId: string) {
      return db
        .select()
        .from(acceptanceCriteria)
        .where(eq(acceptanceCriteria.cardId, cardId))
        .orderBy(asc(acceptanceCriteria.position))
        .all();
    },

    getById(id: string) {
      return db
        .select()
        .from(acceptanceCriteria)
        .where(eq(acceptanceCriteria.id, id))
        .get();
    },

    create(input: CreateAcceptanceCriterionInput) {
      const id = newId();
      const row = {
        id,
        cardId: input.cardId,
        description: input.description,
        status: "pending",
        position: input.position ?? 0,
      };
      db.insert(acceptanceCriteria).values(row).run();
      return row;
    },

    update(id: string, input: UpdateAcceptanceCriterionInput) {
      const existing = db
        .select()
        .from(acceptanceCriteria)
        .where(eq(acceptanceCriteria.id, id))
        .get();
      if (!existing) return null;
      db.update(acceptanceCriteria)
        .set(input)
        .where(eq(acceptanceCriteria.id, id))
        .run();
      return db
        .select()
        .from(acceptanceCriteria)
        .where(eq(acceptanceCriteria.id, id))
        .get();
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(acceptanceCriteria)
        .where(eq(acceptanceCriteria.id, id))
        .get();
      if (!existing) return false;
      db.delete(acceptanceCriteria)
        .where(eq(acceptanceCriteria.id, id))
        .run();
      return true;
    },
  };
}
