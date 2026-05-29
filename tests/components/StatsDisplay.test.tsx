import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsDisplay from "@/components/StatsDisplay";

describe("StatsDisplay", () => {
  it("should show live WPM and accuracy when active", () => {
    render(<StatsDisplay stats={null} liveWpm={45} liveAccuracy={92} isActive={true} elapsed={5000} combo={0} />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("should show session stats when session is complete", () => {
    const stats = { wpm: 50, accuracy: 95, totalChars: 100, correctChars: 95, errors: 5, duration: 30000, keyStrokes: [] };
    render(<StatsDisplay stats={stats} liveWpm={0} liveAccuracy={0} isActive={false} elapsed={0} combo={0} />);
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("30s")).toBeInTheDocument();
  });

  it("should show combo counter when combo > 2", () => {
    render(<StatsDisplay stats={null} liveWpm={30} liveAccuracy={90} isActive={true} elapsed={5000} combo={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Combo")).toBeInTheDocument();
  });

  it("should not show combo when combo <= 2", () => {
    render(<StatsDisplay stats={null} liveWpm={30} liveAccuracy={90} isActive={true} elapsed={5000} combo={1} />);
    expect(screen.queryByText("Combo")).not.toBeInTheDocument();
  });

  it("should show session averages when provided", () => {
    render(<StatsDisplay stats={null} liveWpm={30} liveAccuracy={90} isActive={true} elapsed={5000} combo={0} sessionAvgWpm={35} sessionAvgAccuracy={88} />);
    expect(screen.getByText(/session avg/i)).toBeInTheDocument();
  });
});
