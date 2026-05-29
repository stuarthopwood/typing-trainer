import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BadgeGallery from "@/components/BadgeGallery";
import type { BadgeProgress } from "@/lib/types";

describe("BadgeGallery", () => {
  it("should render all 15 badge slots", () => {
    render(<BadgeGallery badges={[]} />);
    const badges = screen.getAllByRole("img");
    expect(badges.length).toBe(15);
  });

  it("should show unlocked badges with name and subtitle", () => {
    const badges: BadgeProgress[] = [
      { id: "caveman", unlockedAt: "2026-05-20" },
      { id: "hunt-and-pecker", unlockedAt: "2026-05-21" },
    ];
    render(<BadgeGallery badges={badges} />);
    expect(screen.getByText("Caveman")).toBeInTheDocument();
    expect(screen.getByText("Hunt & Pecker")).toBeInTheDocument();
  });

  it("should show locked badges with level number", () => {
    render(<BadgeGallery badges={[]} />);
    expect(screen.getByText("Lv.8")).toBeInTheDocument();
    expect(screen.getByText("Lv.15")).toBeInTheDocument();
  });

  it("should display unlock date for earned badges", () => {
    const badges: BadgeProgress[] = [{ id: "caveman", unlockedAt: "2026-05-20T12:00:00Z" }];
    render(<BadgeGallery badges={badges} />);
    const dateElements = screen.getAllByText(/2026/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
