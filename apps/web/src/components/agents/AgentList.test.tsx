import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/test-utils";
import { AgentList } from "./AgentList";
import type { Agent } from "@agent-board/shared";

const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Claude",
    role: "developer",
    persona: null,
    runnerId: "claude-code",
    modelConfig: null,
    llmConfig: null,
    toolPermissions: null,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "agent-2",
    name: "Reviewer Bot",
    role: "reviewer",
    persona: null,
    runnerId: null,
    modelConfig: null,
    llmConfig: null,
    toolPermissions: null,
    createdAt: "2025-01-01T00:00:00Z",
  },
];

describe("AgentList", () => {
  it("renders agent list", () => {
    renderWithProviders(
      <AgentList
        agents={mockAgents}
        onSelect={vi.fn()}
        onCreateClick={vi.fn()}
      />
    );

    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText("Reviewer Bot")).toBeInTheDocument();
    expect(screen.getByText("developer")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
  });

  it("shows empty state when no agents", () => {
    renderWithProviders(
      <AgentList
        agents={[]}
        onSelect={vi.fn()}
        onCreateClick={vi.fn()}
      />
    );

    expect(screen.getByText("No agents")).toBeInTheDocument();
  });

  it("calls onCreateClick when New Agent button is clicked", async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    renderWithProviders(
      <AgentList
        agents={mockAgents}
        onSelect={vi.fn()}
        onCreateClick={onCreateClick}
      />
    );

    await user.click(screen.getByText("New Agent"));
    expect(onCreateClick).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect when agent card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithProviders(
      <AgentList
        agents={mockAgents}
        onSelect={onSelect}
        onCreateClick={vi.fn()}
      />
    );

    await user.click(screen.getByText("Claude"));
    expect(onSelect).toHaveBeenCalledWith("agent-1");
  });
});
