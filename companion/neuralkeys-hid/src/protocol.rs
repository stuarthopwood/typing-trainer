//! HID protocol constants and helpers for Keychron K2 HE communication.
//!
//! Protocol cross-checked against the AnalogSense reference implementation
//! (`calamity-inc/Soup`, `soup/AnalogueKeyboard.cpp::getActiveKeysKeychron`)
//! which has been validated against real hardware for the entire Keychron HE
//! family — Q1/Q3/Q5 HE, K2 HE, Lemokey P1 HE.
//!
//! K2 HE keys have ~4mm total travel. Raw values range 0..=235 where
//! 235 = fully bottomed out. Values below `DEADZONE` are treated as released.
//!
//! Two firmware modes exist:
//!  - **Batch (0x31)** — one round trip returns travel for every key in 4
//!    consecutive 32-byte reports. Only enabled when firmware advertises
//!    `FW_MARKER_BATCH (0x45)` as the last byte of its version response,
//!    e.g. the AnalogSense QMK fork. Stock Keychron firmware does NOT
//!    advertise this — `0x31` is silently dropped.
//!  - **Per-key (0x30)** — one round trip returns travel for a single key
//!    referenced by (row, col). Supported on stock firmware; you have to
//!    walk all 84 keys to build one frame, which caps the measured poll
//!    rate around 5 Hz (84 USB round-trips per frame).

pub const KEYCHRON_VID: u16 = 0x3434;
pub const K2_HE_PIDS: [u16; 3] = [0x0E20, 0x0E21, 0x0E22];
pub const USAGE_PAGE: u16 = 0xFF60;
pub const USAGE: u16 = 0x0061;

pub const CMD_PREFIX: u8 = 0xA9;
pub const CMD_GET_VERSION: u8 = 0x01;
pub const CMD_GET_TRAVEL: u8 = 0x30;
pub const CMD_GET_TRAVEL_ALL: u8 = 0x31;

/// Last byte of a `0x01` response. When present, the firmware supports
/// `0x31` batch travel. Stock K2 HE firmware does not set this.
pub const FW_MARKER_BATCH: u8 = 0x45;

/// Index in a `0x01` response that holds the AMC version number.
pub const VERSION_RESPONSE_INDEX: usize = 2;

/// Per-key travel response stores the value at `[6]` for AMC v4+,
/// otherwise at `[3]`.
pub const TRAVEL_RESPONSE_OFFSET_LEGACY: usize = 3;
pub const TRAVEL_RESPONSE_OFFSET_V4: usize = 6;

pub const REPORT_SIZE: usize = 32;
pub const TRAVEL_BATCH_REPORTS: usize = 4;
pub const KEY_COUNT: usize = 96;
/// Matrix dimensions. `ROWS` documents the 6x16 grid and guards the
/// `KEY_COUNT` invariant in tests; column math uses `COLS` directly, so `ROWS`
/// is only referenced from tests and compiled there.
#[cfg(test)]
pub const ROWS: u8 = 6;
pub const COLS: u8 = 16;

// The travel-scale constants and helpers below are the documented protocol
// reference: how a raw 0..=255 value maps to physical key travel. The binary
// streams raw values and the TypeScript client (`lib/hall-effect.ts`) does the
// normalization, so nothing in the shipped service calls these. They are
// compiled only under `#[cfg(test)]` — kept as executable, tested spec rather
// than dead weight in the release binary.

/// Raw value when key is fully bottomed out.
#[cfg(test)]
pub const MAX_TRAVEL: u8 = 235;
/// Electrical noise floor — values below this are treated as released.
#[cfg(test)]
pub const DEADZONE: u8 = 5;

/// Build a 33-byte raw HID command (report ID 0 + 32 bytes).
/// `args` fills bytes after the cmd byte; missing positions default to 0.
pub fn build_command(cmd: u8, args: &[u8]) -> [u8; 33] {
    let mut buf = [0u8; 33];
    buf[1] = CMD_PREFIX;
    buf[2] = cmd;
    let copy_len = args.len().min(30);
    buf[3..3 + copy_len].copy_from_slice(&args[..copy_len]);
    buf
}

/// Decide which travel mode to use based on a GET_VERSION response.
/// Returns `(am_version, is_batch_mode)`.
pub fn parse_version_response(report: &[u8]) -> Option<(u8, bool)> {
    if report.len() <= VERSION_RESPONSE_INDEX {
        return None;
    }
    let am_version = report[VERSION_RESPONSE_INDEX];
    let last = *report.last()?;
    Some((am_version, last == FW_MARKER_BATCH))
}

