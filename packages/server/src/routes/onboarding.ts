import type { FastifyPluginAsync, FastifyRequest } from "fastify";

type OnboardingFormat = "markdown" | "json";

interface OnboardingQuery {
  boardId?: string;
  cardId?: string;
  runId?: string;
  agentId?: string;
  format?: OnboardingFormat;
}

function requestBaseUrl(req: FastifyRequest, fallbackPort: number) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const proto =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ??
    req.protocol ??
    "http";
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
    req.headers.host ??
    `localhost:${fallbackPort}`;
  return `${proto}://${host}`.replace(/\/$/, "");
}

function publicAgent(agent: {
  id: string;
  name: string;
  role: string;
  persona: string | null;
  runnerId: string | null;
  modelConfig: Record<string, unknown> | null;
  llmConfig: {
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
  } | null;
  toolPermissions: Record<string, unknown> | null;
  createdAt: string;
} | null) {
  if (!agent) return null;
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    persona: agent.persona,
    runnerId: agent.runnerId,
    modelConfig: agent.modelConfig,
    llmConfig: agent.llmConfig
      ? {
          configured: true,
          provider: agent.llmConfig.provider,
          baseUrl: agent.llmConfig.baseUrl,
          model: agent.llmConfig.model,
        }
      : null,
    toolPermissions: agent.toolPermissions,
    createdAt: agent.createdAt,
  };
}

function presetSummary(preset: {
  id: string;
  name: string;
  role: string;
  division: string | null;
  description: string | null;
  tags: string[];
  suggestedRunner: string | null;
  suggestedModelConfig: Record<string, unknown> | null;
}) {
  return {
    id: preset.id,
    name: preset.name,
    role: preset.role,
    division: preset.division,
    description: preset.description,
    tags: preset.tags,
    suggestedRunner: preset.suggestedRunner,
    suggestedModelConfig: preset.suggestedModelConfig,
  };
}

function compactMessage(message: {
  id: string;
  authorType: string;
  authorId: string;
  content: string;
  createdAt: string;
}) {
  return {
    id: message.id,
    authorType: message.authorType,
    authorId: message.authorId,
    content: message.content,
    createdAt: message.createdAt,
  };
}

function toolSummary(tool: {
  name: string;
  description: string;
  parameters: object;
}) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

function cliCommands(
  serverUrl: string,
  query: {
    boardId: string | null;
    cardId: string | null;
    runId: string | null;
    agentId: string | null;
  },
) {
  const board = query.boardId ? ` --board ${query.boardId}` : "";
  const card = query.cardId ? ` --card ${query.cardId}` : "";
  const run = query.runId ? ` --run ${query.runId}` : "";
  const agent = query.agentId ? ` --agent ${query.agentId}` : "";
  return [
    `awall onboard --server ${serverUrl}${board}${card}${run}${agent}`,
    query.runId
      ? `awall context --server ${serverUrl} --run ${query.runId}`
      : null,
    query.boardId
      ? `awall tools --server ${serverUrl} --board ${query.boardId}${query.agentId ? ` --agent ${query.agentId}` : ""}`
      : null,
    query.boardId && query.cardId
      ? `awall message --server ${serverUrl} --board ${query.boardId} --card ${query.cardId}${query.agentId ? ` --agent ${query.agentId}` : ""} --text "Progress update"`
      : null,
    query.boardId
      ? `awall call get_board_context --server ${serverUrl} --board ${query.boardId} --input "{}"`
      : null,
  ].filter((command): command is string => Boolean(command));
}

function nextSteps(packet: {
  request: { boardId: string | null; cardId: string | null; runId: string | null };
  board: unknown | null;
  card: unknown | null;
}) {
  if (packet.request.runId) {
    return [
      "Read the run context, card context, and available tools before taking action.",
      "Send progress updates to the board or card thread while the run is active.",
      "Attach or describe artifacts before completing the run.",
    ];
  }
  if (packet.card) {
    return [
      "Review the card brief, subtasks, recent messages, and board documents.",
      "Use the tool list to decide whether to work directly, hand off, or request another agent.",
      "Post a concise progress message before changing card state.",
    ];
  }
  if (packet.board) {
    return [
      "Review the board mission, documents, columns, cards, and current agent roster.",
      "Inspect the agent catalog and recommend or instantiate the agents needed for the goal.",
      "Use the commanding agent path for board-level reporting and delegation.",
    ];
  }
  return [
    "Use the API or CLI to list boards, then request onboarding for a specific board.",
    "If you were given a run ID, call onboarding again with that run ID.",
    "Do not assume a repository URL; AWALL provides workspace details through board and run context.",
  ];
}

