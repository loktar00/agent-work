import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  createBoard,
  createColumn,
  createCard,
} from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("Agent onboarding", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    ({ app } = await createTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it("exposes a well-known discovery document", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/.well-known/awall-agent.json",
      headers: { host: "awall.test" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.service).toBe("AWALL");
    expect(body.apiBaseUrl).toBe("http://awall.test/api");
    expect(body.onboarding.json).toBe("http://awall.test/api/agent/onboarding?format=json");
  });

  it("returns global onboarding as markdown by default", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/agent/onboarding",
      headers: { host: "awall.test" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/markdown");
    expect(res.body).toContain("# AWALL Agent Onboarding");
    expect(res.body).toContain("awall onboard --server http://awall.test");
  });

  it("returns scoped board and card context without exposing agent api keys", async () => {
    const board = await createBoard(app, "Public Launch");
    const column = await createColumn(app, board.id, "Work", 0);
    const agent = app.services.agents.create({
      name: "Hermes",
      role: "orchestrator",
      llmConfig: {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com",
        apiKey: "fake-api-key-that-must-not-leak",
        model: "claude-sonnet",
      },
    });
    app.services.boards.update(board.id, { commandingAgentId: agent.id });
    app.services.documents.create({
      boardId: board.id,
      section: "agent_onboarding",
      title: "Agent Onboarding",
      content: "Use the board tools and report progress.",
      position: 0,
    });
    const card = await createCard(app, board.id, column.id, "Add onboarding");
    app.services.subtasks.create({
      cardId: card.id,
      title: "Implement API packet",
      status: "pending",
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/agent/onboarding?format=json&cardId=${card.id}&agentId=${agent.id}`,
      headers: { host: "awall.test" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.request.boardId).toBe(board.id);
    expect(body.request.cardId).toBe(card.id);
    expect(body.board.commandingAgent.name).toBe("Hermes");
    expect(body.board.commandingAgent.llmConfig).toEqual({
      configured: true,
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet",
    });
    expect(JSON.stringify(body)).not.toContain("fake-api-key-that-must-not-leak");
    expect(body.card.title).toBe("Add onboarding");
    expect(body.currentWork.subtasks[0].title).toBe("Implement API packet");
    expect(body.agentCatalog.availablePresets.length).toBeGreaterThan(0);
    expect(body.availableTools.map((tool: { name: string }) => tool.name)).toContain(
      "get_board_context",
    );
  });
});
