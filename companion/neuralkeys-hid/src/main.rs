mod protocol;

use futures_util::{SinkExt, StreamExt};
use hidapi::HidApi;
use named_lock::NamedLock;
use serde::Serialize;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::accept_hdr_async;
use tokio_tungstenite::tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tokio_tungstenite::tungstenite::http::StatusCode;
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};

use protocol::{
    assemble_batch_payload, build_command, index_to_row_col, parse_version_response,
    travel_offset_for_version, CMD_GET_TRAVEL, CMD_GET_TRAVEL_ALL, CMD_GET_VERSION, CMD_PREFIX,
    K2_HE_LAYOUT, K2_HE_PIDS, KEYCHRON_VID, KEY_COUNT, TRAVEL_BATCH_REPORTS, USAGE, USAGE_PAGE,
};

const WS_PORT: u16 = 39850;
const POLL_INTERVAL_MS: u64 = 10; // target 100Hz (batch mode)
const READ_TIMEOUT_MS: i32 = 100;
/// How many consecutive failed read cycles before we drop the connection and
/// re-enumerate. Prevents a transient hiccup from killing a working session.
const MAX_CONSECUTIVE_ERRORS: u32 = 5;
/// Upper bound on reports drained while waiting for a command's matching
/// response in [`safe_receive_report`]. At `READ_TIMEOUT_MS` per read this
/// caps the wait near `MAX_REPORT_DRAIN * READ_TIMEOUT_MS` while still
/// filtering interleaved keyboard-input reports; exceeding it means the device
/// is answering with something other than our command echo, so we give up.
const MAX_REPORT_DRAIN: usize = 16;
/// Windows mutex name shared with Keychron Launcher / AnalogSense so multiple
/// readers of the raw-HID interface don't interleave each other's reports.
const KEYCHRON_MUTEX: &str = "Global\\KeychronMtx";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
enum PollMode {
    /// Firmware advertises 0x45 — single round-trip travel for all keys (~100Hz).
    Batch,
    /// Stock firmware — one key per round-trip, full sweep per frame (~5Hz).
    PerKey,
}

#[derive(Debug, Clone, Serialize)]
struct TravelFrame {
    timestamp_ms: f64,
    keys: Vec<u8>, // 96 values (6 rows x 16 cols), each 0-255
    poll_rate_hz: f32,
}

#[derive(Debug, Clone, Serialize)]
struct StatusMessage {
    connected: bool,
    device: Option<String>,
    version: Option<String>,
    mode: Option<PollMode>,
    error: Option<String>,
}

impl StatusMessage {
    fn disconnected(error: impl Into<String>) -> Self {
        StatusMessage {
            connected: false,
            device: None,
            version: None,
            mode: None,
            error: Some(error.into()),
        }
    }
}

fn find_device(api: &HidApi) -> Option<hidapi::DeviceInfo> {
    for device in api.device_list() {
        if device.vendor_id() == KEYCHRON_VID
            && K2_HE_PIDS.contains(&device.product_id())
            && device.usage_page() == USAGE_PAGE
            && device.usage() == USAGE
        {
            return Some(device.clone());
        }
    }
    None
}

/// Read reports until one whose first two bytes echo `[CMD_PREFIX, cmd]`,
/// discarding interleaved keyboard-input reports. Mirrors AnalogSense's
/// `safeReceiveReport`. Returns the report payload (including the echo header)
/// or `Err` on timeout / read failure.
fn safe_receive_report(device: &hidapi::HidDevice, cmd: u8) -> Result<Vec<u8>, String> {
    // Bounded so a chatty keyboard can never wedge us in an infinite loop.
    for _ in 0..MAX_REPORT_DRAIN {
        let mut buf = [0u8; 33];
        let n = device
            .read_timeout(&mut buf, READ_TIMEOUT_MS)
            .map_err(|e| format!("read failed: {e}"))?;
        if n == 0 {
            return Err("timeout reading response".into());
        }
        if n >= 2 && buf[0] == CMD_PREFIX && buf[1] == cmd {
            return Ok(buf[..n].to_vec());
        }
        // else: an interleaved input report — keep reading.
    }
    Err("no matching response after draining reports".into())
}

