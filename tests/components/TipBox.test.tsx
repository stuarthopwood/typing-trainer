import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TipBox from "@/components/TipBox";

describe("TipBox", () => {
  it("should not render when no tip and not loading", () => {
    const { container } = render(<TipBox tip={null} loading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("should show loading indicator when loading", () => {
    render(<TipBox tip={null} loading={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should display tip text when provided", () => {
    render(<TipBox tip="Focus on your left pinky finger" loading={false} />);
    expect(screen.getByText(/left pinky/i)).toBeInTheDocument();
  });

  it("should have aria-live polite for screen readers", () => {
    render(<TipBox tip="Test tip" loading={false} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
