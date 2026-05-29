import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModeSelector from "@/components/ModeSelector";

const defaultProps = {
  mode: "drill" as const,
  drillLevel: "home-row" as const,
  passageDifficulty: "beginner" as const,
  passageCategory: "all" as const,
  unlockedDrillLevels: new Set(["home-row", "top-row"]),
  unlockedDifficulties: new Set(["beginner"]),
  drillProgress: { "home-row": 3 },
  difficultyProgress: { beginner: 2 },
  unlockThreshold: 5,
  zenAvailable: true,
  onModeChange: vi.fn(),
  onDrillLevelChange: vi.fn(),
  onDifficultyChange: vi.fn(),
  onCategoryChange: vi.fn(),
};

describe("ModeSelector", () => {
  it("should render mode toggle buttons (drill, passage, zen)", () => {
    render(<ModeSelector {...defaultProps} />);
    expect(screen.getByLabelText("Key Drill mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Passage mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Zen mode — free typing")).toBeInTheDocument();
  });

  it("should highlight active mode button", () => {
    render(<ModeSelector {...defaultProps} mode="drill" />);
    const drillBtn = screen.getByLabelText("Key Drill mode");
    expect(drillBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("should call onModeChange when mode button clicked", () => {
    const onModeChange = vi.fn();
    render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);
    fireEvent.click(screen.getByLabelText("Passage mode"));
    expect(onModeChange).toHaveBeenCalledWith("passage");
  });

  it("should show drill level buttons when in drill mode", () => {
    render(<ModeSelector {...defaultProps} mode="drill" />);
    expect(screen.getByText("home row")).toBeInTheDocument();
    expect(screen.getByText("top row")).toBeInTheDocument();
  });

  it("should disable locked drill levels", () => {
    render(<ModeSelector {...defaultProps} unlockedDrillLevels={new Set(["home-row"])} />);
    const topRow = screen.getByText("top row").closest("button")!;
    expect(topRow).toBeDisabled();
  });

  it("should call onDrillLevelChange when unlocked level clicked", () => {
    const onDrillLevelChange = vi.fn();
    render(<ModeSelector {...defaultProps} onDrillLevelChange={onDrillLevelChange} />);
    fireEvent.click(screen.getByText("top row"));
    expect(onDrillLevelChange).toHaveBeenCalledWith("top-row");
  });

  it("should show category buttons when in passage mode", () => {
    render(<ModeSelector {...defaultProps} mode="passage" />);
    expect(screen.getByText("all")).toBeInTheDocument();
    expect(screen.getByText("book")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
  });

  it("should hide zen button when zenAvailable is false", () => {
    render(<ModeSelector {...defaultProps} zenAvailable={false} />);
    expect(screen.queryByLabelText("Zen mode — free typing")).not.toBeInTheDocument();
  });
});
