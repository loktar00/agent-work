import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, createBoard, createColumn } from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Column CRUD", () => {
  let app: FastifyInstance;
  let boardId: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("should create columns in a board", async () => {
    const col1 = await createColumn(app, boardId, "Backlog", 0);
    const col2 = await createColumn(app, boardId, "In Progress", 1);

    expect(col1.name).toBe("Backlog");
    expect(col1.position).toBe(0);
    expect(col2.name).toBe("In Progress");
    expect(col2.position).toBe(1);
  });

  it("should list columns by board", async () => {
    await createColumn(app, boardId, "Col A", 0);
    await createColumn(app, boardId, "Col B", 1);

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/columns`,
    });

    expect(res.statusCode).toBe(200);
    const cols = JSON.parse(res.body);
    expect(cols).toHaveLength(2);
    // Should be ordered by position
    expect(cols[0].name).toBe("Col A");
    expect(cols[1].name).toBe("Col B");
  });

  it("should reorder columns", async () => {
    const colA = await createColumn(app, boardId, "Col A", 0);
    const colB = await createColumn(app, boardId, "Col B", 1);
    const colC = await createColumn(app, boardId, "Col C", 2);

    // Reorder: C, A, B
    const res = await app.inject({
      method: "POST",
      url: `/api/boards/${boardId}/columns/reorder`,
      payload: { orderedIds: [colC.id, colA.id, colB.id] },
    });

    expect(res.statusCode).toBe(200);
    const reordered = JSON.parse(res.body);
    expect(reordered[0].id).toBe(colC.id);
    expect(reordered[0].position).toBe(0);
    expect(reordered[1].id).toBe(colA.id);
    expect(reordered[1].position).toBe(1);
    expect(reordered[2].id).toBe(colB.id);
    expect(reordered[2].position).toBe(2);
  });

  it("should update a column", async () => {
    const col = await createColumn(app, boardId, "Original", 0);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/columns/${col.id}`,
      payload: { name: "Renamed" },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).name).toBe("Renamed");
  });

  it("should delete a column", async () => {
    const col = await createColumn(app, boardId, "To Delete", 0);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/columns/${col.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);

    const getRes = await app.inject({
      method: "GET",
      url: `/api/columns/${col.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});