/// Drain any buffered input reports before issuing a command, so the next read
/// sees our response and not stale typing data. This matters in per-key mode
/// where every response shares the same `[CMD_PREFIX, 0x30]` header — without
/// draining first, `safe_receive_report` could return the previous key's value
/// for the current key.
///
/// `read_timeout(.., 0)` is a non-blocking poll: it returns immediately with 0
/// when the buffer is empty. A read error also ends the drain (the subsequent
/// command write will surface it); both are expected loop exits, not failures.
fn discard_stale_reports(device: &hidapi::HidDevice) {
    let mut buf = [0u8; 33];
    while let Ok(n) = device.read_timeout(&mut buf, 0) {
        if n == 0 {
            break;
        }
    }
}

/// Result of the connection handshake: the analog-module firmware version and
/// the polling mode it supports. `am_version` drives the per-key payload
/// offset; the display string is derived once at the call site for logging.
struct Negotiated {
    am_version: u8,
    mode: PollMode,
}

impl Negotiated {
    /// Human-readable firmware version for logs and the status message.
    fn version_string(&self) -> String {
        format!("AMC v{}", self.am_version)
    }
}

/// Send GET_VERSION and decide which polling mode the firmware supports.
fn negotiate_mode(device: &hidapi::HidDevice) -> Result<Negotiated, String> {
    discard_stale_reports(device);
    let cmd = build_command(CMD_GET_VERSION, &[]);
    device.write(&cmd).map_err(|e| format!("write failed: {e}"))?;

    let report = safe_receive_report(device, CMD_GET_VERSION)?;
    let (am_version, is_batch) =
        parse_version_response(&report).ok_or("version response too short")?;

    let mode = if is_batch {
        PollMode::Batch
    } else {
        PollMode::PerKey
    };
    Ok(Negotiated { am_version, mode })
}

/// Batch mode: one 0x31 command yields travel for every key across 4 reports.
fn read_travel_batch(device: &hidapi::HidDevice) -> Result<Vec<u8>, String> {
    discard_stale_reports(device);
    let cmd = build_command(CMD_GET_TRAVEL_ALL, &[]);
    device.write(&cmd).map_err(|e| format!("write failed: {e}"))?;

    let mut reports: Vec<Vec<u8>> = Vec::with_capacity(TRAVEL_BATCH_REPORTS);
    for _ in 0..TRAVEL_BATCH_REPORTS {
        reports.push(safe_receive_report(device, CMD_GET_TRAVEL_ALL)?);
    }
    let slices: Vec<&[u8]> = reports.iter().map(|r| r.as_slice()).collect();
    let payload = assemble_batch_payload(&slices);
    if payload.len() < KEY_COUNT {
        return Err(format!(
            "batch payload too short: {} of {KEY_COUNT} bytes",
            payload.len()
        ));
    }
    Ok(payload)
}