function renderMarkdown(packet: any) {
  const lines: string[] = [];
  lines.push(`# ${packet.project.name} Agent Onboarding`);
  lines.push("");
  lines.push(packet.project.purpose);
  lines.push("");
  lines.push("## Start Here");
  for (const step of packet.nextSteps) lines.push(`- ${step}`);
  lines.push("");
  lines.push("## Protocol");
  for (const rule of packet.agentProtocol.rules) lines.push(`- ${rule}`);
  lines.push("");

  if (packet.board) {
    lines.push("## Board");
    lines.push(`- ID: ${packet.board.id}`);
    lines.push(`- Name: ${packet.board.name}`);
    if (packet.board.description) lines.push(`- Description: ${packet.board.description}`);
    if (packet.board.workspace.projectDir) {
      lines.push(`- Project directory: ${packet.board.workspace.projectDir}`);
    }
    lines.push(
      `- Commanding agent: ${packet.board.commandingAgent?.name ?? "not configured"}`,
    );
    lines.push("");
  }

  if (packet.card) {
    lines.push("## Card");
    lines.push(`- ID: ${packet.card.id}`);
    lines.push(`- Title: ${packet.card.title}`);
    lines.push(`- Status: ${packet.card.status}`);
    lines.push(`- Priority: ${packet.card.priority}`);
    if (packet.card.description) lines.push(`- Description: ${packet.card.description}`);
    if (packet.currentWork?.subtasks?.length) {
      lines.push("");
      lines.push("### Subtasks");
      for (const subtask of packet.currentWork.subtasks) {
        lines.push(`- [${subtask.completed ? "x" : " "}] ${subtask.title} (${subtask.status})`);
      }
    }
    lines.push("");
  }

  if (packet.board?.documents?.length) {
    lines.push("## Project Documents");
    for (const doc of packet.board.documents) {
      lines.push(`- ${doc.title} (${doc.section})`);
    }
    lines.push("");
  }

  lines.push("## Available CLI");
  lines.push("```bash");
  for (const command of packet.availableActions.cli) lines.push(command);
  lines.push("```");
  lines.push("");

  lines.push("## Available Tools");
  for (const tool of packet.availableTools) {
    lines.push(`- ${tool.name}: ${tool.description}`);
  }
  lines.push("");

  lines.push("## Agent Catalog");
  for (const preset of packet.agentCatalog.recommendedPresets.length
    ? packet.agentCatalog.recommendedPresets
    : packet.agentCatalog.availablePresets.slice(0, 8)) {
    lines.push(`- ${preset.id}: ${preset.name} (${preset.role})`);
  }
  lines.push("");
  lines.push("For machine-readable output, request this packet with `format=json`.");
  return `${lines.join("\n")}\n`;
}

