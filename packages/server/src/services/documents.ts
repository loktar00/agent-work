import { eq, and, asc } from "drizzle-orm";
import { boardDocuments } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type {
  CreateBoardDocumentInput,
  UpdateBoardDocumentInput,
} from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function documentService(db: DB) {
  return {
    listByBoard(boardId: string) {
      return db
        .select()
        .from(boardDocuments)
        .where(eq(boardDocuments.boardId, boardId))
        .orderBy(asc(boardDocuments.position))
        .all();
    },

    getByBoardAndSection(boardId: string, section: string) {
      return db
        .select()
        .from(boardDocuments)
        .where(
          and(
            eq(boardDocuments.boardId, boardId),
            eq(boardDocuments.section, section),
          ),
        )
        .get();
    },

    getById(id: string) {
      return db
        .select()
        .from(boardDocuments)
        .where(eq(boardDocuments.id, id))
        .get();
    },

    create(input: CreateBoardDocumentInput) {
      const id = newId();
      const row = {
        id,
        boardId: input.boardId,
        section: input.section,
        title: input.title,
        content: input.content ?? null,
        updatedBy: input.updatedBy ?? null,
        updatedAt: now(),
        position: input.position ?? 0,
      };
      db.insert(boardDocuments).values(row).run();
      return row;
    },

    update(id: string, input: UpdateBoardDocumentInput) {
      const existing = db
        .select()
        .from(boardDocuments)
        .where(eq(boardDocuments.id, id))
        .get();
      if (!existing) return null;
      db.update(boardDocuments)
        .set({ ...input, updatedAt: now() })
        .where(eq(boardDocuments.id, id))
        .run();
      return db
        .select()
        .from(boardDocuments)
        .where(eq(boardDocuments.id, id))
        .get();
    },

    delete(id: string) {
      const existing = db
        .select()
        .from(boardDocuments)
        .where(eq(boardDocuments.id, id))
        .get();
      if (!existing) return false;
      db.delete(boardDocuments).where(eq(boardDocuments.id, id)).run();
      return true;
    },
  };
}