/// Per-key mode: walk the layout, query 0x30 for each occupied slot, and fold
/// the responses into a 96-byte frame. `buffer` carries values between sweeps
/// so the emitted frame is always complete.
fn read_travel_per_key(
    device: &hidapi::HidDevice,
    am_version: u8,
    buffer: &mut [u8; KEY_COUNT],
) -> Result<Vec<u8>, String> {
    let offset = travel_offset_for_version(am_version);
    for (index, occupied) in K2_HE_LAYOUT.iter().enumerate() {
        if !occupied {
            buffer[index] = 0;
            continue;
        }
        let (row, col) = index_to_row_col(index as u8);
        discard_stale_reports(device);
        let cmd = build_command(CMD_GET_TRAVEL, &[row, col]);
        device.write(&cmd).map_err(|e| format!("write failed: {e}"))?;
        let report = safe_receive_report(device, CMD_GET_TRAVEL)?;
        buffer[index] = report.get(offset).copied().unwrap_or(0);
    }
    Ok(buffer.to_vec())
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    info!("NeuralKeys HID Companion v{}", env!("CARGO_PKG_VERSION"));
    info!("WebSocket server starting on ws://localhost:{WS_PORT}");

    let (tx, _) = broadcast::channel::<String>(64);
    let tx = Arc::new(tx);

    let tx_hid = tx.clone();
    tokio::task::spawn_blocking(move || {
        hid_poll_loop(tx_hid);
    });

    let listener = match TcpListener::bind(format!("127.0.0.1:{WS_PORT}")).await {
        Ok(l) => l,
        Err(e) => {
            error!("Port {WS_PORT} is already in use. Close any other neuralkeys-hid instances. Error: {e}");
            std::process::exit(1);
        }
    };

    info!("Listening on ws://localhost:{WS_PORT}");

    while let Ok((stream, addr)) = listener.accept().await {
        info!("New connection from {addr}");
        let mut rx = tx.subscribe();

        tokio::spawn(async move {
            // Reject cross-origin browser connections during the handshake —
            // only loopback origins (or native clients with no Origin) may read
            // the analog stream. See `origin_guard` / `is_origin_allowed`.
            let ws = match accept_hdr_async(stream, origin_guard).await {
                Ok(ws) => ws,
                Err(e) => {
                    error!("WebSocket handshake failed or rejected: {e}");
                    return;
                }
            };

            let (mut ws_tx, mut ws_rx) = ws.split();

            loop {
                tokio::select! {
                    msg = rx.recv() => {
                        match msg {
                            Ok(data) => {
                                if ws_tx.send(Message::Text(data)).await.is_err() {
                                    break;
                                }
                            }
                            Err(_) => break,
                        }
                    }
                    msg = ws_rx.next() => {
                        match msg {
                            Some(Ok(Message::Close(_))) | None => break,
                            _ => {}
                        }
                    }
                }
            }

            info!("Connection from {addr} closed");
        });
    }
}

fn broadcast_status(tx: &broadcast::Sender<String>, status: &StatusMessage) {
    let _ = tx.send(serde_json::to_string(status).unwrap_or_default());
}

/// Handshake callback for `accept_hdr_async`: allow the upgrade only from a
/// permitted origin, otherwise respond 403. The large-`Err` lint is allowed
/// here because the `Result<Response, ErrorResponse>` shape is dictated by the
/// tokio-tungstenite callback signature — we can't box it.
#[allow(clippy::result_large_err)]
fn origin_guard(req: &Request, response: Response) -> Result<Response, ErrorResponse> {
    let origin = req.headers().get("origin").and_then(|v| v.to_str().ok());
    if is_origin_allowed(origin, &extra_allowed_origins()) {
        Ok(response)
    } else {
        warn!("Rejected WebSocket connection from disallowed origin: {origin:?}");
        let mut err = ErrorResponse::new(Some(
            "origin not allowed; set NEURALKEYS_ALLOWED_ORIGINS to permit it".to_string(),
        ));
        *err.status_mut() = StatusCode::FORBIDDEN;
        Err(err)
    }
}

/// Production NeuralKeys origin (the deployed Vercel app connects *down* to
/// this local companion, so its Origin is the public domain, not localhost).
const PROD_ORIGIN_HOST: &str = "typing-trainer-one.vercel.app";

