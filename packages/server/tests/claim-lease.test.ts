import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
  createAgent,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Claim & Lease", () => {
  let app: FastifyInstance;
  let boardId: string;
  let colId: string;
  let cardId: string;
  let agentId: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
    const col = await createColumn(app, boardId, "Todo", 0);
    colId = col.id;
    const card = await createCard(app, boardId, colId, "Lease Card");
    cardId = card.id;
    const agent = await createAgent(app, "Agent A", "developer");
    agentId = agent.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("should claim a card", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId, durationMs: 60000 },
    });

    expect(res.statusCode).toBe(201);
    const lease = JSON.parse(res.body);
    expect(lease.cardId).toBe(cardId);
    expect(lease.agentId).toBe(agentId);
    expect(lease.id).toBeDefined();
    expect(lease.expiresAt).toBeDefined();
  });

  it("should renew a lease", async () => {
    const claimRes = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId, durationMs: 60000 },
    });
    const lease = JSON.parse(claimRes.body);

    const renewRes = await app.inject({
      method: "POST",
      url: `/api/leases/${lease.id}/renew`,
      payload: { durationMs: 120000 },
    });

    expect(renewRes.statusCode).toBe(200);
    const renewed = JSON.parse(renewRes.body);
    expect(renewed.renewedAt).toBeDefined();
    // New expiry should be later than original
    expect(new Date(renewed.expiresAt).getTime()).toBeGreaterThanOrEqual(
      new Date(lease.expiresAt).getTime()
    );
  });

  it("should release a lease", async () => {
    const claimRes = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId },
    });
    const lease = JSON.parse(claimRes.body);

    const releaseRes = await app.inject({
      method: "POST",
      url: `/api/leases/${lease.id}/release`,
      payload: {},
    });

    expect(releaseRes.statusCode).toBe(200);
    expect(JSON.parse(releaseRes.body).success).toBe(true);

    // After release, the lease is no longer active
    const leaseCheck = await app.inject({
      method: "GET",
      url: `/api/cards/${cardId}/lease`,
    });
    const leaseData = JSON.parse(leaseCheck.body);
    // Should either return { active: false } or a lease with expired time
    expect(leaseData.active === false || new Date(leaseData.expiresAt) <= new Date()).toBe(true);
  });

  it("should block concurrent claim by a different agent", async () => {
    const agent2 = await createAgent(app, "Agent B", "reviewer");

    // Agent A claims
    await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId, durationMs: 300000 },
    });

    // Agent B tries to claim same card
    const res = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId: agent2.id, durationMs: 60000 },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("already claimed");
  });

  it("should allow re-claim after release", async () => {
    const agent2 = await createAgent(app, "Agent B", "reviewer");

    // Agent A claims and releases
    const claimRes = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId },
    });
    const lease = JSON.parse(claimRes.body);

    await app.inject({
      method: "POST",
      url: `/api/leases/${lease.id}/release`,
      payload: {},
    });

    // Agent B can now claim
    const res = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId, agentId: agent2.id },
    });

    expect(res.statusCode).toBe(201);
    const newLease = JSON.parse(res.body);
    expect(newLease.agentId).toBe(agent2.id);
  });
});
