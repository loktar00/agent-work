import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, createBoard } from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Board CRUD", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it("should create a board", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "My Board", description: "A test board" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("My Board");
    expect(body.description).toBe("A test board");
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  it("should get a board by id", async () => {
    const board = await createBoard(app, "Get Board");

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("Get Board");
    expect(body.id).toBe(board.id);
  });

  it("should return 404 for missing board", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/boards/nonexistent",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should list boards", async () => {
    await createBoard(app, "Board 1");
    await createBoard(app, "Board 2");

    const res = await app.inject({
      method: "GET",
      url: "/api/boards",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(2);
  });

  it("should update a board", async () => {
    const board = await createBoard(app, "Old Name");

    const res = await app.inject({
      method: "PATCH",
      url: `/api/boards/${board.id}`,
      payload: { name: "New Name" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("New Name");
  });

  it("should delete a board", async () => {
    const board = await createBoard(app, "To Delete");

    const res = await app.inject({
      method: "DELETE",
      url: `/api/boards/${board.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);

    // Verify it's gone
    const getRes = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("should create audit log entries for board mutations", async () => {
    const board = await createBoard(app, "Audited Board");

    // Update
    await app.inject({
      method: "PATCH",
      url: `/api/boards/${board.id}`,
      payload: { name: "Updated Board" },
    });

    // Check audit log
    const auditRes = await app.inject({
      method: "GET",
      url: `/api/boards/${board.id}/audit`,
    });

    expect(auditRes.statusCode).toBe(200);
    const logs = JSON.parse(auditRes.body);
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const actions = logs.map((l: { action: string }) => l.action);
    expect(actions).toContain("create");
    expect(actions).toContain("update");
  });
});
