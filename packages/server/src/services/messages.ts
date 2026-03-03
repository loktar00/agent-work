import { eq, desc, and, isNull } from "drizzle-orm";
import { messages } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type { CreateMessageInput } from "@agent-board/shared";
import { newId, now } from "../utils.js";

export function messageService(db: DB) {
  return {
    listByCard(cardId: string, limit = 50) {
      return db
        .select()
        .from(messages)
        .where(eq(messages.cardId, cardId))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .all()
        .reverse();
    },

    listProjectThread(boardId: string, limit = 50) {
      return db
        .select()
        .from(messages)
        .where(and(eq(messages.boardId, boardId), isNull(messages.cardId)))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .all()
        .reverse();
    },

    create(input: CreateMessageInput) {
      const id = newId();
      const ts = now();
      const row = {
        id,
        boardId: input.boardId,
        cardId: input.cardId ?? null,
        runId: input.runId ?? null,
        authorType: input.authorType,
        authorId: input.authorId,
        content: input.content,
        createdAt: ts,
      };
      db.insert(messages).values(row).run();
      return row;
    },
  };
}
