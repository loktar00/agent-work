import type { ToolDef } from "./provider.js";

export const boardTools: ToolDef[] = [
  {
    name: "list_columns",
    description: "List all columns on the board",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
      },
      required: ["boardId"],
    },
  },
  {
    name: "create_column",
    description: "Create a new column on the board",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
        name: { type: "string", description: "Column name" },
        position: { type: "number", description: "Column position (0-based)" },
      },
      required: ["boardId", "name"],
    },
  },
  {
    name: "list_cards",
    description: "List all cards on the board",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
      },
      required: ["boardId"],
    },
  },
  {
    name: "create_card",
    description: "Create a new card in a column",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
        columnId: { type: "string", description: "Column ID" },
        title: { type: "string", description: "Card title" },
        description: { type: "string", description: "Card description" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Card priority",
        },
      },
      required: ["boardId", "columnId", "title"],
    },
  },
  {
    name: "update_card",
    description: "Update an existing card",
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "Card ID" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        status: { type: "string", description: "New status" },
        priority: { type: "string", description: "New priority" },
        columnId: { type: "string", description: "Move to column" },
        assigneeAgentId: {
          type: "string",
          description: "Assign to agent ID (null to unassign)",
        },
      },
      required: ["cardId"],
    },
  },
  {
    name: "create_subtask",
    description: "Create a subtask on a card",
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "Card ID" },
        title: { type: "string", description: "Subtask title" },
        description: {
          type: "string",
          description: "Optional subtask description",
        },
      },
      required: ["cardId", "title"],
    },
  },
  {
    name: "move_card",
    description: "Move a card to a different column",
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "Card ID" },
        columnId: { type: "string", description: "Target column ID" },
        position: {
          type: "number",
          description: "Position in the column (0-based)",
        },
      },
      required: ["cardId", "columnId"],
    },
  },
  {
    name: "assign_agent_to_column",
    description: "Assign an agent to a column",
    parameters: {
      type: "object",
      properties: {
        columnId: { type: "string", description: "Column ID" },
        agentId: {
          type: "string",
          description: "Agent ID to assign (null to unassign)",
        },
      },
      required: ["columnId"],
    },
  },
  {
    name: "list_agents",
    description: "List all available agents",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_board_context",
    description: "Get full board context: columns, cards, and their subtasks",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
      },
      required: ["boardId"],
    },
  },
  {
    name: "send_message",
    description: "Post a message to a card's discussion thread or to the board",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
        cardId: { type: "string", description: "Card ID (optional, omit for board-level message)" },
        content: { type: "string", description: "Message content" },
        authorType: { type: "string", enum: ["agent", "human"], description: "Author type" },
        authorId: { type: "string", description: "Author ID (agent name or ID)" },
      },
      required: ["boardId", "content", "authorId"],
    },
  },
  {
    name: "complete_subtask",
    description: "Mark a subtask as completed by ID or by title",
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "Card ID the subtask belongs to" },
        subtaskId: { type: "string", description: "Subtask ID (provide this or title)" },
        title: { type: "string", description: "Subtask title to match (provide this or subtaskId)" },
      },
      required: ["cardId"],
    },
  },
  {
    name: "update_subtask",
    description: "Update a subtask's status or completion state",
    parameters: {
      type: "object",
      properties: {
        subtaskId: { type: "string", description: "Subtask ID" },
        completed: { type: "boolean", description: "Whether the subtask is completed" },
        status: { type: "string", enum: ["pending", "pass", "fail"], description: "Subtask status" },
      },
      required: ["subtaskId"],
    },
  },
  {
    name: "handoff_to_agent",
    description: "Move a card to another agent's column with a handoff message",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
        cardId: { type: "string", description: "Card ID to hand off" },
        targetAgentId: { type: "string", description: "Agent ID to hand off to" },
        message: { type: "string", description: "Handoff message explaining context" },
        authorId: { type: "string", description: "ID of the handing-off agent" },
      },
      required: ["boardId", "cardId", "targetAgentId"],
    },
  },
  {
    name: "list_agent_columns",
    description: "List all columns with their assigned agent names and roles",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
      },
      required: ["boardId"],
    },
  },
  {
    name: "read_project_doc",
    description: "Read the project document for this board — returns all sections with their content",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
      },
      required: ["boardId"],
    },
  },
  {
    name: "update_project_doc_section",
    description: "Create or update a section of the project document. If the section key already exists, it updates; otherwise it creates a new section.",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
        section: { type: "string", description: "Section key (e.g. 'architecture_decisions', 'completed_features')" },
        title: { type: "string", description: "Display title for the section" },
        content: { type: "string", description: "Markdown content for the section" },
        updatedBy: { type: "string", description: "Name of the agent updating this section" },
      },
      required: ["boardId", "section", "content"],
    },
  },
  {
    name: "list_agent_presets",
    description: "List reusable agent catalog presets available for this board",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional search query" },
        division: { type: "string", description: "Optional division filter" },
      },
      required: [],
    },
  },
  {
    name: "inspect_agent_preset",
    description: "Inspect one reusable agent catalog preset by ID",
    parameters: {
      type: "object",
      properties: {
        presetId: { type: "string", description: "Agent preset ID" },
      },
      required: ["presetId"],
    },
  },
  {
    name: "recommend_agents_for_goal",
    description: "Recommend agent presets that fit a project, task, or card goal",
    parameters: {
      type: "object",
      properties: {
        goal: { type: "string", description: "Goal or task description" },
        limit: { type: "number", description: "Maximum recommendations" },
      },
      required: ["goal"],
    },
  },
  {
    name: "create_agent_from_preset",
    description: "Create a configured live agent from a catalog preset",
    parameters: {
      type: "object",
      properties: {
        presetId: { type: "string", description: "Catalog preset ID" },
        name: { type: "string", description: "Optional instance name" },
        runnerId: { type: "string", description: "Optional runner override" },
        modelConfig: { type: "object", description: "Optional model config override" },
        toolPermissions: { type: "object", description: "Optional tool permission override" },
      },
      required: ["presetId"],
    },
  },
  {
    name: "create_run",
    description: "Queue a run for a specific agent on a card",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string", description: "Board ID" },
        cardId: { type: "string", description: "Card ID" },
        agentId: { type: "string", description: "Agent ID" },
        runnerId: { type: "string", description: "Optional runner override" },
        prompt: { type: "string", description: "Optional task prompt" },
      },
      required: ["boardId", "cardId", "agentId"],
    },
  },
];
