mod protocol;

use futures_util::{SinkExt, StreamExt};
use hidapi::HidApi;
use serde::Serialize;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};

use protocol::{KEYCHRON_VID, K2_HE_PIDS, USAGE_PAGE, USAGE, CMD_PREFIX, CMD_GET_VERSION, CMD_GET_TRAVEL_ALL};

const WS_PORT: u16 = 39850;
const POLL_INTERVAL_MS: u64 = 10; // 100Hz

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
    error: Option<String>,
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

fn read_travel_all(device: &hidapi::HidDevice) -> Result<Vec<u8>, String> {
    let mut cmd = [0u8; 33]; // report ID 0 + 32 bytes
    cmd[1] = CMD_PREFIX;
    cmd[2] = CMD_GET_TRAVEL_ALL;

    device.write(&cmd).map_err(|e| format!("write failed: {e}"))?;

    let mut all_data = Vec::with_capacity(128);
    let mut buf = [0u8; 33];

    for _ in 0..4 {
        let n = device
            .read_timeout(&mut buf, 100)
            .map_err(|e| format!("read failed: {e}"))?;
        if n == 0 {
            return Err("timeout reading response".into());
        }
        // Skip report ID byte (buf[0]), take 32 data bytes
        all_data.extend_from_slice(&buf[1..n.min(33)]);
    }

    Ok(all_data)
}

fn check_version(device: &hidapi::HidDevice) -> Result<String, String> {
    let mut cmd = [0u8; 33];
    cmd[1] = CMD_PREFIX;
    cmd[2] = CMD_GET_VERSION;

    device.write(&cmd).map_err(|e| format!("write failed: {e}"))?;

    let mut buf = [0u8; 33];
    let n = device
        .read_timeout(&mut buf, 500)
        .map_err(|e| format!("read failed: {e}"))?;

    if n > 3 {
        Ok(format!("{}.{}.{}", buf[3], buf[4], buf[5]))
    } else {
        Err("no version response".into())
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    info!("NeuralKeys HID Companion v{}", env!("CARGO_PKG_VERSION"));
    info!("WebSocket server starting on ws://localhost:{WS_PORT}");

    let (tx, _) = broadcast::channel::<String>(64);
    let tx = Arc::new(tx);

    // Spawn HID polling task
    let tx_hid = tx.clone();
    tokio::task::spawn_blocking(move || {
        hid_poll_loop(tx_hid);
    });

    // WebSocket server
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
            // Origin validation happens at the application level after accept
        let ws = match accept_async(stream).await {
                Ok(ws) => ws,
                Err(e) => {
                    error!("WebSocket handshake failed: {e}");
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
                let status = StatusMessage {
                    connected: false,
                    device: None,
                    version: None,
                    error: Some("No Keychron K2 HE found. Ensure USB wired mode.".into()),
                };
                let _ = tx.send(serde_json::to_string(&status).unwrap_or_default());
                warn!("No K2 HE device found, retrying in 5s...");
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let device_name = device_info
            .product_string()
            .unwrap_or("Keychron K2 HE")
            .to_string();

        info!("Found: {device_name} (PID: 0x{:04X})", device_info.product_id());

        let device = match device_info.open_device(&api) {
            Ok(d) => d,
            Err(e) => {
                error!("Failed to open device: {e}");
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let version = check_version(&device).unwrap_or_else(|e| {
            warn!("Version check failed: {e}");
            "unknown".into()
        });

        let status = StatusMessage {
            connected: true,
            device: Some(device_name.clone()),
            version: Some(version),
            error: None,
        };
        let _ = tx.send(serde_json::to_string(&status).unwrap_or_default());
        info!("Connected. Polling at {}Hz...", 1000 / POLL_INTERVAL_MS);

        let start = Instant::now();
        let mut frame_count: u64 = 0;
        let mut last_rate_check = Instant::now();

        loop {
            let frame_start = Instant::now();

            match read_travel_all(&device) {
                Ok(keys) => {
                    frame_count += 1;
                    let elapsed = start.elapsed().as_secs_f64() * 1000.0;

                    let rate = if last_rate_check.elapsed() >= Duration::from_secs(1) {
                        let r = frame_count as f32 / start.elapsed().as_secs_f32();
                        last_rate_check = Instant::now();
                        r
                    } else {
                        0.0
                    };

                    let frame = TravelFrame {
                        timestamp_ms: elapsed,
                        keys,
                        poll_rate_hz: rate,
                    };

                    if tx.receiver_count() > 0 {
                        let _ = tx.send(serde_json::to_string(&frame).unwrap_or_default());
                    }
                }
                Err(e) => {
                    warn!("Read error: {e}");
                    let status = StatusMessage {
                        connected: false,
                        device: Some(device_name.clone()),
                        version: None,
                        error: Some(e),
                    };
                    let _ = tx.send(serde_json::to_string(&status).unwrap_or_default());
                    break; // Reconnect loop
                }
            }

            let elapsed = frame_start.elapsed();
            let target = Duration::from_millis(POLL_INTERVAL_MS);
            if elapsed < target {
                std::thread::sleep(target - elapsed);
            }
        }
    }
}
