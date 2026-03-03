import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp } from "./helpers.js";
import type { FastifyInstance } from "fastify";

/**
 * E2E smoke test: walks through the full lifecycle of the board.
 * Create board -> add columns -> create agent -> create card ->
 * move card -> verify trigger/run -> verify audit trail.
 */
describe("E2E Smoke Test", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it("full lifecycle: board -> columns -> agent -> card -> move -> run -> audit", async () => {
    // 1. Create a board
    const boardRes = await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "Sprint 1", description: "First sprint" },
    });
    expect(boardRes.statusCode).toBe(201);
    const board = JSON.parse(boardRes.body);
    expect(board.name).toBe("Sprint 1");

    // 2. Add columns
    const todoRes = await app.inject({
      method: "POST",
      url: `/api/boards/${board.id}/columns`,
      payload: { name: "Todo", position: 0 },
    });
    expect(todoRes.statusCode).toBe(201);
    const todoCol = JSON.parse(todoRes.body);

    const doneRes = await app.inject({
      method: "POST",
      url: `/api/boards/${board.id}/columns`,
      payload: { name: "Done", position: 1 },
    });
    expect(doneRes.statusCode).toBe(201);
    const doneCol = JSON.parse(doneRes.body);

    // Verify columns are listed
    const colsRes = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}/columns`,
    });
    expect(JSON.parse(colsRes.body)).toHaveLength(2);

    // 3. Create an agent
    const agentRes = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { name: "Claude", role: "developer" },
    });
    expect(agentRes.statusCode).toBe(201);
    const agent = JSON.parse(agentRes.body);

    // 4. Create a card in Todo column
    const cardRes = await app.inject({
      method: "POST",
      url: `/api/boards/${board.id}/cards`,
      payload: {
        columnId: todoCol.id,
        title: "Implement auth",
        status: "todo",
        priority: "high",
        assigneeAgentId: agent.id,
      },
    });
    expect(cardRes.statusCode).toBe(201);
    const card = JSON.parse(cardRes.body);
    expect(card.title).toBe("Implement auth");
    expect(card.columnId).toBe(todoCol.id);
    expect(card.status).toBe("todo");

    // 5. Add subtasks and acceptance criteria
    const st1Res = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/subtasks`,
      payload: { title: "Design API schema", position: 0 },
    });
    expect(st1Res.statusCode).toBe(201);
    const subtask1 = JSON.parse(st1Res.body);

    const st2Res = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/subtasks`,
      payload: { title: "Write tests", position: 1 },
    });
    expect(st2Res.statusCode).toBe(201);

    const acRes = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/acceptance-criteria`,
      payload: { description: "All API endpoints respond with correct status codes" },
    });
    expect(acRes.statusCode).toBe(201);
    const ac = JSON.parse(acRes.body);
    expect(ac.status).toBe("pending");

    // 6. Complete a subtask
    const toggleRes = await app.inject({
      method: "PATCH",
      url: `/api/subtasks/${subtask1.id}`,
      payload: { completed: true },
    });
    expect(JSON.parse(toggleRes.body).completed).toBe(true);

    // 7. Post a discussion message
    const msgRes = await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        boardId: board.id,
        cardId: card.id,
        authorType: "human",
        authorId: "user-1",
        content: "Starting work on this card.",
      },
    });
    expect(msgRes.statusCode).toBe(201);

    // 8. Move card to Done column
    const moveRes = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/move`,
      payload: { columnId: doneCol.id, position: 0 },
    });
    expect(moveRes.statusCode).toBe(200);
    const movedCard = JSON.parse(moveRes.body);
    expect(movedCard.columnId).toBe(doneCol.id);

    // 9. Create a run (directly via service to avoid spawning child process)
    const run = app.services.runs.create({
      boardId: board.id,
      cardId: card.id,
      agentId: agent.id,
    });
    expect(run.status).toBe("queued");

    // Transition run: queued -> running -> completed
    app.services.runs.update(run.id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });
    app.services.runs.update(run.id, {
      status: "completed",
      exitCode: 0,
      finishedAt: new Date().toISOString(),
    });
    const completedRun = app.services.runs.getById(run.id);
    expect(completedRun!.status).toBe("completed");
    expect(completedRun!.exitCode).toBe(0);

    // 10. Add run event
    app.services.runs.addEvent(run.id, "stdout", "Task completed successfully.");
    const events = app.services.runs.getEvents(run.id);
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("Task completed successfully.");

    // 11. Pass acceptance criteria
    const passRes = await app.inject({
      method: "PATCH",
      url: `/api/acceptance-criteria/${ac.id}`,
      payload: { status: "pass" },
    });
    expect(JSON.parse(passRes.body).status).toBe("pass");

    // 12. Verify audit trail captures all mutations
    const auditRes = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}/audit`,
    });
    expect(auditRes.statusCode).toBe(200);
    const auditLogs = JSON.parse(auditRes.body);

    // Should have at least: board create, column creates (x2), card create, card move
    const actions = auditLogs.map((l: { action: string; entity: string }) => `${l.entity}:${l.action}`);
    expect(actions).toContain("board:create");
    expect(actions).toContain("column:create");
    expect(actions).toContain("card:create");
    expect(actions).toContain("card:move");

    // 13. Verify board-level project thread message
    const projectMsgRes = await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        boardId: board.id,
        authorType: "agent",
        authorId: agent.id,
        content: "Sprint 1 complete.",
      },
    });
    expect(projectMsgRes.statusCode).toBe(201);

    const threadRes = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}/messages`,
    });
    const threadMsgs = JSON.parse(threadRes.body);
    expect(threadMsgs).toHaveLength(1);
    expect(threadMsgs[0].content).toBe("Sprint 1 complete.");

    // 14. Verify secret round-trip
    await app.inject({
      method: "POST",
      url: "/api/secrets",
      payload: { name: "API_KEY", value: "sk-test-12345" },
    });
    const decrypted = app.services.secrets.get("API_KEY");
    expect(decrypted).toBe("sk-test-12345");

    // 15. Claim and release lease
    const claimRes = await app.inject({
      method: "POST",
      url: "/api/leases/claim",
      payload: { cardId: card.id, agentId: agent.id, durationMs: 60000 },
    });
    expect(claimRes.statusCode).toBe(201);
    const lease = JSON.parse(claimRes.body);

    const releaseRes = await app.inject({
      method: "POST",
      url: `/api/leases/${lease.id}/release`,
      payload: {},
    });
    expect(JSON.parse(releaseRes.body).success).toBe(true);

    // 16. Health check
    const healthRes = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(healthRes.statusCode).toBe(200);
    expect(JSON.parse(healthRes.body).status).toBe("ok");
  });
});
