import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Messages", () => {
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
    const card = await createCard(app, boardId, colId, "Msg Card");
    cardId = card.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("should create a card-level message", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        boardId,
        cardId,
        authorType: "human",
        authorId: "user-1",
        content: "This is a card discussion message",
      },
    });

    expect(res.statusCode).toBe(201);
    const msg = JSON.parse(res.body);
    expect(msg.content).toBe("This is a card discussion message");
    expect(msg.cardId).toBe(cardId);
    expect(msg.boardId).toBe(boardId);
    expect(msg.authorType).toBe("human");
  });

  it("should create a board-level (project thread) message", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        boardId,
        authorType: "agent",
        authorId: "agent-1",
        content: "Project-level update",
      },
    });

    expect(res.statusCode).toBe(201);
    const msg = JSON.parse(res.body);
    expect(msg.cardId).toBeNull();
    expect(msg.boardId).toBe(boardId);
  });

  it("should list card messages", async () => {
    // Create multiple messages
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: "POST",
        url: "/api/messages",
        payload: {
          boardId,
          cardId,
          authorType: "human",
          authorId: "user-1",
          content: `Message ${i}`,
        },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: `/api/cards/${cardId}/messages`,
    });

    expect(res.statusCode).toBe(200);
    const msgs = JSON.parse(res.body);
    expect(msgs).toHaveLength(3);
  });

  it("should list project thread messages (excluding card messages)", async () => {
    // Create card message
    await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        boardId,
        cardId,
        authorType: "human",
        authorId: "user-1",
        content: "Card message",
      },
    });

    // Create project thread message
    await app.inject({
      method: "POST",
      url: "/api/messages",
      payload: {
        boardId,
        authorType: "human",
        authorId: "user-1",
        content: "Project message",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/boards/${boardId}/messages`,
    });

    expect(res.statusCode).toBe(200);
    const msgs = JSON.parse(res.body);
    // Should only have the project-level message (no cardId)
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("Project message");
    expect(msgs[0].cardId).toBeNull();
  });

  it("should support limit parameter for messages", async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/api/messages",
        payload: {
          boardId,
          cardId,
          authorType: "human",
          authorId: "user-1",
          content: `Message ${i}`,
        },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: `/api/cards/${cardId}/messages?limit=2`,
    });

    expect(res.statusCode).toBe(200);
    const msgs = JSON.parse(res.body);
    expect(msgs.length).toBeLessThanOrEqual(2);
  });
});
