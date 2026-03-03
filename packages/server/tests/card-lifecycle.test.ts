import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Card Lifecycle", () => {
  let app: FastifyInstance;
  let boardId: string;
  let col1Id: string;
  let col2Id: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
    const col1 = await createColumn(app, boardId, "Todo", 0);
    const col2 = await createColumn(app, boardId, "In Progress", 1);
    col1Id = col1.id;
    col2Id = col2.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("should create a card in a column", async () => {
    const card = await createCard(app, boardId, col1Id, "New Card");

    expect(card.title).toBe("New Card");
    expect(card.columnId).toBe(col1Id);
    expect(card.boardId).toBe(boardId);
    expect(card.status).toBe("backlog");
    expect(card.priority).toBe("medium");
  });

  it("should get a card by id", async () => {
    const card = await createCard(app, boardId, col1Id, "Get Card");

    const res = await app.inject({
      method: "GET",
      url: `/api/cards/${card.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).title).toBe("Get Card");
  });

  it("should list cards by board", async () => {
    await createCard(app, boardId, col1Id, "Card 1");
    await createCard(app, boardId, col2Id, "Card 2");

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/cards`,
    });

    expect(res.statusCode).toBe(200);
    const cards = JSON.parse(res.body);
    expect(cards).toHaveLength(2);
  });

  it("should move a card between columns", async () => {
    const card = await createCard(app, boardId, col1Id, "Moving Card");

    const res = await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/move`,
      payload: { columnId: col2Id, position: 0 },
    });

    expect(res.statusCode).toBe(200);
    const moved = JSON.parse(res.body);
    expect(moved.columnId).toBe(col2Id);
    expect(moved.position).toBe(0);
  });

  it("should update card fields", async () => {
    const card = await createCard(app, boardId, col1Id, "Update Card");

    const res = await app.inject({
      method: "PATCH",
      url: `/api/cards/${card.id}`,
      payload: { title: "Updated Title", status: "in_progress", priority: "high" },
    });

    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.title).toBe("Updated Title");
    expect(updated.status).toBe("in_progress");
    expect(updated.priority).toBe("high");
  });

  it("should delete a card", async () => {
    const card = await createCard(app, boardId, col1Id, "Delete Card");

    const res = await app.inject({
      method: "DELETE",
      url: `/api/cards/${card.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);

    const getRes = await app.inject({
      method: "GET",
      url: `/api/cards/${card.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("should create audit log entries for card moves", async () => {
    const card = await createCard(app, boardId, col1Id, "Audit Card");

    await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/move`,
      payload: { columnId: col2Id, position: 0 },
    });

    const auditRes = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit`,
    });

    const logs = JSON.parse(auditRes.body);
    const moveLog = logs.find(
      (l: { action: string; entity: string }) =>
        l.action === "move" && l.entity === "card"
    );
    expect(moveLog).toBeDefined();
    expect(moveLog.entityId).toBe(card.id);
  });
});
