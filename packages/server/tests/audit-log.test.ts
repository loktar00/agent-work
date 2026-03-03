import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Audit Log", () => {
  let app: FastifyInstance;
  let boardId: string;
  let colId: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
    const col = await createColumn(app, boardId, "Work", 0);
    colId = col.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("should log create actions", async () => {
    await createCard(app, boardId, colId, "Logged Card");

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit`,
    });

    expect(res.statusCode).toBe(200);
    const logs = JSON.parse(res.body);

    const cardCreate = logs.find(
      (l: { entity: string; action: string }) =>
        l.entity === "card" && l.action === "create"
    );
    expect(cardCreate).toBeDefined();
    expect(cardCreate.boardId).toBe(boardId);
    expect(cardCreate.actorType).toBe("human");
  });

  it("should log update actions with diff", async () => {
    const card = await createCard(app, boardId, colId, "Diff Card");

    await app.inject({
      method: "PATCH",
      url: `/api/cards/${card.id}`,
      payload: { title: "Updated Title" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit`,
    });

    const logs = JSON.parse(res.body);
    const updateLog = logs.find(
      (l: { entity: string; action: string }) =>
        l.entity === "card" && l.action === "update"
    );
    expect(updateLog).toBeDefined();
    expect(updateLog.diff).toBeDefined();
    const diff = JSON.parse(updateLog.diff);
    expect(diff.title).toBe("Updated Title");
  });

  it("should log move actions", async () => {
    const col2 = await createColumn(app, boardId, "Done", 1);
    const card = await createCard(app, boardId, colId, "Move Audit Card");

    await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/move`,
      payload: { columnId: col2.id, position: 0 },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit`,
    });

    const logs = JSON.parse(res.body);
    const moveLog = logs.find(
      (l: { entity: string; action: string }) =>
        l.entity === "card" && l.action === "move"
    );
    expect(moveLog).toBeDefined();
    expect(moveLog.entityId).toBe(card.id);
  });

  it("should log delete actions", async () => {
    const card = await createCard(app, boardId, colId, "Delete Audit Card");

    await app.inject({
      method: "DELETE",
      url: `/api/cards/${card.id}`,
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit`,
    });

    const logs = JSON.parse(res.body);
    const deleteLog = logs.find(
      (l: { entity: string; action: string }) =>
        l.entity === "card" && l.action === "delete"
    );
    expect(deleteLog).toBeDefined();
    expect(deleteLog.entityId).toBe(card.id);
  });

  it("should log board and column mutations", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit`,
    });

    const logs = JSON.parse(res.body);

    // Board create should be logged
    const boardCreate = logs.find(
      (l: { entity: string; action: string }) =>
        l.entity === "board" && l.action === "create"
    );
    expect(boardCreate).toBeDefined();

    // Column create should be logged
    const colCreate = logs.find(
      (l: { entity: string; action: string }) =>
        l.entity === "column" && l.action === "create"
    );
    expect(colCreate).toBeDefined();
  });

  it("should support limit parameter", async () => {
    // Create several audit entries
    await createCard(app, boardId, colId, "Card 1");
    await createCard(app, boardId, colId, "Card 2");
    await createCard(app, boardId, colId, "Card 3");

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/audit?limit=2`,
    });

    expect(res.statusCode).toBe(200);
    const logs = JSON.parse(res.body);
    expect(logs.length).toBeLessThanOrEqual(2);
  });
});
