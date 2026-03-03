import { eq, desc } from "drizzle-orm";
import { auditLog } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import { newId, now } from "../utils.js";

export interface AuditInput {
  boardId: string;
  entity: string;
  entityId: string;
  action: string;
  actorType: string;
  actorId: string;
  diff?: Record<string, unknown> | null;
}

export function auditService(db: DB) {
  return {
    listByBoard(boardId: string, limit = 100) {
      return db
        .select()
        .from(auditLog)
        .where(eq(auditLog.boardId, boardId))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .all();
    },

    log(input: AuditInput) {
      const id = newId();
      const ts = now();
      const row = {
        id,
        boardId: input.boardId,
        entity: input.entity,
        entityId: input.entityId,
        action: input.action,
        actorType: input.actorType,
        actorId: input.actorId,
        diff: input.diff ? JSON.stringify(input.diff) : null,
        createdAt: ts,
      };
      db.insert(auditLog).values(row).run();
      return row;
    },
  };
}
