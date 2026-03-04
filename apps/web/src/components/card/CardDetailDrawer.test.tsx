import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { CardDetailDrawer } from "./CardDetailDrawer";
import type { Card, Agent } from "@agent-board/shared";

const mockCard: Card = {
  id: "card-1",
  boardId: "b1",
  columnId: "col-1",
  title: "Implement user auth",
  description: "Add JWT-based authentication",
  status: "in_progress" as const,
  priority: "high" as const,
  position: 0,
  assigneeAgentId: "agent-1",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Claude",
    role: "developer",
    persona: null,
    runnerId: null,
    modelConfig: null,
    toolPermissions: null,
    createdAt: "2025-01-01T00:00:00Z",
  },
];

describe("CardDetailDrawer", () => {
  it("renders card title when opened", () => {
    renderWithProviders(
      <CardDetailDrawer
        card={mockCard}
        agents={mockAgents}
        boardId="b1"
        opened={true}
        onClose={vi.fn()}
        onUpdateTitle={vi.fn()}
        onUpdateStatus={vi.fn()}
        onUpdateAssignee={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Implement user auth")).toBeInTheDocument();
  });

  it("shows tabs for subtasks, criteria, artifacts, discussion, runs", () => {
    renderWithProviders(
      <CardDetailDrawer
        card={mockCard}
        agents={mockAgents}
        boardId="b1"
        opened={true}
        onClose={vi.fn()}
        onUpdateTitle={vi.fn()}
        onUpdateStatus={vi.fn()}
        onUpdateAssignee={vi.fn()}
      />
    );

    expect(screen.getByText("Subtasks")).toBeInTheDocument();
    expect(screen.getByText("Criteria")).toBeInTheDocument();
    expect(screen.getByText("Artifacts")).toBeInTheDocument();
    expect(screen.getByText("Discussion")).toBeInTheDocument();
    expect(screen.getByText("Runs")).toBeInTheDocument();
  });

  it("does not render when card is null", () => {
    const { container } = renderWithProviders(
      <CardDetailDrawer
        card={null}
        agents={mockAgents}
        boardId="b1"
        opened={true}
        onClose={vi.fn()}
        onUpdateTitle={vi.fn()}
        onUpdateStatus={vi.fn()}
        onUpdateAssignee={vi.fn()}
      />
    );

    // Should not render drawer content
    expect(screen.queryByDisplayValue("Implement user auth")).not.toBeInTheDocument();
  });

  it("displays status and assignee selectors", () => {
    renderWithProviders(
      <CardDetailDrawer
        card={mockCard}
        agents={mockAgents}
        boardId="b1"
        opened={true}
        onClose={vi.fn()}
        onUpdateTitle={vi.fn()}
        onUpdateStatus={vi.fn()}
        onUpdateAssignee={vi.fn()}
      />
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Assignee")).toBeInTheDocument();
  });
});
