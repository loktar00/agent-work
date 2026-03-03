import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("SSE Streaming", () => {
  let app: FastifyInstance;
  let boardId: string;
  let colId: string;

  beforeEach(async () => {
    ({ app } = await createTestApp());
    const board = await createBoard(app);
    boardId = board.id;
    const col = await createColumn(app, boardId, "Todo", 0);
    colId = col.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("should emit events on the SSE emitter when cards are created", async () => {
    const events: Array<{ event: string; data: unknown }> = [];

    // Listen on the board channel
    app.sse.emitter.on(`board:${boardId}`, (msg: { event: string; data: unknown }) => {
      events.push(msg);
    });

    // Create a card
    await createCard(app, boardId, colId, "SSE Card");

    // Should have received card:created event
    expect(events.length).toBeGreaterThanOrEqual(1);
    const createEvent = events.find((e) => e.event === "card:created");
    expect(createEvent).toBeDefined();
    expect((createEvent!.data as { title: string }).title).toBe("SSE Card");
  });

  it("should emit events when cards are moved", async () => {
    const col2 = await createColumn(app, boardId, "Done", 1);
    const card = await createCard(app, boardId, colId, "Move Card");

    const events: Array<{ event: string; data: unknown }> = [];
    app.sse.emitter.on(`board:${boardId}`, (msg: { event: string; data: unknown }) => {
      events.push(msg);
    });

    await app.inject({
      method: "POST",
      url: `/api/cards/${card.id}/move`,
      payload: { columnId: col2.id, position: 0 },
    });

    const moveEvent = events.find((e) => e.event === "card:moved");
    expect(moveEvent).toBeDefined();
  });

  it("should emit board-level events for board updates", async () => {
    const events: Array<{ event: string; data: unknown }> = [];
    app.sse.emitter.on("boards", (msg: { event: string; data: unknown }) => {
      events.push(msg);
    });

    // Create a new board to trigger a global board event
    await app.inject({
      method: "POST",
      url: "/api/boards",
      payload: { name: "Another Board" },
    });

    const createEvent = events.find((e) => e.event === "board:created");
    expect(createEvent).toBeDefined();
    expect((createEvent!.data as { name: string }).name).toBe("Another Board");
  });
});
