import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { AgentDetailForm } from "./AgentDetailForm";
import type { Agent } from "@agent-board/shared";

const mockAgent: Agent = {
  id: "agent-1",
  name: "Claude",
  role: "developer",
  persona: "A helpful coding assistant",
  runnerId: "claude-code",
  modelConfig: null,
  toolPermissions: null,
  createdAt: "2025-01-01T00:00:00Z",
};

describe("AgentDetailForm", () => {
  it("shows placeholder when no agent selected", () => {
    renderWithProviders(
      <AgentDetailForm agent={null} onSave={vi.fn()} />
    );

    expect(screen.getByText("Select an agent to view details.")).toBeInTheDocument();
  });

  it("renders form fields for agent", () => {
    renderWithProviders(
      <AgentDetailForm agent={mockAgent} onSave={vi.fn()} />
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Persona")).toBeInTheDocument();
    expect(screen.getByText("Runner")).toBeInTheDocument();
    expect(screen.getByText("Model Config")).toBeInTheDocument();
  });

  it("populates form fields with agent data", () => {
    renderWithProviders(
      <AgentDetailForm agent={mockAgent} onSave={vi.fn()} />
    );

    const nameInput = screen.getByDisplayValue("Claude");
    expect(nameInput).toBeInTheDocument();

    const roleInput = screen.getByDisplayValue("developer");
    expect(roleInput).toBeInTheDocument();
  });

  it("shows save button", () => {
    renderWithProviders(
      <AgentDetailForm agent={mockAgent} onSave={vi.fn()} />
    );

    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});