/// Extra origins from `NEURALKEYS_ALLOWED_ORIGINS` (comma-separated), so a
/// custom domain or a one-off host can be permitted without a rebuild.
fn extra_allowed_origins() -> Vec<String> {
    std::env::var("NEURALKEYS_ALLOWED_ORIGINS")
        .map(|v| {
            v.split(',')
                .map(|s| s.trim().to_lowercase())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

/// Extract the host (no scheme, no port, no path) from an Origin.
fn origin_host(origin: &str) -> &str {
    let host = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
        .unwrap_or(origin);
    let host = host.split('/').next().unwrap_or(host);
    // Bracketed IPv6 (`[::1]` / `[::1]:8080`): the host ends at `]`; only a
    // colon *after* the bracket is a port separator.
    if let Some(end) = host.strip_prefix('[').and_then(|_| host.find(']')) {
        return &host[..=end];
    }
    // Otherwise strip a trailing `:port` if present.
    host.rsplit_once(':').map(|(h, _)| h).unwrap_or(host)
}

/// Whether a WebSocket `Origin` header is allowed to connect.
///
/// The companion streams per-key analog travel — combined with timing analysis
/// that could leak typing behaviour — so we don't let arbitrary web pages open
/// the socket just because they run on the same machine. Allowed:
///  - native (non-browser) clients, which send no `Origin`;
///  - loopback hosts (`localhost` / `127.0.0.1` / `[::1]`), for local dev;
///  - the production NeuralKeys app (exact host match);
///  - anything listed in `NEURALKEYS_ALLOWED_ORIGINS` (passed as `extra`).
///
/// NOTE: we deliberately do NOT pattern-match `typing-trainer-*.vercel.app`.
/// Anyone can deploy a project under `*.vercel.app`, so a prefix/suffix wildcard
/// would let an attacker register e.g. `typing-trainer-evil.vercel.app` and read
/// the stream. Preview deploys must be opted in explicitly via the env var
/// (e.g. a stable branch alias like `https://typing-trainer-dev.vercel.app`).
fn is_origin_allowed(origin: Option<&str>, extra: &[String]) -> bool {
    let Some(raw) = origin else {
        return true; // native client, no Origin header
    };
    let host = origin_host(raw).to_lowercase();

    if host == "localhost" || host == "127.0.0.1" || host == "[::1]" {
        return true;
    }
    if host == PROD_ORIGIN_HOST {
        return true;
    }
    // Match env-provided entries against either the full origin or just the host.
    let raw_lower = raw.to_lowercase();
    extra.iter().any(|e| *e == raw_lower || *e == host)
}

fn hid_poll_loop(tx: Arc<broadcast::Sender<String>>) {
    loop {
        let api = match HidApi::new() {
            Ok(api) => api,
            Err(e) => {
                error!("Failed to init HID API: {e}");
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let device_info = match find_device(&api) {
            Some(d) => d,
            None => {
                broadcast_status(
                    &tx,
                    &StatusMessage::disconnected(
                        "No Keychron K2 HE found. Ensure USB wired mode.",
                    ),
                );
                warn!("No K2 HE device found, retrying in 5s...");
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let device_name = device_info
            .product_string()
            .unwrap_or("Keychron K2 HE")
            .to_string();

        info!(
            "Found: {device_name} (PID: 0x{:04X})",
            device_info.product_id()
        );

        let device = match device_info.open_device(&api) {
            Ok(d) => d,
            Err(e) => {
                error!("Failed to open device: {e}. On Windows, close Keychron Launcher (it opens the device exclusively).");
                broadcast_status(
                    &tx,
                    &StatusMessage::disconnected(format!(
                        "Cannot open device: {e}. Close Keychron Launcher and retry."
                    )),
                );
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        // Coordinate raw-HID access with Keychron Launcher / AnalogSense.
        // `_guard` must live until the end of this loop iteration — it holds the
        // mutex for the whole device session. Do NOT drop it early or move it
        // into a sub-scope, or Keychron Launcher contention reappears. On
        // non-Windows platforms this is a harmless file lock with no contention.
        let _guard = NamedLock::create(KEYCHRON_MUTEX)
            .ok()
            .and_then(|lock| lock.lock().ok());

        let negotiated = match negotiate_mode(&device) {
            Ok(v) => v,
            Err(e) => {
                error!("Mode negotiation failed: {e}. The keyboard did not answer GET_VERSION — it may be in Bluetooth mode or held by another app.");
                broadcast_status(
                    &tx,
                    &StatusMessage::disconnected(format!("Handshake failed: {e}")),
                );
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let version = negotiated.version_string();
        match negotiated.mode {
            PollMode::Batch => info!(
                "Connected ({version}). Batch mode — polling at ~{}Hz.",
                1000 / POLL_INTERVAL_MS
            ),
            PollMode::PerKey => warn!(
                "Connected ({version}). Stock firmware: per-key mode (~5Hz — each of \
                 the 84 keys is polled individually over USB). For full-rate (~100Hz) \
                 telemetry, flash the AnalogSense QMK fork. See README."
            ),
        }

        broadcast_status(
            &tx,
            &StatusMessage {
                connected: true,
                device: Some(device_name.clone()),
                version: Some(version),
                mode: Some(negotiated.mode),
                error: None,
            },
        );

        run_poll_session(&tx, &device, &device_name, negotiated.mode, negotiated.am_version);
    }
}

/// Tracks consecutive read failures and decides when a session is dead.
/// Extracted so the give-up policy is unit-testable without real hardware.
struct ErrorTracker {
    consecutive: u32,
    max: u32,
}

impl ErrorTracker {
    fn new(max: u32) -> Self {
        ErrorTracker { consecutive: 0, max }
    }

    fn record_success(&mut self) {
        self.consecutive = 0;
    }

    /// Records a failure and returns `true` when the caller should give up.
    fn record_failure(&mut self) -> bool {
        self.consecutive += 1;
        self.consecutive >= self.max
    }
}

/// Poll the device until a sustained read failure, then return to re-enumerate.
fn run_poll_session(
    tx: &broadcast::Sender<String>,
    device: &hidapi::HidDevice,
    device_name: &str,
    mode: PollMode,
    am_version: u8,
) {
    let start = Instant::now();
    let mut frame_count: u64 = 0;
    let mut last_rate_check = Instant::now();
    let mut errors = ErrorTracker::new(MAX_CONSECUTIVE_ERRORS);
    let mut per_key_buffer = [0u8; KEY_COUNT];

    loop {
        let frame_start = Instant::now();

        let result = match mode {
            PollMode::Batch => read_travel_batch(device),
            PollMode::PerKey => read_travel_per_key(device, am_version, &mut per_key_buffer),
        };

        match result {
            Ok(keys) => {
                errors.record_success();
                frame_count += 1;
                let elapsed = start.elapsed().as_secs_f64() * 1000.0;

                // Rate is a session-lifetime average (frames / seconds since
                // start), recomputed at most once per second to keep the field
                // cheap; it deliberately smooths over momentary jitter.
                let rate = if last_rate_check.elapsed() >= Duration::from_secs(1) {
                    let r = frame_count as f32 / start.elapsed().as_secs_f32();
                    last_rate_check = Instant::now();
                    r
                } else {
                    0.0
                };

                if tx.receiver_count() > 0 {
                    let frame = TravelFrame {
                        timestamp_ms: elapsed,
                        keys,
                        poll_rate_hz: rate,
                    };
                    let _ = tx.send(serde_json::to_string(&frame).unwrap_or_default());
                }
            }
            Err(e) => {
                let give_up = errors.record_failure();
                warn!("Read error ({}/{MAX_CONSECUTIVE_ERRORS}): {e}", errors.consecutive);
                if give_up {
                    error!("Lost device after {MAX_CONSECUTIVE_ERRORS} consecutive errors; re-enumerating.");
                    broadcast_status(
                        tx,
                        &StatusMessage {
                            connected: false,
                            device: Some(device_name.to_string()),
                            version: None,
                            mode: None,
                            error: Some(e),
                        },
                    );
                    return;
                }
            }
        }

        // Batch mode paces itself to the target interval. Per-key mode is
        // already rate-limited by its per-key round trips, so don't add sleep.
        if mode == PollMode::Batch {
            let elapsed = frame_start.elapsed();
            let target = Duration::from_millis(POLL_INTERVAL_MS);
            if elapsed < target {
                std::thread::sleep(target - elapsed);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn given_no_errors_when_failure_recorded_below_max_then_does_not_give_up() {
        // Given a tracker allowing 3 failures
        let mut tracker = ErrorTracker::new(3);
        // When two failures are recorded
        // Then the caller is not told to give up yet
        assert!(!tracker.record_failure());
        assert!(!tracker.record_failure());
    }

    #[test]
    fn given_failures_at_threshold_when_recorded_then_gives_up() {
        // Given a tracker allowing 3 failures
        let mut tracker = ErrorTracker::new(3);
        // When the third consecutive failure is recorded
        tracker.record_failure();
        tracker.record_failure();
        // Then the caller is told to give up
        assert!(tracker.record_failure());
    }

    #[test]
    fn given_a_success_when_recorded_then_failure_streak_resets() {
        // Given a tracker that has seen two failures
        let mut tracker = ErrorTracker::new(3);
        tracker.record_failure();
        tracker.record_failure();
        // When a success interrupts the streak
        tracker.record_success();
        // Then it takes a full new streak to give up
        assert!(!tracker.record_failure());
        assert!(!tracker.record_failure());
        assert!(tracker.record_failure());
    }

    const NO_EXTRA: &[String] = &[];

    #[test]
    fn given_no_origin_header_when_checked_then_allowed() {
        // Given a native client that sends no Origin
        // Then it is allowed (browsers always send Origin; native tools don't)
        assert!(is_origin_allowed(None, NO_EXTRA));
    }

    #[test]
    fn given_localhost_origins_when_checked_then_allowed() {
        // Given browser origins on loopback hosts (with assorted ports/schemes)
        // Then each is allowed
        assert!(is_origin_allowed(Some("http://localhost:3000"), NO_EXTRA));
        assert!(is_origin_allowed(Some("http://127.0.0.1:39850"), NO_EXTRA));
        assert!(is_origin_allowed(Some("https://localhost"), NO_EXTRA));
        assert!(is_origin_allowed(Some("http://[::1]:8080"), NO_EXTRA));
        assert!(is_origin_allowed(Some("http://[::1]"), NO_EXTRA)); // bare IPv6, no port
    }

    #[test]
    fn given_production_origin_when_checked_then_allowed() {
        // Given the deployed NeuralKeys app's origin
        // Then it is allowed (the Vercel app connects down to the local companion)
        assert!(is_origin_allowed(
            Some("https://typing-trainer-one.vercel.app"),
            NO_EXTRA
        ));
    }

    #[test]
    fn given_unlisted_vercel_preview_when_checked_then_rejected() {
        // Given a Vercel preview deploy that is NOT in the env allowlist
        // Then it is rejected — anyone can deploy under *.vercel.app, so previews
        // are not trusted by pattern; they must be opted in explicitly.
        assert!(!is_origin_allowed(
            Some("https://typing-trainer-abc123-stuart.vercel.app"),
            NO_EXTRA
        ));
        assert!(!is_origin_allowed(
            Some("https://typing-trainer-git-feature-x.vercel.app"),
            NO_EXTRA
        ));
    }

    #[test]
    fn given_attacker_owned_vercel_project_when_checked_then_rejected() {
        // Given an attacker who deploys a project whose name starts with the
        // legit prefix (typing-trainer-evil.vercel.app)
        // Then it is rejected — there is no *.vercel.app wildcard.
        assert!(!is_origin_allowed(
            Some("https://typing-trainer-evil.vercel.app"),
            NO_EXTRA
        ));
        assert!(!is_origin_allowed(
            Some("https://typing-trainer-phishing.vercel.app"),
            NO_EXTRA
        ));
    }

    #[test]
    fn given_lookalike_vercel_origin_when_checked_then_rejected() {
        // Given attacker domains that merely contain the project name
        // Then they are rejected (only exact prod host / env entries pass)
        assert!(!is_origin_allowed(
            Some("https://evil-typing-trainer-x.vercel.app.attacker.com"),
            NO_EXTRA
        ));
        assert!(!is_origin_allowed(
            Some("https://nottyping-trainer-x.vercel.app"),
            NO_EXTRA
        ));
    }

    #[test]
    fn given_env_listed_origin_when_checked_then_allowed() {
        // Given a stable preview alias / custom origin in NEURALKEYS_ALLOWED_ORIGINS
        let extra = vec!["https://typing-trainer-dev.vercel.app".to_string()];
        // Then it is allowed by full-origin match
        assert!(is_origin_allowed(
            Some("https://typing-trainer-dev.vercel.app"),
            &extra
        ));
        // And a non-listed preview is still rejected
        assert!(!is_origin_allowed(
            Some("https://typing-trainer-other.vercel.app"),
            &extra
        ));
    }

    #[test]
    fn given_remote_origins_when_checked_then_rejected() {
        // Given origins that are not loopback, prod, preview, or env-listed
        // Then each is rejected
        assert!(!is_origin_allowed(Some("https://evil.example.com"), NO_EXTRA));
        assert!(!is_origin_allowed(Some("http://localhost.evil.com"), NO_EXTRA));
        assert!(!is_origin_allowed(Some("http://127.0.0.1.evil.com"), NO_EXTRA));
        assert!(!is_origin_allowed(Some("null"), NO_EXTRA));
    }
}
