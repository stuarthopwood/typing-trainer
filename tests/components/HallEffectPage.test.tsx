import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { HidStatus } from "@/lib/hall-effect";

// Capture the status subscriber the page registers, so tests can drive it.
let statusSubscriber: ((s: HidStatus) => void) | null = null;
let resolveAvailable: (v: boolean) => void;

vi.mock("@/lib/hall-effect", () => ({
  isCompanionAvailable: vi.fn(
    () => new Promise<boolean>((res) => { resolveAvailable = res; }),
  ),
  connectHid: vi.fn(),
  disconnectHid: vi.fn(),
  onHidStatus: vi.fn((cb: (s: HidStatus) => void) => {
    statusSubscriber = cb;
    return () => { statusSubscriber = null; };
  }),
}));

import HallEffectPage from "@/app/hall-effect/page";

function emitStatus(status: Partial<HidStatus>) {
  const full: HidStatus = {
    connected: false,
    device: null,
    version: null,
    mode: null,
    error: null,
    ...status,
  };
  act(() => statusSubscriber?.(full));
}

describe("HallEffectPage — connection + mode indicator", () => {
  beforeEach(() => {
    statusSubscriber = null;
  });

  it("should show the not-running prompt before any connection", () => {
    render(<HallEffectPage />);
    // Given the page just mounted and the companion hasn't reported in
    // Then it tells the user to install/run the companion
    expect(
      screen.getByText("Install and run the companion service to enable this feature"),
    ).toBeInTheDocument();
  });

  it("should describe batch mode when the companion reports batch", () => {
    render(<HallEffectPage />);
    // When the companion connects in batch mode
    emitStatus({ connected: true, mode: "batch" });
    // Then the ~100Hz batch description is shown
    expect(
      screen.getByText("Receiving analog key data — batch mode (~100Hz)"),
    ).toBeInTheDocument();
  });

  it("should describe per-key mode when the companion reports perkey", () => {
    render(<HallEffectPage />);
    // When the companion connects on stock firmware
    emitStatus({ connected: true, mode: "perkey" });
    // Then the ~5Hz per-key description is shown
    expect(
      screen.getByText("Receiving analog key data — per-key mode (~5Hz, stock firmware)"),
    ).toBeInTheDocument();
  });

  it("should fall back to a generic connected message when mode is unknown", () => {
    render(<HallEffectPage />);
    // When connected but no mode reported yet
    emitStatus({ connected: true, mode: null });
    // Then a generic connected message is shown
    expect(screen.getByText("NeuralKeys is receiving analog key data")).toBeInTheDocument();
  });

  it("should expose the status region to assistive tech", () => {
    render(<HallEffectPage />);
    // The status indicator is a polite live region
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });
});
