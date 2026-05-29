import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockWs = {
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1,
  onopen: null as ((ev: Event) => void) | null,
  onmessage: null as ((ev: MessageEvent) => void) | null,
  onclose: null as ((ev: CloseEvent) => void) | null,
  onerror: null as ((ev: Event) => void) | null,
  OPEN: 1,
  CONNECTING: 0,
};

vi.stubGlobal("WebSocket", vi.fn(() => mockWs));

describe("Hall Effect — WebSocket client", () => {
  beforeEach(() => {
    vi.resetModules();
    mockWs.close.mockClear();
    mockWs.readyState = 1;
    mockWs.onopen = null;
    mockWs.onmessage = null;
    mockWs.onclose = null;
    mockWs.onerror = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should connect to localhost WebSocket on connectHid (US1)", async () => {
    // Given the module is freshly imported
    const { connectHid } = await import("@/lib/hall-effect");

    // When connectHid is called
    connectHid();

    // Then a WebSocket is created to localhost:39850
    expect(WebSocket).toHaveBeenCalledWith("ws://localhost:39850");
  });

  it("should register and unregister frame callbacks (US2)", async () => {
    const { onHidFrame } = await import("@/lib/hall-effect");

    // Given a frame callback is registered
    const cb = vi.fn();
    const unsub = onHidFrame(cb);

    // Then the callback is registered
    expect(typeof unsub).toBe("function");

    // When unsubscribed
    unsub();
    // Then no error (callback removed)
  });

  it("should register and unregister status callbacks (US2)", async () => {
    const { onHidStatus } = await import("@/lib/hall-effect");

    // Given a status callback is registered
    const cb = vi.fn();
    const unsub = onHidStatus(cb);

    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("should return initial disconnected status (US3)", async () => {
    const { getHidStatus } = await import("@/lib/hall-effect");

    // Given no connection has been made
    const status = getHidStatus();

    // Then status shows disconnected
    expect(status.connected).toBe(false);
    expect(status.device).toBeNull();
  });

  it("should reset status on disconnectHid (US4)", async () => {
    const { disconnectHid, getHidStatus } = await import("@/lib/hall-effect");

    // When disconnectHid is called (even without prior connect)
    disconnectHid();

    // Then status shows disconnected
    expect(getHidStatus().connected).toBe(false);
    expect(getHidStatus().error).toBeNull();
  });

  it("should export isCompanionAvailable as async function (US5)", async () => {
    const { isCompanionAvailable } = await import("@/lib/hall-effect");

    // Then it returns a promise
    const result = isCompanionAvailable();
    expect(result).toBeInstanceOf(Promise);
  });
});
