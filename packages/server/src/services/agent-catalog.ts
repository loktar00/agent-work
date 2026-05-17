import { eq } from "drizzle-orm";
import { agentCatalogPresets } from "@agent-board/db";
import type { DB } from "@agent-board/db";
import type {
  CreateAgentCatalogPresetInput,
  InstantiateAgentPresetInput,
} from "@agent-board/shared";
import { newId, now } from "../utils.js";
import type { agentService } from "./agents.js";

type PresetRow = typeof agentCatalogPresets.$inferSelect;

export interface NormalizedAgentCatalogPreset {
  id: string;
  name: string;
  role: string;
  division: string | null;
  description: string | null;
  persona: string | null;
  tags: string[];
  suggestedRunner: string | null;
  suggestedModelConfig: Record<string, unknown> | null;
  defaultToolPermissions: Record<string, unknown> | null;
  source: string | null;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TOOL_PERMISSIONS = {
  allowedTools: [
    "list_columns",
    "create_column",
    "list_cards",
    "create_card",
    "update_card",
    "create_subtask",
    "move_card",
    "assign_agent_to_column",
    "list_agents",
    "get_board_context",
    "send_message",
    "complete_subtask",
    "update_subtask",
    "handoff_to_agent",
    "list_agent_columns",
    "read_project_doc",
    "update_project_doc_section",
    "list_agent_presets",
    "inspect_agent_preset",
    "create_agent_from_preset",
    "recommend_agents_for_goal",
    "create_run",
  ],
};

const BUILT_IN_PRESETS: NormalizedAgentCatalogPreset[] = [
  {
    id: "agents-orchestrator",
    name: "Agents Orchestrator",
    role: "orchestrator",
    division: "Leadership",
    description:
      "Builds the team, sets up the board, delegates work, and reports progress to the primary user.",
    persona:
      "You are the commanding agent for this AWALL board. Inspect the project, available agent presets, board state, cards, documents, and tools. Create the team, columns, cards, and runs required to move the user's goal forward. Be autonomous for board-shaping actions, keep the human informed in the board thread, and use specialized agents for execution instead of doing every task yourself.",
    tags: ["orchestration", "delegation", "planning", "reporting"],
    suggestedRunner: "llm",
    suggestedModelConfig: { model: "opus", maxTurns: 20 },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
  {
    id: "product-manager",
    name: "Product Manager",
    role: "product",
    division: "Product",
    description:
      "Turns goals and user needs into scoped cards, acceptance criteria, and priorities.",
    persona:
      "You are a pragmatic product manager. Convert ambiguous goals into clear cards, acceptance criteria, risks, and sequencing. Ask for human input only when a decision materially changes scope or risk.",
    tags: ["product", "requirements", "prioritization"],
    suggestedRunner: "llm",
    suggestedModelConfig: { model: "opus", maxTurns: 12 },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
  {
    id: "backend-architect",
    name: "Backend Architect",
    role: "architect",
    division: "Engineering",
    description: "Designs APIs, data models, migrations, and backend boundaries.",
    persona:
      "You are a senior backend architect. Design coherent APIs, schemas, data flow, and failure handling. Prefer small, durable interfaces that fit the existing codebase.",
    tags: ["backend", "api", "database", "architecture"],
    suggestedRunner: "claude-code",
    suggestedModelConfig: { model: "sonnet", maxTurns: 15 },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
  {
    id: "senior-developer",
    name: "Senior Developer",
    role: "developer",
    division: "Engineering",
    description: "Implements focused full-stack changes and keeps tests passing.",
    persona:
      "You are a senior full-stack developer. Read the card context, make the smallest coherent code change, mark progress on subtasks, run relevant checks, and report what changed.",
    tags: ["implementation", "typescript", "testing"],
    suggestedRunner: "claude-code",
    suggestedModelConfig: {
      model: "sonnet",
      maxTurns: 40,
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
  {
    id: "qa-engineer",
    name: "QA Engineer",
    role: "qa",
    division: "Quality",
    description: "Validates behavior with tests, bug reproduction, and acceptance checks.",
    persona:
      "You are a QA engineer. Verify the card against acceptance criteria, add or run appropriate tests, isolate failures, and post a concise test summary.",
    tags: ["qa", "tests", "validation"],
    suggestedRunner: "codex",
    suggestedModelConfig: { model: "gpt-5.4", maxTurns: 25 },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    role: "reviewer",
    division: "Engineering",
    description:
      "Reviews diffs for bugs, architecture mismatches, security issues, and missing tests.",
    persona:
      "You are a principal engineer reviewing the implementation. Prioritize concrete bugs, regressions, and missing verification. Post findings first and hand work back when changes are required.",
    tags: ["review", "security", "quality"],
    suggestedRunner: "claude-code",
    suggestedModelConfig: { model: "opus", maxTurns: 12 },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
  {
    id: "ux-architect",
    name: "UX Architect",
    role: "design",
    division: "Design",
    description: "Plans usable flows, information architecture, and UI requirements.",
    persona:
      "You are a UX architect. Translate product intent into clear workflows, states, and UI requirements. Keep guidance implementation-ready and grounded in the app's existing design system.",
    tags: ["ux", "design", "flows"],
    suggestedRunner: "llm",
    suggestedModelConfig: { model: "opus", maxTurns: 12 },
    defaultToolPermissions: DEFAULT_TOOL_PERMISSIONS,
    source: "built-in",
    sourceRef: "server/defaults",
    createdAt: "built-in",
    updatedAt: "built-in",
  },
];

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizePreset(row: PresetRow): NormalizedAgentCatalogPreset {
  return {
    ...row,
    tags: parseJson<string[]>(row.tags, []),
    suggestedModelConfig: parseJson<Record<string, unknown> | null>(
      row.suggestedModelConfig,
      null,
    ),
    defaultToolPermissions: parseJson<Record<string, unknown> | null>(
      row.defaultToolPermissions,
      null,
    ),
  };
}

function serializePreset(input: CreateAgentCatalogPresetInput) {
  const ts = now();
  return {
    id: input.id ?? newId(),
    name: input.name,
    role: input.role,
    division: input.division ?? null,
    description: input.description ?? null,
    persona: input.persona ?? null,
    tags: JSON.stringify(input.tags ?? []),
    suggestedRunner: input.suggestedRunner ?? null,
    suggestedModelConfig: input.suggestedModelConfig
      ? JSON.stringify(input.suggestedModelConfig)
      : null,
    defaultToolPermissions: input.defaultToolPermissions
      ? JSON.stringify(input.defaultToolPermissions)
      : null,
    source: input.source ?? "db",
    sourceRef: input.sourceRef ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function agentCatalogService(db: DB) {
  function dbPresets() {
    return db.select().from(agentCatalogPresets).all().map(normalizePreset);
  }

  return {
    list() {
      const rows = dbPresets();
      const rowIds = new Set(rows.map((row) => row.id));
      return [
        ...rows,
        ...BUILT_IN_PRESETS.filter((preset) => !rowIds.has(preset.id)),
      ];
    },

    getById(id: string) {
      const row = db
        .select()
        .from(agentCatalogPresets)
        .where(eq(agentCatalogPresets.id, id))
        .get();
      if (row) return normalizePreset(row);
      return BUILT_IN_PRESETS.find((preset) => preset.id === id) ?? null;
    },

    create(input: CreateAgentCatalogPresetInput) {
      const row = serializePreset(input);
      db.insert(agentCatalogPresets).values(row).run();
      return normalizePreset(row);
    },

    recommend(goal: string, limit = 5) {
      const terms = goal
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2);

      return this.list()
        .map((preset) => {
          const haystack = [
            preset.name,
            preset.role,
            preset.division,
            preset.description,
            preset.persona,
            ...preset.tags,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const score = terms.reduce(
            (sum, term) => sum + (haystack.includes(term) ? 1 : 0),
            0,
          );
          return { preset, score };
        })
        .sort((a, b) => b.score - a.score || a.preset.name.localeCompare(b.preset.name))
        .slice(0, limit)
        .map(({ preset, score }) => ({ ...preset, score }));
    },

    instantiate(
      presetId: string,
      input: InstantiateAgentPresetInput,
      agents: ReturnType<typeof agentService>,
    ) {
      const preset = this.getById(presetId);
      if (!preset) return null;

      return agents.create({
        name: input.name ?? preset.name,
        role: preset.role,
        persona: preset.persona,
        runnerId: input.runnerId ?? preset.suggestedRunner,
        modelConfig: input.modelConfig ?? preset.suggestedModelConfig,
        llmConfig: input.llmConfig,
        toolPermissions:
          input.toolPermissions ?? preset.defaultToolPermissions,
      });
    },
  };
}
