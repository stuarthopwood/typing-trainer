const WS_URL = "ws://localhost:39850";
const RECONNECT_INTERVAL = 5000;

export interface TravelFrame {
  timestamp_ms: number;
  keys: number[];
  poll_rate_hz: number;
}

export interface HidStatus {
  connected: boolean;
  device: string | null;
  version: string | null;
  error: string | null;
}

type FrameCallback = (frame: TravelFrame) => void;
type StatusCallback = (status: HidStatus) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let frameCallbacks: FrameCallback[] = [];
let statusCallbacks: StatusCallback[] = [];
let lastStatus: HidStatus = { connected: false, device: null, version: null, error: null };

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
    lastStatus = { connected: true, device: null, version: null, error: null };
    statusCallbacks.forEach((cb) => cb(lastStatus));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if ("keys" in data) {
        frameCallbacks.forEach((cb) => cb(data as TravelFrame));
      } else if ("connected" in data) {
        lastStatus = data as HidStatus;
        statusCallbacks.forEach((cb) => cb(lastStatus));
      }
    } catch (e) { console.warn("[HID] Malformed message:", e); }
  };

  ws.onclose = () => {
    lastStatus = { connected: false, device: null, version: null, error: "Companion service disconnected" };
    statusCallbacks.forEach((cb) => cb(lastStatus));
    scheduleReconnect();
  };

  ws.onerror = () => {
    lastStatus = { connected: false, device: null, version: null, error: "Cannot reach companion service" };
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
  lastStatus = { connected: false, device: null, version: null, error: null };
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
