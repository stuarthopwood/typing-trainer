export interface KeyDef {
  code: string;
  label: string;
  labelShifted?: string;
  width?: number;
  gap?: boolean;
}

export type KeyboardRow = KeyDef[];

export const KEYCHRON_K2_LAYOUT: KeyboardRow[] = [
  // Row 1: Function row
  [
    { code: "Escape", label: "Esc" },
    { code: "F1", label: "F1" },
    { code: "F2", label: "F2" },
    { code: "F3", label: "F3" },
    { code: "F4", label: "F4" },
    { code: "F5", label: "F5" },
    { code: "F6", label: "F6" },
    { code: "F7", label: "F7" },
    { code: "F8", label: "F8" },
    { code: "F9", label: "F9" },
    { code: "F10", label: "F10" },
    { code: "F11", label: "F11" },
    { code: "F12", label: "F12" },
    { code: "Delete", label: "Del" },
    { code: "Insert", label: "Ins" },
  ],
  // Row 2: Numbers + PgUp
  [
    { code: "Backquote", label: "`", labelShifted: "~" },
    { code: "Digit1", label: "1", labelShifted: "!" },
    { code: "Digit2", label: "2", labelShifted: "@" },
    { code: "Digit3", label: "3", labelShifted: "#" },
    { code: "Digit4", label: "4", labelShifted: "$" },
    { code: "Digit5", label: "5", labelShifted: "%" },
    { code: "Digit6", label: "6", labelShifted: "^" },
    { code: "Digit7", label: "7", labelShifted: "&" },
    { code: "Digit8", label: "8", labelShifted: "*" },
    { code: "Digit9", label: "9", labelShifted: "(" },
    { code: "Digit0", label: "0", labelShifted: ")" },
    { code: "Minus", label: "-", labelShifted: "_" },
    { code: "Equal", label: "=", labelShifted: "+" },
    { code: "Backspace", label: "Bksp", width: 2 },
    { code: "PageUp", label: "PgUp", gap: true },
  ],
  // Row 3: QWERTY + PgDn
  [
    { code: "Tab", label: "Tab", width: 1.5 },
    { code: "KeyQ", label: "Q" },
    { code: "KeyW", label: "W" },
    { code: "KeyE", label: "E" },
    { code: "KeyR", label: "R" },
    { code: "KeyT", label: "T" },
    { code: "KeyY", label: "Y" },
    { code: "KeyU", label: "U" },
    { code: "KeyI", label: "I" },
    { code: "KeyO", label: "O" },
    { code: "KeyP", label: "P" },
    { code: "BracketLeft", label: "[", labelShifted: "{" },
    { code: "BracketRight", label: "]", labelShifted: "}" },
    { code: "Backslash", label: "\\", labelShifted: "|", width: 1.5 },
    { code: "PageDown", label: "PgDn", gap: true },
  ],
  // Row 4: Home row + Home
  [
    { code: "CapsLock", label: "Caps", width: 1.75 },
    { code: "KeyA", label: "A" },
    { code: "KeyS", label: "S" },
    { code: "KeyD", label: "D" },
    { code: "KeyF", label: "F" },
    { code: "KeyG", label: "G" },
    { code: "KeyH", label: "H" },
    { code: "KeyJ", label: "J" },
    { code: "KeyK", label: "K" },
    { code: "KeyL", label: "L" },
    { code: "Semicolon", label: ";", labelShifted: ":" },
    { code: "Quote", label: "'", labelShifted: "\"" },
    { code: "Enter", label: "Enter", width: 2.25 },
    { code: "Home", label: "Home", gap: true },
  ],
  // Row 5: Bottom alpha + Up + End
  [
    { code: "ShiftLeft", label: "Shift", width: 2.25 },
    { code: "KeyZ", label: "Z" },
    { code: "KeyX", label: "X" },
    { code: "KeyC", label: "C" },
    { code: "KeyV", label: "V" },
    { code: "KeyB", label: "B" },
    { code: "KeyN", label: "N" },
    { code: "KeyM", label: "M" },
    { code: "Comma", label: ",", labelShifted: "<" },
    { code: "Period", label: ".", labelShifted: ">" },
    { code: "Slash", label: "/", labelShifted: "?" },
    { code: "ShiftRight", label: "Shift", width: 1.75 },
    { code: "ArrowUp", label: "↑" },
    { code: "End", label: "End", gap: true },
  ],
  // Row 6: Modifiers + Space + Arrows
  [
    { code: "ControlLeft", label: "Ctrl", width: 1.25 },
    { code: "MetaLeft", label: "Win", width: 1.25 },
    { code: "AltLeft", label: "Alt", width: 1.25 },
    { code: "Space", label: "", width: 6.25 },
    { code: "AltRight", label: "Alt" },
    { code: "Fn", label: "Fn" },
    { code: "ControlRight", label: "Ctrl" },
    { code: "ArrowLeft", label: "←" },
    { code: "ArrowDown", label: "↓" },
    { code: "ArrowRight", label: "→" },
  ],
];

const SHIFTED_MAP: Record<string, string> = {
  "~": "Backquote", "!": "Digit1", "@": "Digit2", "#": "Digit3",
  "$": "Digit4", "%": "Digit5", "^": "Digit6", "&": "Digit7",
  "*": "Digit8", "(": "Digit9", ")": "Digit0", "_": "Minus",
  "+": "Equal", "{": "BracketLeft", "}": "BracketRight", "|": "Backslash",
  ":": "Semicolon", "\"": "Quote", "<": "Comma", ">": "Period",
  "?": "Slash",
};

const CHAR_TO_CODE: Record<string, string> = {
  "`": "Backquote", "1": "Digit1", "2": "Digit2", "3": "Digit3",
  "4": "Digit4", "5": "Digit5", "6": "Digit6", "7": "Digit7",
  "8": "Digit8", "9": "Digit9", "0": "Digit0", "-": "Minus",
  "=": "Equal", "[": "BracketLeft", "]": "BracketRight", "\\": "Backslash",
  ";": "Semicolon", "'": "Quote", ",": "Comma", ".": "Period",
  "/": "Slash", " ": "Space", "\n": "Enter",
};

for (let i = 65; i <= 90; i++) {
  const letter = String.fromCharCode(i);
  CHAR_TO_CODE[letter.toLowerCase()] = `Key${letter}`;
}

export function getExpectedCodes(char: string): string[] {
  if (SHIFTED_MAP[char]) {
    return ["ShiftLeft", SHIFTED_MAP[char]];
  }
  if (char >= "A" && char <= "Z") {
    return ["ShiftLeft", `Key${char}`];
  }
  const code = CHAR_TO_CODE[char];
  if (code) return [code];
  return [];
}
