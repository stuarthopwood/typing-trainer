import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NemesisCard from "@/components/NemesisCard";

describe("NemesisCard", () => {
  it("should show empty state when no errors in heatmap", () => {
    render(<NemesisCard errorHeatmap={{}} />);
    expect(screen.getByText(/no nemesis yet/i)).toBeInTheDocument();
  });

  it("should identify worst key from heatmap", () => {
    render(<NemesisCard errorHeatmap={{ q: 15, w: 3, e: 2 }} />);
    expect(screen.getByText("q")).toBeInTheDocument();
  });

  it("should show accuracy percentage for nemesis key", () => {
    render(<NemesisCard errorHeatmap={{ q: 15 }} />);
    expect(screen.getByText(/%/)).toBeInTheDocument();
  });

  it("should show skull icon", () => {
    render(<NemesisCard errorHeatmap={{ q: 15 }} />);
    expect(screen.getByText("Nemesis Key")).toBeInTheDocument();
  });
});
