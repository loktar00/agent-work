import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { KanbanCard } from "./KanbanCard";
import type { Card, Subtask } from "@agent-board/shared";

const mockCard: Card = {
  id: "card-1",
  boardId: "b1",
  columnId: "col-1",
  title: "Fix authentication bug",
  description: "Users get logged out randomly",
  status: "in_progress" as const,
  priority: "high" as const,
  position: 0,
  assigneeAgentId: "agent-1",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

const mockSubtasks: Subtask[] = [
  { id: "st-1", cardId: "card-1", title: "Investigate", completed: true, description: null, status: "pending", position: 0 },
  { id: "st-2", cardId: "card-1", title: "Fix", completed: true, description: null, status: "pending", position: 1 },
  { id: "st-3", cardId: "card-1", title: "Test", completed: false, description: null, status: "pending", position: 2 },
];

describe("KanbanCard", () => {
  it("renders card info correctly", () => {
    renderWithProviders(
      <KanbanCard card={mockCard} />
    );

    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows agent badge when assigned", () => {
    renderWithProviders(
      <KanbanCard card={mockCard} agentName="Claude" />
    );

    expect(screen.getByText("Claude")).toBeInTheDocument();
  });

  it("does not show agent badge when no agent", () => {
    const unassignedCard = { ...mockCard, assigneeAgentId: null };
    renderWithProviders(
      <KanbanCard card={unassignedCard} />
    );

    // There should be no agent badge (the element won't be present)
    expect(screen.queryByText("Claude")).not.toBeInTheDocument();
  });

  it("shows subtask progress when subtasks present", () => {
    renderWithProviders(
      <KanbanCard card={mockCard} subtasks={mockSubtasks} />
    );

    // 2 out of 3 completed
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("does not show progress when no subtasks", () => {
    renderWithProviders(
      <KanbanCard card={mockCard} />
    );

    // Should not display subtask count
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
  });
});
