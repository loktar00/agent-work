import { eq, and, gt } from "drizzle-orm";
import { leases } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import { newId, now } from "../utils.js";

const DEFAULT_LEASE_MS = 5 * 60 * 1000; // 5 minutes

export function leaseService(db: DB) {
  return {
    claim(cardId: string, agentId: string, durationMs?: number) {
      const duration = durationMs ?? DEFAULT_LEASE_MS;
      const ts = now();

      // Check for active lease
      const active = db
        .select()
        .from(leases)
        .where(and(eq(leases.cardId, cardId), gt(leases.expiresAt, ts)))
        .get();

      if (active) {
        if (active.agentId === agentId) {
          // Same agent — renew
          return this.renew(active.id, duration);
        }
        return null; // Another agent holds the lease
      }

      const id = newId();
      const expiresAt = new Date(Date.now() + duration).toISOString();
      const row = {
        id,
        cardId,
        agentId,
        expiresAt,
        renewedAt: null,
        createdAt: ts,
      };
      db.insert(leases).values(row).run();
      return row;
    },

    renew(leaseId: string, durationMs?: number) {
      const duration = durationMs ?? DEFAULT_LEASE_MS;
      const existing = db
        .select()
        .from(leases)
        .where(eq(leases.id, leaseId))
        .get();
      if (!existing) return null;

      const ts = now();
      const expiresAt = new Date(Date.now() + duration).toISOString();
      db.update(leases)
        .set({ expiresAt, renewedAt: ts })
        .where(eq(leases.id, leaseId))
        .run();
      return db.select().from(leases).where(eq(leases.id, leaseId)).get();
    },

    release(leaseId: string) {
      const existing = db
        .select()
        .from(leases)
        .where(eq(leases.id, leaseId))
        .get();
      if (!existing) return false;

      // Set expiry to now to release
      db.update(leases)
        .set({ expiresAt: now() })
        .where(eq(leases.id, leaseId))
        .run();
      return true;
    },

    getActiveByCard(cardId: string) {
      const ts = now();
      return db
        .select()
        .from(leases)
        .where(and(eq(leases.cardId, cardId), gt(leases.expiresAt, ts)))
        .get() ?? null;
    },
  };
}
