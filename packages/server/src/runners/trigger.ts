import type { DB } from "@agent-board/db";
import { columnService } from "../services/columns.js";
import { agentService } from "../services/agents.js";
import { runService } from "../services/runs.js";
import { leaseService } from "../services/leases.js";
import { auditService } from "../services/audit.js";
import type { RunQueue } from "./queue.js";

/**
 * When a card is moved to a column owned by an agent,
 * automatically enqueue a run for that agent.
 */
export function columnEntryTrigger(db: DB, runQueue: RunQueue) {
  const columns = columnService(db);
  const agents = agentService(db);
  const runs = runService(db);
  const leases = leaseService(db);
  const audit = auditService(db);

  return {
    onCardMoved(card: {
      id: string;
      boardId: string;
      columnId: string;
    }) {
      const col = columns.getById(card.columnId);
      if (!col?.agentId) return null;

      const agent = agents.getById(col.agentId);
      if (!agent) return null;

      // Try to claim lease for the agent
      const lease = leases.claim(card.id, agent.id);
      if (!lease) return null; // Another agent has the card

      // Create and enqueue run
      const run = runs.create({
        boardId: card.boardId,
        cardId: card.id,
        agentId: agent.id,
        runnerId: agent.runnerId,
        prompt: null,
      });

      audit.log({
        boardId: card.boardId,
        entity: "run",
        entityId: run.id,
        action: "create",
        actorType: "system",
        actorId: "column-trigger",
        diff: { columnId: card.columnId, agentId: agent.id },
      });

      runQueue.enqueue(run.id);
      return run;
    },
  };
}