/// Strip the 2-byte command echo from each batch report and concatenate.
pub fn assemble_batch_payload(reports: &[&[u8]]) -> Vec<u8> {
    let mut out = Vec::with_capacity(REPORT_SIZE * TRAVEL_BATCH_REPORTS);
    for r in reports {
        if r.len() > 2 {
            out.extend_from_slice(&r[2..]);
        }
    }
    out.truncate(KEY_COUNT);
    out
}

/// Per-key travel response offset depends on firmware AMC version.
pub fn travel_offset_for_version(am_version: u8) -> usize {
    if am_version >= 4 {
        TRAVEL_RESPONSE_OFFSET_V4
    } else {
        TRAVEL_RESPONSE_OFFSET_LEGACY
    }
}

/// Convert a flat key index (0..96) into (row, col) coordinates.
pub fn index_to_row_col(index: u8) -> (u8, u8) {
    (index / COLS, index % COLS)
}

/// Keychron K2 HE 6x16 layout slot map. `true` = key occupies this slot,
/// `false` = matrix gap (split-space, RGB-cycle slot, etc).
/// Source: `layout_keychron_k2_he` in calamity-inc/Soup,
/// soup/AnalogueKeyboard.cpp @ commit 70b3e25 (12 gaps → 84 physical keys).
pub const K2_HE_LAYOUT: [bool; KEY_COUNT] = {
    let mut layout = [true; KEY_COUNT];
    layout[COLS as usize + 15] = false;
    layout[2 * COLS as usize + 15] = false;
    layout[3 * COLS as usize + 14] = false;
    layout[3 * COLS as usize + 15] = false;
    layout[4 * COLS as usize + 1] = false;
    layout[4 * COLS as usize + 15] = false;
    layout[5 * COLS as usize + 3] = false;
    layout[5 * COLS as usize + 4] = false;
    layout[5 * COLS as usize + 5] = false;
    layout[5 * COLS as usize + 7] = false;
    layout[5 * COLS as usize + 8] = false;
    layout[5 * COLS as usize + 15] = false;
    layout
};

/// Normalize a raw travel value (0..=255) to a 0.0..=1.0 float.
#[cfg(test)]
pub fn normalize_travel(raw: u8) -> f32 {
    if raw < DEADZONE {
        return 0.0;
    }
    let effective = (raw - DEADZONE) as f32;
    let range = (MAX_TRAVEL - DEADZONE) as f32;
    (effective / range).min(1.0)
}

/// Convert normalized travel (0.0..=1.0) to millimeters (0.0..=4.0mm).
#[cfg(test)]
pub fn travel_to_mm(normalized: f32) -> f32 {
    normalized * 4.0
}

