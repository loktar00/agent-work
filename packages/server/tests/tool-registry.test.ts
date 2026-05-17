import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
  createAgent,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Tool Registry", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it("enforces agent tool permissions", async () => {
    const board = await createBoard(app);
    const column = await createColumn(app, board.id, "Backlog", 0);
    const agent = await app.services.agents.create({
      name: "Restricted",
      role: "observer",
      toolPermissions: { allowedTools: ["list_cards"] },
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/boards/${board.id}/tools/create_card`,
      payload: {
        agentId: agent.id,
        input: {
          columnId: column.id,
          title: "Should Not Exist",
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).result.error).toContain("not allowed");
    expect(app.services.cards.listByBoard(board.id)).toHaveLength(0);
    expect(
      app.services.toolCalls
        .listByBoard(board.id)
        .some((call) => call.toolName === "create_card" && call.status === "denied"),
    ).toBe(true);
  });

  it("creates agents from catalog presets through tools", async () => {
    const board = await createBoard(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/boards/${board.id}/tools/create_agent_from_preset`,
      payload: {
        input: {
          presetId: "agents-orchestrator",
          name: "Hermes",
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.result.name).toBe("Hermes");
    expect(body.result.role).toBe("orchestrator");
    expect(app.services.agents.list().some((agent) => agent.name === "Hermes")).toBe(true);
  });

  it("triggers column automation when move_card is called through tools", async () => {
    const board = await createBoard(app);
    const backlog = await createColumn(app, board.id, "Backlog", 0);
    const agent = await createAgent(app, "Worker", "developer");
    const work = await createColumn(app, board.id, "Work", 1, agent.id);
    const card = await createCard(app, board.id, backlog.id, "Automated Card");

    const res = await app.inject({
      method: "POST",
      url: `/api/boards/${board.id}/tools/move_card`,
      payload: {
        input: {
          cardId: card.id,
          columnId: work.id,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(app.services.cards.getById(card.id)?.columnId).toBe(work.id);
    expect(app.services.runs.listByCard(card.id).some((run) => run.agentId === agent.id)).toBe(true);
    expect(
      app.services.toolCalls
        .listByBoard(board.id)
        .some((call) => call.toolName === "move_card" && call.status === "completed"),
    ).toBe(true);
  });
});
