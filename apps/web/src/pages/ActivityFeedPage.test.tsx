import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/test-utils";
import ActivityFeedPage from "./ActivityFeedPage";

describe("ActivityFeedPage", () => {
  it("renders page title", () => {
    renderWithProviders(<ActivityFeedPage />);

    expect(screen.getByText("Activity Feed")).toBeInTheDocument();
  });

  it("shows empty state when no events", () => {
    renderWithProviders(<ActivityFeedPage />);

    expect(screen.getByText("No activity")).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    renderWithProviders(<ActivityFeedPage />);

    expect(screen.getByPlaceholderText("Entity")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Action")).toBeInTheDocument();
  });
});
