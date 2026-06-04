const WS_URL = "ws://localhost:39850";
const RECONNECT_INTERVAL = 5000;
/// Largest WebSocket frame we'll parse. A real travel frame is ~500 bytes
/// (96-element array + metadata); 10KB is a generous ceiling that stops a
/// rogue local process from freezing the tab with a JSON bomb.
const MAX_FRAME_BYTES = 10_000;
/// A travel frame always carries one value per matrix cell (6 rows x 16 cols).
const EXPECTED_KEY_COUNT = 96;

export interface TravelFrame {
  timestamp_ms: number;
  keys: number[];
  poll_rate_hz: number;
}

export type PollMode = "batch" | "perkey";

export interface HidStatus {
  connected: boolean;
  device: string | null;
  version: string | null;
  /** Active polling mode while connected: ~100Hz batch or ~5Hz per-key. Null when disconnected. */
  mode: PollMode | null;
  error: string | null;
}

type FrameCallback = (frame: TravelFrame) => void;
type StatusCallback = (status: HidStatus) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let frameCallbacks: FrameCallback[] = [];
let statusCallbacks: StatusCallback[] = [];
function disconnectedStatus(error: string | null): HidStatus {
  return { connected: false, device: null, version: null, mode: null, error };
}

let lastStatus: HidStatus = disconnectedStatus(null);

export function getHidStatus(): HidStatus {
  return lastStatus;
}

export function onHidFrame(cb: FrameCallback): () => void {
  frameCallbacks.push(cb);
  return () => { frameCallbacks = frameCallbacks.filter((c) => c !== cb); };
}

export function onHidStatus(cb: StatusCallback): () => void {
  statusCallbacks.push(cb);
  return () => { statusCallbacks = statusCallbacks.filter((c) => c !== cb); };
}

export function connectHid(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    ws = new WebSocket(WS_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    lastStatus = { connected: true, device: null, version: null, mode: null, error: null };
    statusCallbacks.forEach((cb) => cb(lastStatus));
  };

  ws.onmessage = (event) => {
    // Defend against an oversized payload from a rogue local process.
    if (typeof event.data === "string" && event.data.length > MAX_FRAME_BYTES) {
      console.warn("[HID] Dropped oversized frame:", event.data.length, "bytes");
      return;
    }
    try {
      const data = JSON.parse(event.data);
      if ("keys" in data) {
        // The companion guarantees 96 values; reject short/garbled frames
        // rather than forwarding a malformed array to subscribers.
        if (Array.isArray(data.keys) && data.keys.length === EXPECTED_KEY_COUNT) {
          frameCallbacks.forEach((cb) => cb(data as TravelFrame));
        } else {
          console.warn("[HID] Ignored frame with unexpected key count:", data.keys?.length);
        }
      } else if ("connected" in data) {
        lastStatus = data as HidStatus;
        statusCallbacks.forEach((cb) => cb(lastStatus));
      }
    } catch (e) { console.warn("[HID] Malformed message:", e); }
  };

  ws.onclose = () => {
    lastStatus = disconnectedStatus("Companion service disconnected");
    statusCallbacks.forEach((cb) => cb(lastStatus));
    scheduleReconnect();
  };

  ws.onerror = () => {
    lastStatus = disconnectedStatus("Cannot reach companion service");
    statusCallbacks.forEach((cb) => cb(lastStatus));
  };
}

export function disconnectHid(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  lastStatus = disconnectedStatus(null);
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectHid();
  }, RECONNECT_INTERVAL);
}

export function isCompanionAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const test = new WebSocket(WS_URL);
      const timeout = setTimeout(() => { test.close(); resolve(false); }, 1000);
      test.onopen = () => { clearTimeout(timeout); test.close(); resolve(true); };
      test.onerror = () => { clearTimeout(timeout); resolve(false); };
    } catch { resolve(false); }
  });
}
