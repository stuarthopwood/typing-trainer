# NeuralKeys HID Companion

A lightweight companion service that reads real-time Hall Effect analog key travel data from your **Keychron K2 HE** keyboard and streams it to NeuralKeys via WebSocket.

## What it does

Your K2 HE has Hall Effect sensors that measure exactly how far each key is pressed (0-4mm). This service reads that data at 100Hz and sends it to NeuralKeys for advanced analytics:

- **Per-key press depth** — are you bottoming out or typing lightly?
- **Actuation velocity** — how fast you strike each key
- **Physical fatigue detection** — decreasing force over time
- **Real finger identification** — each finger has a distinct press profile

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

3. You should see:
```
NeuralKeys HID Companion v0.1.0
WebSocket server starting on ws://localhost:39850
Found: Keychron K2 HE (PID: 0x0E20)
Connected. Polling at 100Hz...
```

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

### Travel Frame (100Hz when connected)
```json
{
  "timestamp_ms": 1234.5,
  "keys": [0, 0, 0, 45, 0, 180, 0, ...],
  "poll_rate_hz": 98.5
}
```

`keys` is a flat array of 96 values (6 rows × 16 cols). Each value is 0-255 where 0 = released, 235 = fully pressed.

### Status Message (on connect/disconnect)
```json
{
  "connected": true,
  "device": "Keychron K2 HE",
  "version": "1.2.3",
  "error": null
}
```

## Troubleshooting

- **"No Keychron K2 HE found"** — Ensure USB wired mode (not Bluetooth). Try switching the mode toggle on the back.
- **"Access denied"** — Close Keychron Launcher. On Windows it holds a mutex. On Linux, add the udev rule above.
- **No data streaming** — The service only sends frames when NeuralKeys (or any WebSocket client) is connected.

## Privacy

- All data stays on your computer. Nothing is sent to any server.
- The service only reads analog sensor values — it cannot see what you type (that goes through the OS keyboard driver separately).
- No video, no screenshots, no network traffic beyond localhost.
