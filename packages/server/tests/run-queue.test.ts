import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
  createAgent,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Run Queue", () => {
  let app: FastifyInstance;
  let boardId: string;
  let colId: string;
  let cardId: string;
  let agentId: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
    const col = await createColumn(app, boardId, "Work", 0);
    colId = col.id;
    const card = await createCard(app, boardId, colId, "Run Card");
    cardId = card.id;
    const agent = await createAgent(app, "Runner Agent", "developer");
    agentId = agent.id;
  });

  afterEach(async () => {
    await app.close();
  });

  // Use the service directly to create runs without triggering the queue,
  // since the queue spawns child processes that race with DB close.
  function createRunViaService() {
    return app.services.runs.create({
      boardId,
      cardId,
      agentId,
    });
  }

  it("should create a run with queued status", () => {
    const run = createRunViaService();

    expect(run.status).toBe("queued");
    expect(run.boardId).toBe(boardId);
    expect(run.cardId).toBe(cardId);
    expect(run.agentId).toBe(agentId);
  });

  it("should get a run by id", async () => {
    const run = createRunViaService();

    const res = await app.inject({
      method: "GET",
      url: `/api/runs/${run.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(run.id);
  });

  it("should list runs by card", async () => {
    createRunViaService();

    const res = await app.inject({
      method: "GET",
      url: `/api/cards/${cardId}/runs`,
    });

    expect(res.statusCode).toBe(200);
    const runs = JSON.parse(res.body);
    expect(runs.length).toBeGreaterThanOrEqual(1);
  });

  it("should list runs by board", async () => {
    createRunViaService();

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/runs`,
    });

    expect(res.statusCode).toBe(200);
    const runs = JSON.parse(res.body);
    expect(runs.length).toBeGreaterThanOrEqual(1);
  });

  it("should update run status: queued -> running -> completed", async () => {
    const run = createRunViaService();

    // Transition to running
    const runningRes = await app.inject({
      method: "PATCH",
      url: `/api/runs/${run.id}`,
      payload: { status: "running" },
    });

    expect(runningRes.statusCode).toBe(200);
    expect(JSON.parse(runningRes.body).status).toBe("running");

    // Transition to completed
    const completeRes = await app.inject({
      method: "PATCH",
      url: `/api/runs/${run.id}`,
      payload: { status: "completed", exitCode: 0 },
    });

    expect(completeRes.statusCode).toBe(200);
    const completed = JSON.parse(completeRes.body);
    expect(completed.status).toBe("completed");
    expect(completed.exitCode).toBe(0);
  });

  it("should transition to failed status: queued -> running -> failed", async () => {
    const run = createRunViaService();

    await app.inject({
      method: "PATCH",
      url: `/api/runs/${run.id}`,
      payload: { status: "running" },
    });

    const failRes = await app.inject({
      method: "PATCH",
      url: `/api/runs/${run.id}`,
      payload: { status: "failed", exitCode: 1 },
    });

    expect(failRes.statusCode).toBe(200);
    const failed = JSON.parse(failRes.body);
    expect(failed.status).toBe("failed");
    expect(failed.exitCode).toBe(1);
  });

  it("should add and get run events", async () => {
    const run = createRunViaService();

    // Add events
    const ev1Res = await app.inject({
      method: "POST",
      url: `/api/runs/${run.id}/events`,
      payload: { type: "stdout", data: "Hello world" },
    });
    expect(ev1Res.statusCode).toBe(201);

    await app.inject({
      method: "POST",
      url: `/api/runs/${run.id}/events`,
      payload: { type: "stderr", data: "Warning: something" },
    });

    // Get events
    const res = await app.inject({
      method: "GET",
      url: `/api/runs/${run.id}/events`,
    });

    expect(res.statusCode).toBe(200);
    const events = JSON.parse(res.body);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("stdout");
    expect(events[0].data).toBe("Hello world");
    expect(events[1].type).toBe("stderr");
  });
});