/// Whether a key is "pressed" past a configurable actuation point.
#[cfg(test)]
pub fn is_pressed(raw: u8, actuation_point: u8) -> bool {
    raw >= actuation_point
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn given_version_command_when_built_then_has_correct_prefix_and_id() {
        let packet = build_command(CMD_GET_VERSION, &[]);
        assert_eq!(packet[0], 0x00);
        assert_eq!(packet[1], CMD_PREFIX);
        assert_eq!(packet[2], CMD_GET_VERSION);
        assert!(packet[3..].iter().all(|&b| b == 0));
        assert_eq!(packet.len(), 33);
    }

    #[test]
    fn given_per_key_command_with_row_col_when_built_then_args_fill_positions_3_and_4() {
        let packet = build_command(CMD_GET_TRAVEL, &[5, 12]);
        assert_eq!(packet[1], CMD_PREFIX);
        assert_eq!(packet[2], CMD_GET_TRAVEL);
        assert_eq!(packet[3], 5);
        assert_eq!(packet[4], 12);
    }

    #[test]
    fn given_response_ending_in_marker_when_parsed_then_batch_mode_selected() {
        let mut report = vec![CMD_PREFIX, CMD_GET_VERSION, 4, 0, 0];
        report.push(FW_MARKER_BATCH);
        let (version, batch) = parse_version_response(&report).expect("should parse");
        assert_eq!(version, 4);
        assert!(batch);
    }

    #[test]
    fn given_response_without_marker_when_parsed_then_per_key_mode_selected() {
        let report = vec![CMD_PREFIX, CMD_GET_VERSION, 3, 0, 0, 0];
        let (_, batch) = parse_version_response(&report).expect("should parse");
        assert!(!batch);
    }

    #[test]
    fn given_truncated_response_when_parsed_then_returns_none() {
        let report = vec![CMD_PREFIX, CMD_GET_VERSION];
        assert!(parse_version_response(&report).is_none());
    }

    #[test]
    fn given_four_reports_when_assembled_then_skip_two_byte_header_per_report() {
        let r0: Vec<u8> = (0..32).map(|i| if i < 2 { 0xFF } else { 1 }).collect();
        let r1: Vec<u8> = (0..32).map(|i| if i < 2 { 0xFF } else { 2 }).collect();
        let r2: Vec<u8> = (0..32).map(|i| if i < 2 { 0xFF } else { 3 }).collect();
        let r3: Vec<u8> = (0..32).map(|i| if i < 2 { 0xFF } else { 4 }).collect();
        let payload = assemble_batch_payload(&[&r0, &r1, &r2, &r3]);
        assert_eq!(payload.len(), KEY_COUNT);
        assert_eq!(payload[0], 1);
        assert_eq!(payload[30], 2);
        assert_eq!(payload[60], 3);
        assert_eq!(payload[90], 4);
    }

    #[test]
    fn given_short_report_when_assembled_then_skips_silently() {
        let payload = assemble_batch_payload(&[&[0u8]]);
        assert!(payload.is_empty());
    }

    #[test]
    fn given_legacy_firmware_when_offset_queried_then_returns_three() {
        assert_eq!(travel_offset_for_version(3), TRAVEL_RESPONSE_OFFSET_LEGACY);
    }

    #[test]
    fn given_v4_or_newer_firmware_when_offset_queried_then_returns_six() {
        assert_eq!(travel_offset_for_version(4), TRAVEL_RESPONSE_OFFSET_V4);
        assert_eq!(travel_offset_for_version(5), TRAVEL_RESPONSE_OFFSET_V4);
    }

    #[test]
    fn given_index_zero_when_converted_then_origin() {
        assert_eq!(index_to_row_col(0), (0, 0));
    }

    #[test]
    fn given_last_valid_index_when_converted_then_bottom_right() {
        assert_eq!(index_to_row_col(KEY_COUNT as u8 - 1), (5, 15));
    }

    #[test]
    fn given_middle_of_third_row_when_converted_then_row_two_col_eight() {
        assert_eq!(index_to_row_col(2 * COLS + 8), (2, 8));
    }

    #[test]
    fn given_k2_he_layout_when_counted_then_matches_known_key_count() {
        // 6x16 matrix has 96 slots; K2 HE has 84 physical keys.
        let real = K2_HE_LAYOUT.iter().filter(|k| **k).count();
        assert_eq!(real, 84);
    }

    #[test]
    fn given_known_gap_positions_when_checked_then_marked_as_absent() {
        for c in 3..=5 {
            assert!(!K2_HE_LAYOUT[5 * COLS as usize + c]);
        }
        for c in 7..=8 {
            assert!(!K2_HE_LAYOUT[5 * COLS as usize + c]);
        }
    }

    #[test]
    fn given_zero_travel_when_normalized_then_returns_zero() {
        assert_eq!(normalize_travel(0), 0.0);
    }

    #[test]
    fn given_below_deadzone_when_normalized_then_returns_zero() {
        assert_eq!(normalize_travel(3), 0.0);
        assert_eq!(normalize_travel(DEADZONE - 1), 0.0);
    }

    #[test]
    fn given_max_travel_when_normalized_then_returns_one() {
        let result = normalize_travel(MAX_TRAVEL);
        assert!((result - 1.0).abs() < 0.01, "got {result}");
    }

    #[test]
    fn given_mid_travel_when_normalized_then_returns_approximately_half() {
        let mid = DEADZONE + (MAX_TRAVEL - DEADZONE) / 2;
        let result = normalize_travel(mid);
        assert!(result > 0.4 && result < 0.6, "got {result}");
    }

    #[test]
    fn given_above_max_when_normalized_then_clamps_to_one() {
        assert_eq!(normalize_travel(255), 1.0);
    }

    #[test]
    fn given_full_travel_when_converted_then_returns_4mm() {
        assert_eq!(travel_to_mm(1.0), 4.0);
    }

    #[test]
    fn given_half_travel_when_converted_then_returns_2mm() {
        assert_eq!(travel_to_mm(0.5), 2.0);
    }

    #[test]
    fn given_zero_when_converted_then_returns_zero() {
        assert_eq!(travel_to_mm(0.0), 0.0);
    }

    #[test]
    fn given_travel_above_actuation_when_checked_then_is_pressed() {
        assert!(is_pressed(50, 50));
        assert!(is_pressed(100, 50));
        assert!(is_pressed(MAX_TRAVEL, 50));
    }

    #[test]
    fn given_travel_below_actuation_when_checked_then_not_pressed() {
        assert!(!is_pressed(49, 50));
        assert!(!is_pressed(0, 50));
    }

    #[test]
    fn constants_are_consistent() {
        assert_eq!(K2_HE_PIDS.len(), 3, "ANSI + ISO + JIS");
        assert!(MAX_TRAVEL > DEADZONE);
        assert_eq!(KEY_COUNT, (ROWS * COLS) as usize);
    }
}