const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/.well-known/awall-agent.json", async (req) => {
    const serverUrl = requestBaseUrl(req, fastify.config.server.port);
    return {
      service: "AWALL",
      protocolVersion: "1",
      purpose:
        "Agent control plane for discovering boards, tasks, tools, catalog presets, and run context.",
      apiBaseUrl: `${serverUrl}/api`,
      onboarding: {
        markdown: `${serverUrl}/api/agent/onboarding`,
        json: `${serverUrl}/api/agent/onboarding?format=json`,
      },
      cli: {
        command: `awall onboard --server ${serverUrl}`,
      },
    };
  });

  fastify.get<{ Querystring: OnboardingQuery }>(
    "/api/agent/onboarding",
    async (req, reply) => {
      const serverUrl = requestBaseUrl(req, fastify.config.server.port);
      const query = req.query;
      const format = query.format === "json" ? "json" : "markdown";

      let boardId = query.boardId;
      let cardId = query.cardId;
      let agentId = query.agentId;
      let run = null;

      if (query.runId) {
        run = fastify.services.runs.getById(query.runId);
        if (!run) return reply.code(404).send({ error: "Run not found" });
        boardId = boardId ?? run.boardId;
        cardId = cardId ?? run.cardId;
        agentId = agentId ?? run.agentId;
      }

      const card = cardId ? fastify.services.cards.getById(cardId) : null;
      if (cardId && !card) return reply.code(404).send({ error: "Card not found" });
      if (card) {
        if (boardId && boardId !== card.boardId) {
          return reply.code(400).send({ error: "Card does not belong to board" });
        }
        boardId = card.boardId;
      }

      const board = boardId ? fastify.services.boards.getById(boardId) : null;
      if (boardId && !board) return reply.code(404).send({ error: "Board not found" });

      const agents = fastify.services.agents.list();
      const agentMap = new Map(agents.map((agent) => [agent.id, agent]));
      const columns = boardId ? fastify.services.columns.listByBoard(boardId) : [];
      const cards = boardId ? fastify.services.cards.listByBoard(boardId) : [];
      const documents = boardId ? fastify.services.documents.listByBoard(boardId) : [];
      const context = cardId ? fastify.services.context.buildCardContext(cardId, 10) : null;
      const goal = [
        card?.title,
        card?.description,
        board?.name,
        board?.description,
      ]
        .filter(Boolean)
        .join("\n");
      const presets = fastify.services.agentCatalog.list();
      const recommendedPresets = goal
        ? fastify.services.agentCatalog.recommend(goal, 5).map(presetSummary)
        : [];
      const tools = fastify.toolRegistry
        .listTools({
          boardId: boardId ?? "onboarding",
          actorType: agentId ? "agent" : "human",
          actorId: agentId ?? "onboarding",
          agentId: agentId ?? null,
        })
        .map(toolSummary);

      const request = {
        boardId: boardId ?? null,
        cardId: cardId ?? null,
        runId: query.runId ?? null,
        agentId: agentId ?? null,
      };

      const packet = {
        protocolVersion: "1",
        generatedAt: new Date().toISOString(),
        project: {
          name: "AWALL",
          purpose:
            "Coordinate external agents across boards, cards, runs, tools, and project documents without requiring agents to know the repository URL first.",
        },
        discovery: {
          apiBaseUrl: `${serverUrl}/api`,
          wellKnown: `${serverUrl}/.well-known/awall-agent.json`,
          onboardingMarkdown: `${serverUrl}/api/agent/onboarding`,
          onboardingJson: `${serverUrl}/api/agent/onboarding?format=json`,
        },
        request,
        agentProtocol: {
          commandingAgent:
            board?.commandingAgentId
              ? publicAgent(agentMap.get(board.commandingAgentId) ?? null)
              : null,
          rules: [
            "Start with this onboarding packet, then request board, card, run, or tool context as needed.",
            "Use AWALL tools or CLI commands for board state changes; do not write directly to the SQLite database.",
            "Claim or receive execution through runs, and heartbeat while long-running work is active.",
            "Report progress through board or card messages before handoff, completion, or escalation.",
            "Use the agent catalog to inspect, recommend, or instantiate specialized agents for work that should be delegated.",
            "Treat secrets as non-reportable data. Onboarding intentionally omits LLM API key values.",
          ],
        },
        board: board
          ? {
              id: board.id,
              name: board.name,
              description: board.description,
              workspace: {
                projectDir: board.projectDir,
                worktreeMode: board.worktreeMode,
              },
              commandingAgent: board.commandingAgentId
                ? publicAgent(agentMap.get(board.commandingAgentId) ?? null)
                : null,
              columns: columns.map((column) => ({
                ...column,
                agent: column.agentId
                  ? publicAgent(agentMap.get(column.agentId) ?? null)
                  : null,
              })),
              cards: cards.map((boardCard) => ({
                id: boardCard.id,
                columnId: boardCard.columnId,
                title: boardCard.title,
                status: boardCard.status,
                priority: boardCard.priority,
                assigneeAgentId: boardCard.assigneeAgentId,
              })),
              agents: agents.map(publicAgent),
              documents,
            }
          : null,
        card: card
          ? {
              ...card,
              column: columns.find((column) => column.id === card.columnId) ?? null,
              assigneeAgent: card.assigneeAgentId
                ? publicAgent(agentMap.get(card.assigneeAgentId) ?? null)
                : null,
            }
          : null,
        run: run
          ? {
              id: run.id,
              boardId: run.boardId,
              cardId: run.cardId,
              agentId: run.agentId,
              runnerId: run.runnerId,
              status: run.status,
              prompt: run.prompt,
              startedAt: run.startedAt,
              finishedAt: run.finishedAt,
              workerId: run.workerId,
              heartbeatAt: run.heartbeatAt,
              cancelRequested: run.cancelRequested,
            }
          : null,
        currentWork: context
          ? {
              subtasks: context.subtasks,
              recentMessages: context.recentMessages.map(compactMessage),
              artifacts: context.artifacts.map((artifact) => ({
                id: artifact.id,
                type: artifact.type,
                name: artifact.name,
                metadata: artifact.metadata,
                createdAt: artifact.createdAt,
              })),
            }
          : null,
        agentCatalog: {
          recommendedPresets,
          availablePresets: presets.map(presetSummary),
        },
        availableTools: tools,
        availableActions: {
          cli: cliCommands(serverUrl, request),
          api: [
            "GET /api/agent/onboarding?format=json",
            "GET /api/boards",
            "GET /api/boards/:boardId",
            "GET /api/boards/:boardId/tools",
            "POST /api/boards/:boardId/tools/:toolName",
            "GET /api/runs/:id/context",
            "POST /api/runs/:id/heartbeat",
          ],
        },
        nextSteps: nextSteps({
          request,
          board,
          card,
        }),
      };

      if (format === "json") return packet;
      return reply.type("text/markdown; charset=utf-8").send(renderMarkdown(packet));
    },
  );
};

export default onboardingRoutes;
