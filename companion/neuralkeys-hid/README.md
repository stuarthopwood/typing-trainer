# NeuralKeys HID Companion

A lightweight companion service that reads real-time Hall Effect analog key travel data from your **Keychron K2 HE** keyboard and streams it to NeuralKeys via WebSocket.

## What it does

Your K2 HE has Hall Effect sensors that measure exactly how far each key is pressed (0-4mm). This service reads that data and streams it to NeuralKeys via WebSocket for analytics such as per-key press depth, actuation velocity, fatigue detection, and finger identification.

## Two polling modes (important)

The K2 HE raw-HID protocol exposes travel data two ways, and which one you get depends entirely on your **keyboard firmware**:

| Mode | Command | Rate | Requirement |
| --- | --- | --- | --- |
| **Batch** | `0x31` (all keys in one round-trip) | **~100 Hz** | Custom firmware that advertises support — the [AnalogSense QMK fork][qmk] |
| **Per-key** | `0x30` (one key per round-trip) | **~5 Hz** (84 USB round-trips per frame) | Works on **stock** Keychron firmware |

The companion auto-detects which mode your firmware supports during the connection handshake (it reads the firmware version response and checks for the batch-support marker) and picks the right one. The active mode is reported in the `mode` field of the status message and logged on startup.

> **Stock firmware runs at ~5 Hz.** That is enough for a live connection
> indicator and a coarse press-depth view, but **too slow** for
> actuation-velocity or fatigue analytics, which need the ~100 Hz batch mode.
> For full-rate telemetry, flash the [AnalogSense QMK fork][qmk]. This is an
> advanced, at-your-own-risk step — it replaces your keyboard firmware.

The protocol is cross-checked against the [AnalogSense][as] reference
implementation, which has been validated against real hardware across the
Keychron HE family.

[qmk]: https://github.com/AnalogSense/qmk_firmware
[as]: https://github.com/AnalogSense

## Requirements

- Keychron K2 HE keyboard (ANSI, ISO, or JIS)
- USB wired connection (Bluetooth doesn't expose raw HID)
- Windows 10+, macOS, or Linux
- [Rust toolchain](https://rustup.rs/) (to build from source)

## Installation

### From source

```bash
cd companion/neuralkeys-hid
cargo build --release
```

The binary will be at `target/release/neuralkeys-hid` (or `.exe` on Windows).

### Pre-built releases

Check the [Releases](https://github.com/stuarthopwood/typing-trainer/releases) page for pre-built binaries.

## Usage

1. Connect your K2 HE via USB cable
2. Run the service:

```bash
./neuralkeys-hid
```

3. On stock firmware you should see:
```
NeuralKeys HID Companion v0.2.0
WebSocket server starting on ws://localhost:39850
Found: Keychron K2 HE (PID: 0x0E21)
Connected (AMC v4). Stock firmware: per-key mode (~5Hz ...). For full-rate (~100Hz) telemetry, flash the AnalogSense QMK fork. See README.
```
On the AnalogSense QMK fork you'll instead see `Batch mode — polling at ~100Hz.`

4. Open NeuralKeys in your browser — it will automatically detect the companion service and show a connection indicator.

## Platform Notes

### Windows

Works out of the box. If you get "access denied", close Keychron Launcher first (it holds an exclusive mutex).

### macOS

May need to grant Input Monitoring permission in System Settings → Privacy & Security.

### Linux

Add a udev rule to grant access without root:

```bash
sudo tee /etc/udev/rules.d/99-keychron-he.rules << 'EOF'
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3434", ATTRS{idProduct}=="0e20", MODE="0666"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3434", ATTRS{idProduct}=="0e21", MODE="0666"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3434", ATTRS{idProduct}=="0e22", MODE="0666"
EOF
sudo udevadm control --reload-rules
```

Then unplug and replug the keyboard.

## WebSocket Protocol

The service streams JSON messages on `ws://localhost:39850`:

### Travel Frame (sent continuously when a client is connected)
```json
{
  "timestamp_ms": 1234.5,
  "keys": [0, 0, 0, 45, 0, 180, 0, ...],
  "poll_rate_hz": 98.5
}
```

`keys` is a flat array of 96 values (6 rows × 16 cols). Each value is 0-255 where 0 = released, 235 = fully pressed. `poll_rate_hz` reflects the live measured rate — roughly 100 in batch mode, roughly 5 in per-key mode.

### Status Message (on connect/disconnect/error)
```json
{
  "connected": true,
  "device": "Keychron K2 HE",
  "version": "AMC v4",
  "mode": "batch",
  "error": null
}
```

`mode` is `"batch"` or `"perkey"` when connected, and `null` otherwise. `version` reports the keyboard's analog-module (AMC) firmware version.

## Troubleshooting

- **"No Keychron K2 HE found"** — Ensure USB wired mode (not Bluetooth). Try switching the mode toggle on the back.
- **"Cannot open device" / access denied** — Close Keychron Launcher. On Windows it opens the device exclusively; the companion also takes a named lock (`KeychronMtx`) so the two don't fight over the interface. On Linux, add the udev rule above.
- **"Handshake failed" / repeated timeouts** — The keyboard didn't answer the version command. It's almost always in Bluetooth mode (raw HID is USB-only) or held by another app. (For context: v0.1.x had a bug where the service blindly sent the batch command stock firmware doesn't support and looped forever; v0.2+ negotiates the supported mode first, so a working keyboard no longer falls into an endless reconnect loop.)
- **Stuck at ~5Hz** — That's expected on stock firmware (per-key mode). See [Two polling modes](#two-polling-modes-important).
- **No data streaming** — The service only sends frames when NeuralKeys (or any WebSocket client) is connected.

## Privacy

- All data stays on your computer. Nothing is sent to any server.
- The service reads sensor **depth**, not keystrokes — it cannot directly capture what you type (that goes through the OS keyboard driver separately). Note that, like any analog telemetry, fine-grained timing and press-depth patterns *could* in principle reveal typing behaviour; this is why the socket is locked down (next bullet).
- The WebSocket binds to `127.0.0.1` only and validates the `Origin` header, so a random web page you visit cannot read the stream. Allowed origins: `localhost` / `127.0.0.1` / `[::1]` (local dev), the production NeuralKeys app (`https://typing-trainer-one.vercel.app`, exact match), and anything in the `NEURALKEYS_ALLOWED_ORIGINS` env var (comma-separated). Native clients (no `Origin`) are allowed.
- There is intentionally **no `*.vercel.app` wildcard** — anyone can deploy a project there, so a wildcard would let an attacker register e.g. `typing-trainer-evil.vercel.app` and read your stream. To test a Vercel **preview** deploy, opt it in explicitly, ideally via a stable branch alias:
  ```
  NEURALKEYS_ALLOWED_ORIGINS=https://typing-trainer-dev.vercel.app
  ```
- No video, no screenshots, no network traffic beyond localhost.
