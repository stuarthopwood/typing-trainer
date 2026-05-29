const STORAGE_KEY = "neuralkeys-custom-texts";
const MIN_LENGTH = 20;
const MAX_LENGTH = 5000;
const CHUNK_SIZE = 200;

export interface CustomTextPreset {
  id: string;
  name: string;
  text: string;
  charCount: number;
  lastPractised?: string;
  createdAt: string;
}

export function validateCustomText(text: string): { valid: boolean; error?: string; cleaned: string } {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[^\x20-\x7E\n\t]/g, "").trim();
  if (cleaned.length < MIN_LENGTH) return { valid: false, error: `Minimum ${MIN_LENGTH} characters (got ${cleaned.length})`, cleaned };
  if (cleaned.length > MAX_LENGTH) return { valid: false, error: `Maximum ${MAX_LENGTH} characters (got ${cleaned.length})`, cleaned: cleaned.slice(0, MAX_LENGTH) };
  return { valid: true, cleaned };
}

export function paginateText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }
    let breakPoint = remaining.lastIndexOf(" ", CHUNK_SIZE);
    if (breakPoint < CHUNK_SIZE * 0.5) breakPoint = CHUNK_SIZE;
    chunks.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return chunks;
}

export function getCustomPresets(): CustomTextPreset[] {
  if (typeof localStorage === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

export function saveCustomPreset(name: string, text: string): CustomTextPreset {
  const presets = getCustomPresets();
  const preset: CustomTextPreset = {
    id: `custom-${Date.now()}`,
    name,
    text,
    charCount: text.length,
    createdAt: new Date().toISOString(),
  };
  presets.unshift(preset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, 20)));
  return preset;
}

export function deleteCustomPreset(id: string): void {
  const presets = getCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function markPresetPractised(id: string): void {
  const presets = getCustomPresets();
  const preset = presets.find((p) => p.id === id);
  if (preset) {
    preset.lastPractised = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }
}

export const SUGGESTED_PRESETS = [
  { name: "JavaScript", text: "const result = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, limit: 10 }) });" },
  { name: "Python", text: "def process_items(items: list[dict]) -> list[str]:\n    return [item['name'] for item in items if item.get('active', False)]" },
  { name: "TypeScript", text: "interface Config<T extends Record<string, unknown>> {\n  readonly values: T;\n  update(key: keyof T, value: T[keyof T]): void;\n}" },
  { name: "Shell", text: "find . -name '*.ts' -not -path './node_modules/*' | xargs grep -l 'TODO' | sort | head -20" },
];
