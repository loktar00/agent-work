import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Subtasks & Acceptance Criteria", () => {
  let app: FastifyInstance;
  let boardId: string;
  let colId: string;
  let cardId: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
    const col = await createColumn(app, boardId, "Work", 0);
    colId = col.id;
    const card = await createCard(app, boardId, colId, "Task Card");
    cardId = card.id;
  });

  afterEach(async () => {
    await app.close();
  });

  // ── Subtasks ──

  it("should create a subtask", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/cards/${cardId}/subtasks`,
      payload: { title: "Implement feature" },
    });

    expect(res.statusCode).toBe(201);
    const subtask = JSON.parse(res.body);
    expect(subtask.title).toBe("Implement feature");
    expect(subtask.completed).toBe(false);
    expect(subtask.cardId).toBe(cardId);
  });

  it("should list subtasks for a card", async () => {
    await app.inject({
      method: "POST",
      url: `/api/cards/${cardId}/subtasks`,
      payload: { title: "Step 1", position: 0 },
    });
    await app.inject({
      method: "POST",
      url: `/api/cards/${cardId}/subtasks`,
      payload: { title: "Step 2", position: 1 },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/cards/${cardId}/subtasks`,
    });

    expect(res.statusCode).toBe(200);
    const subtasks = JSON.parse(res.body);
    expect(subtasks).toHaveLength(2);
    expect(subtasks[0].title).toBe("Step 1");
    expect(subtasks[1].title).toBe("Step 2");
  });

  it("should toggle subtask completion", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/api/cards/${cardId}/subtasks`,
      payload: { title: "Toggle Me" },
    });
    const subtask = JSON.parse(createRes.body);

    // Mark as completed
    const res = await app.inject({
      method: "PATCH",
      url: `/api/subtasks/${subtask.id}`,
      payload: { completed: true },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).completed).toBe(true);

    // Toggle back
    const res2 = await app.inject({
      method: "PATCH",
      url: `/api/subtasks/${subtask.id}`,
      payload: { completed: false },
    });

    expect(JSON.parse(res2.body).completed).toBe(false);
  });

  it("should delete a subtask", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: `/api/cards/${cardId}/subtasks`,
      payload: { title: "Delete Me" },
    });
    const subtask = JSON.parse(createRes.body);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/subtasks/${subtask.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

});
