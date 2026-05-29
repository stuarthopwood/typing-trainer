/// HID protocol constants and helpers for Keychron K2 HE communication.

pub const KEYCHRON_VID: u16 = 0x3434;
pub const K2_HE_PIDS: [u16; 3] = [0x0E20, 0x0E21, 0x0E22];
pub const USAGE_PAGE: u16 = 0xFF60;
pub const USAGE: u16 = 0x0061;

pub const CMD_PREFIX: u8 = 0xA9;
pub const CMD_GET_VERSION: u8 = 0x01;
pub const CMD_GET_TRAVEL_ALL: u8 = 0x31;

pub const REPORT_SIZE: usize = 32;
pub const TRAVEL_REPORTS: usize = 4;
pub const MATRIX_KEYS: usize = REPORT_SIZE * TRAVEL_REPORTS; // 128 bytes, first 96 are keys (6x16)
pub const KEY_COUNT: usize = 96; // 6 rows x 16 cols

pub const MAX_TRAVEL: u8 = 235;
pub const DEADZONE: u8 = 5;

/// Build a command packet for raw HID (report ID 0 + 32 bytes).
pub fn build_command(cmd: u8) -> [u8; 33] {
    let mut buf = [0u8; 33];
    buf[1] = CMD_PREFIX;
    buf[2] = cmd;
    buf
}

/// Parse travel data from 4 consecutive 32-byte reports into a key travel array.
/// Returns 96 values (one per key), each 0-255.
pub fn parse_travel_reports(reports: &[u8]) -> Vec<u8> {
    reports.iter().take(KEY_COUNT).copied().collect()
}

/// Normalize a raw travel value (0-255) to a 0.0-1.0 float.
/// Values below deadzone are treated as 0.
pub fn normalize_travel(raw: u8) -> f32 {
    if raw < DEADZONE {
        return 0.0;
    }
    let effective = (raw - DEADZONE) as f32;
    let range = (MAX_TRAVEL - DEADZONE) as f32;
    (effective / range).min(1.0)
}

/// Convert normalized travel (0.0-1.0) to millimeters (0.0-4.0mm).
pub fn travel_to_mm(normalized: f32) -> f32 {
    normalized * 4.0
}

/// Check if a key is considered "pressed" (past actuation point).
pub fn is_pressed(raw: u8, actuation_point: u8) -> bool {
    raw >= actuation_point
}

#[cfg(test)]
mod tests {
    use super::*;

    // =============================================
    // Command Building
    // =============================================

    #[test]
    fn given_version_command_when_built_then_has_correct_prefix_and_id() {
        // Given the version command ID
        let cmd = CMD_GET_VERSION;

        // When building the command packet
        let packet = build_command(cmd);

        // Then report ID is 0, prefix is 0xA9, command is 0x01
        assert_eq!(packet[0], 0x00, "report ID should be 0");
        assert_eq!(packet[1], CMD_PREFIX, "prefix should be 0xA9");
        assert_eq!(packet[2], CMD_GET_VERSION, "command should be 0x01");
        assert_eq!(packet.len(), 33, "packet should be 33 bytes (report ID + 32)");
    }

    #[test]
    fn given_travel_all_command_when_built_then_has_correct_bytes() {
        let packet = build_command(CMD_GET_TRAVEL_ALL);
        assert_eq!(packet[1], 0xA9);
        assert_eq!(packet[2], 0x31);
    }

    // =============================================
    // Travel Data Parsing
    // =============================================

    #[test]
    fn given_128_bytes_when_parsed_then_returns_96_key_values() {
        // Given 128 bytes of raw report data (4 x 32)
        let mut data = vec![0u8; 128];
        data[0] = 100; // first key
        data[95] = 200; // last key in 6x16 matrix

        // When parsing travel reports
        let keys = parse_travel_reports(&data);

        // Then 96 key values are returned
        assert_eq!(keys.len(), KEY_COUNT);
        assert_eq!(keys[0], 100);
        assert_eq!(keys[95], 200);
    }

    #[test]
    fn given_empty_reports_when_parsed_then_returns_empty() {
        let keys = parse_travel_reports(&[]);
        assert_eq!(keys.len(), 0);
    }

    // =============================================
    // Travel Normalization
    // =============================================

    #[test]
    fn given_zero_travel_when_normalized_then_returns_zero() {
        assert_eq!(normalize_travel(0), 0.0);
    }

    #[test]
    fn given_below_deadzone_when_normalized_then_returns_zero() {
        // Given a value below the deadzone threshold
        assert_eq!(normalize_travel(3), 0.0);
        assert_eq!(normalize_travel(DEADZONE - 1), 0.0);
    }

    #[test]
    fn given_max_travel_when_normalized_then_returns_one() {
        let result = normalize_travel(MAX_TRAVEL);
        assert!((result - 1.0).abs() < 0.01, "max travel should normalize to ~1.0, got {result}");
    }

    #[test]
    fn given_mid_travel_when_normalized_then_returns_approximately_half() {
        let mid = DEADZONE + (MAX_TRAVEL - DEADZONE) / 2;
        let result = normalize_travel(mid);
        assert!(result > 0.4 && result < 0.6, "mid travel should be ~0.5, got {result}");
    }

    #[test]
    fn given_above_max_when_normalized_then_clamps_to_one() {
        assert_eq!(normalize_travel(255), 1.0);
    }

    // =============================================
    // Travel to Millimeters
    // =============================================

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

    // =============================================
    // Key Press Detection
    // =============================================

    #[test]
    fn given_travel_above_actuation_when_checked_then_is_pressed() {
        // Given an actuation point of 50
        assert!(is_pressed(50, 50));
        assert!(is_pressed(100, 50));
        assert!(is_pressed(235, 50));
    }

    #[test]
    fn given_travel_below_actuation_when_checked_then_not_pressed() {
        assert!(!is_pressed(49, 50));
        assert!(!is_pressed(0, 50));
    }

    // =============================================
    // Constants Consistency
    // =============================================

    #[test]
    fn constants_are_consistent() {
        assert_eq!(K2_HE_PIDS.len(), 3, "should support ANSI, ISO, JIS");
        assert!(MAX_TRAVEL > DEADZONE, "max must exceed deadzone");
        assert_eq!(KEY_COUNT, 96, "6 rows x 16 cols = 96 keys");
    }
}
