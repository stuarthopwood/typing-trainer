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

  // The tests below need to invoke the socket's onmessage handler, so they use
  // a constructor that captures the live instance. `new vi.fn(() => obj)()`
  // does NOT return `obj` (mock wrappers break `new`+return-object semantics),
  // hence the `this`-assignment ctor here rather than reusing `mockWs`.
  function stubCapturingWebSocket(): () => { onmessage: ((ev: MessageEvent) => void) | null } {
    let instance: { onmessage: ((ev: MessageEvent) => void) | null } | null = null;
    const ctor = vi.fn(function (this: Record<string, unknown>) {
      this.readyState = 1;
      this.close = vi.fn();
      this.send = vi.fn();
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      instance = this as unknown as { onmessage: ((ev: MessageEvent) => void) | null };
    });
    vi.stubGlobal("WebSocket", ctor);
    return () => {
      if (!instance) throw new Error("WebSocket was never constructed");
      return instance;
    };
  }

  it("should surface the polling mode from a connected status message", async () => {
    // Given a connected companion socket
    const getSocket = stubCapturingWebSocket();
    const { connectHid, onHidStatus } = await import("@/lib/hall-effect");
    const received: Array<string | null> = [];
    onHidStatus((s) => received.push(s.mode));
    connectHid();

    // When it reports a per-key connection
    getSocket().onmessage?.({
      data: JSON.stringify({
        connected: true,
        device: "Keychron K2 HE",
        version: "AMC v4",
        mode: "perkey",
        error: null,
      }),
    } as MessageEvent);

    // Then the mode is propagated to subscribers
    expect(received).toContain("perkey");
  });

  it("should route travel frames to frame callbacks, not status callbacks", async () => {
    // Given a connected companion socket with both callback kinds registered
    const getSocket = stubCapturingWebSocket();
    const { connectHid, onHidFrame, onHidStatus } = await import("@/lib/hall-effect");
    const frameCb = vi.fn();
    const statusCb = vi.fn();
    onHidFrame(frameCb);
    onHidStatus(statusCb);
    connectHid();

    // When a valid 96-key travel frame arrives
    const keys = new Array(96).fill(0);
    keys[5] = 235;
    getSocket().onmessage?.({
      data: JSON.stringify({ timestamp_ms: 1, keys, poll_rate_hz: 5 }),
    } as MessageEvent);

    // Then only the frame callback fires
    expect(frameCb).toHaveBeenCalledOnce();
    expect(statusCb).not.toHaveBeenCalled();
  });

  it("should ignore travel frames whose key count is not 96", async () => {
    // Given a connected socket with a frame subscriber
    const getSocket = stubCapturingWebSocket();
    const { connectHid, onHidFrame } = await import("@/lib/hall-effect");
    const frameCb = vi.fn();
    onHidFrame(frameCb);
    connectHid();

    // When a short (garbled) frame arrives
    getSocket().onmessage?.({
      data: JSON.stringify({ timestamp_ms: 1, keys: [0, 1, 2], poll_rate_hz: 5 }),
    } as MessageEvent);

    // Then it is not forwarded to subscribers
    expect(frameCb).not.toHaveBeenCalled();
  });

  it("should drop oversized frames without attempting to parse them", async () => {
    // Given a connected socket with a frame subscriber
    const getSocket = stubCapturingWebSocket();
    const { connectHid, onHidFrame } = await import("@/lib/hall-effect");
    const frameCb = vi.fn();
    onHidFrame(frameCb);
    connectHid();

    // When a payload larger than the cap arrives
    getSocket().onmessage?.({ data: "x".repeat(10_001) } as MessageEvent);

    // Then it is dropped, not forwarded
    expect(frameCb).not.toHaveBeenCalled();
  });

  it("should not crash on malformed JSON", async () => {
    // Given a connected socket with both callback kinds
    const getSocket = stubCapturingWebSocket();
    const { connectHid, onHidFrame, onHidStatus } = await import("@/lib/hall-effect");
    const frameCb = vi.fn();
    const statusCb = vi.fn();
    onHidFrame(frameCb);
    onHidStatus(statusCb);
    connectHid();

    // When invalid JSON arrives
    // Then it neither throws nor invokes any callback
    expect(() =>
      getSocket().onmessage?.({ data: "{not json" } as MessageEvent),
    ).not.toThrow();
    expect(frameCb).not.toHaveBeenCalled();
    expect(statusCb).not.toHaveBeenCalled();
  });

  it("should mark status disconnected with an error when the socket closes", async () => {
    // Given a connected socket with a status subscriber
    const getSocket = stubCapturingWebSocket();
    const { connectHid, onHidStatus, getHidStatus } =
      await import("@/lib/hall-effect");
    const statusCb = vi.fn();
    onHidStatus(statusCb);
    connectHid();

    // When the socket closes
    const socket = getSocket() as unknown as { onclose: ((ev: CloseEvent) => void) | null };
    socket.onclose?.({} as CloseEvent);

    // Then status reflects a disconnect with an error message
    expect(getHidStatus().connected).toBe(false);
    expect(getHidStatus().error).toBe("Companion service disconnected");
    expect(statusCb).toHaveBeenCalled();
  });

  it("should report an error status when the socket errors", async () => {
    // Given a connected socket
    const getSocket = stubCapturingWebSocket();
    const { connectHid, getHidStatus } = await import("@/lib/hall-effect");
    connectHid();

    // When the socket emits an error
    const socket = getSocket() as unknown as { onerror: ((ev: Event) => void) | null };
    socket.onerror?.({} as Event);

    // Then status reports it is unreachable
    expect(getHidStatus().connected).toBe(false);
    expect(getHidStatus().error).toBe("Cannot reach companion service");
  });

  it("should not open a second socket while one is already connecting", async () => {
    // Given a stubbed constructor that counts instantiations
    let count = 0;
    const ctor = vi.fn(function (this: Record<string, unknown>) {
      count += 1;
      this.readyState = 0; // CONNECTING
      this.close = vi.fn();
    });
    (ctor as unknown as { OPEN: number; CONNECTING: number }).OPEN = 1;
    (ctor as unknown as { OPEN: number; CONNECTING: number }).CONNECTING = 0;
    vi.stubGlobal("WebSocket", ctor);
    const { connectHid } = await import("@/lib/hall-effect");

    // When connectHid is called twice while still connecting
    connectHid();
    connectHid();

    // Then only one socket is constructed
    expect(count).toBe(1);
  });

  it("should schedule a reconnect when the constructor throws", async () => {
    // Given a WebSocket constructor that throws synchronously
    vi.useFakeTimers();
    let attempts = 0;
    const ctor = vi.fn(function () {
      attempts += 1;
      throw new Error("refused");
    });
    (ctor as unknown as { OPEN: number; CONNECTING: number }).OPEN = 1;
    (ctor as unknown as { OPEN: number; CONNECTING: number }).CONNECTING = 0;
    vi.stubGlobal("WebSocket", ctor);
    const { connectHid } = await import("@/lib/hall-effect");

    // When connectHid is called and the reconnect interval elapses
    expect(() => connectHid()).not.toThrow();
    await vi.advanceTimersByTimeAsync(5000);

    // Then a reconnect was attempted (constructor called more than once)
    expect(attempts).toBeGreaterThan(1);
    vi.useRealTimers();
  });
});
