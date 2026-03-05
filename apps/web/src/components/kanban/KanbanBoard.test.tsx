import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { KanbanBoard } from "./KanbanBoard";
import type { Column, Card, Subtask } from "@agent-board/shared";

const mockColumns: Column[] = [
  { id: "col-1", boardId: "b1", name: "Todo", position: 0, agentId: null, wipLimit: null },
  { id: "col-2", boardId: "b1", name: "In Progress", position: 1, agentId: null, wipLimit: null },
  { id: "col-3", boardId: "b1", name: "Done", position: 2, agentId: null, wipLimit: null },
];

const mockCards: Card[] = [
  {
    id: "card-1",
    boardId: "b1",
    columnId: "col-1",
    title: "Implement login",
    description: null,
    status: "todo" as const,
    priority: "high" as const,
    position: 0,
    assigneeAgentId: "agent-1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "card-2",
    boardId: "b1",
    columnId: "col-2",
    title: "Write tests",
    description: null,
    status: "in_progress" as const,
    priority: "medium" as const,
    position: 0,
    assigneeAgentId: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const mockSubtasksByCard: Record<string, Subtask[]> = {
  "card-1": [
    { id: "st-1", cardId: "card-1", title: "UI", completed: true, description: null, status: "pending", position: 0 },
    { id: "st-2", cardId: "card-1", title: "API", completed: false, description: null, status: "pending", position: 1 },
  ],
};

describe("KanbanBoard", () => {
  it("renders columns", () => {
    renderWithProviders(
      <KanbanBoard
        columns={mockColumns}
        cards={[]}
        agentNames={{}}
        onCardMove={vi.fn()}
      />
    );

    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders cards within columns", () => {
    renderWithProviders(
      <KanbanBoard
        columns={mockColumns}
        cards={mockCards}
        agentNames={{ "agent-1": "Claude" }}
        onCardMove={vi.fn()}
      />
    );

    expect(screen.getByText("Implement login")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("shows card title and status badge", () => {
    renderWithProviders(
      <KanbanBoard
        columns={mockColumns}
        cards={mockCards}
        agentNames={{}}
        onCardMove={vi.fn()}
      />
    );

    expect(screen.getByText("Implement login")).toBeInTheDocument();
    // Status badge should be rendered (StatusBadge renders human-readable labels)
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("shows subtask progress", () => {
    renderWithProviders(
      <KanbanBoard
        columns={mockColumns}
        cards={mockCards}
        agentNames={{}}
        subtasksByCard={mockSubtasksByCard}
        onCardMove={vi.fn()}
      />
    );

    // 1 out of 2 subtasks completed
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});
