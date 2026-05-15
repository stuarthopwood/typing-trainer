import type { DrillConfig } from "./types";

export const DRILL_LEVELS: DrillConfig[] = [
  { level: "home-row", chars: "asdfghjkl;", label: "Home Row" },
  { level: "top-row", chars: "qwertyuiop", label: "Top Row" },
  { level: "bottom-row", chars: "zxcvbnm,.", label: "Bottom Row" },
  { level: "numbers", chars: "1234567890", label: "Numbers" },
  { level: "symbols", chars: "!@#$%^&*()-_=+[]{}|;:',.<>?/", label: "Symbols" },
  { level: "full", chars: "abcdefghijklmnopqrstuvwxyz0123456789", label: "Full Keyboard" },
];

const WORD_BANK: Record<string, string[]> = {
  "home-row": [
    "flash", "salad", "flask", "shall", "falls", "glass", "slash", "flags",
    "dads", "lads", "adds", "fads", "jags", "gash", "dash", "hash",
    "glad", "half", "hall", "alfa", "saga", "lake", "fake", "sake",
    "jade", "fade", "shade", "asked", "salsa", "flask", "ask", "had",
    "sad", "lag", "gal", "lass", "shall", "shag", "flag", "drag",
    "slag", "sash", "lash", "rash", "cash", "gash", "mash", "bash",
    "dash", "flash", "clash", "crash", "slash", "splash", "stash",
    "glass", "grass", "class", "mass", "pass", "sass", "brass",
    "grasp", "clasp", "flask", "gasp", "hasp", "rasp", "wasp",
    "asked", "masked", "tasked", "basked", "gasped", "clasped",
    "salads", "flasks", "grasps", "clashes", "flashes", "dashes",
    "lashed", "hashed", "gashed", "cashed", "sashes", "lasses",
  ],
  "top-row": [
    "quote", "write", "tower", "power", "query", "route", "outer", "trout",
    "type", "wipe", "ripe", "pipe", "wire", "tire", "your", "tour", "pour",
    "riot", "pity", "quit", "whip", "trip", "equip", "quite", "white",
    "poetry", "equity", "proper", "trophy", "report", "import", "export",
    "pewter", "writer", "recipe", "repute", "pourer", "tower", "power",
    "erupt", "tripe", "gripe", "snipe", "swipe", "stripe", "recipe",
    "ripen", "wiper", "piper", "tiger", "rider", "wider", "cider",
    "quiet", "quilt", "quirk", "query", "quote", "queue", "squid",
    "typewriter", "prototype", "territory", "priority", "property",
    "interpret", "interrupt", "perpetuity", "prosperity", "opportunity",
    "youthful", "pitiful", "powerful", "wonderful", "sorrowful",
    "repossess", "reprocess", "reproduce", "repertoire", "repository",
  ],
  "bottom-row": [
    "comb", "bomb", "zinc", "zone", "mix", "fix", "box", "van", "ban", "can",
    "cab", "numb", "dumb", "lamb", "climb", "crumb", "thumb", "plumb",
    "maze", "blaze", "craze", "glaze", "amaze", "frozen", "blazing",
    "boxing", "foxing", "vexing", "moving", "giving", "living", "making",
    "zinc", "zone", "zeal", "zero", "buzz", "fizz", "jazz", "fuzz",
    "exam", "exact", "exist", "exit", "excel", "except", "excite",
    "civic", "vivid", "mimic", "comic", "magic", "music", "basic",
    "cabin", "cabin", "maven", "raven", "haven", "woven", "oven",
    "brave", "crave", "grave", "shave", "knave", "carve", "nerve",
    "maxim", "venom", "denim", "melon", "lemon", "demon", "seven",
    "civilization", "organization", "maximizing", "memorizing",
    "vocalizing", "visualizing", "minimizing", "normalizing",
  ],
  "numbers": [
    "1st", "2nd", "3rd", "4th", "5th", "10x", "24/7", "365", "100",
    "2024", "2025", "2026", "404", "500", "200", "128", "256", "512",
    "3.14", "9.81", "42", "007", "1984", "2001", "99", "101", "1000",
    "port 8080", "room 404", "error 500", "http 200", "code 418",
    "v2.0", "v3.1", "64-bit", "32-bit", "16px", "24rem", "100vh",
    "top 10", "24 hours", "7 days", "52 weeks", "12 months", "60 seconds",
    "chapter 1", "page 42", "line 99", "item 7", "step 3", "phase 2",
    "1080p", "4k", "720p", "144hz", "60fps", "8gb", "16gb", "512gb",
    "192.168.1.1", "10.0.0.1", "127.0.0.1", "255.255.255.0",
  ],
  "symbols": [
    "user@email.com", "price: $9.99", "50% off!", "yes/no", "(hello)",
    "[array]", "{object}", "key=value", "a && b", "x || y", "!done",
    "path/to/file", "name: 'Stuart'", "count++", "i--", "a += b",
    "fn(x, y)", "arr[0]", "obj.key", "str.length", "!null", "a ?? b",
    "map((x) => x * 2)", "(a + b) * c", "x !== y", "a <= b", "c >= d",
    "#id", ".class", "@media", "$variable", "%width", "^start",
    "import { x } from 'y'", "export default fn", "const a = {...b}",
    "typeof x === 'string'", "Array<number>", "Record<string, any>",
    "https://example.com?q=test&page=1", "file:///home/user/docs",
    "`template ${literal}`", "regex: /^[a-z]+$/i", "[...spread]",
  ],
  "full": [
    "keyboard", "practice", "rhythm", "quickly", "jumping", "foxes",
    "wizard", "boxing", "sphinx", "quartz", "velocity", "oxygen",
    "sequence", "frequent", "exquisite", "juxtapose", "magazine",
    "recognize", "emphasize", "technique", "mechanism", "algorithm",
    "developer", "typescript", "function", "variable", "parameter",
    "the quick brown fox jumps over the lazy dog",
    "pack my box with five dozen liquor jugs",
    "how vexingly quick daft zebras jump",
    "bright vixens jump dozy fowl quack",
    "sympathize", "crystallize", "hypothesize", "synchronize",
    "extraordinary", "sophisticated", "revolutionary", "comprehensive",
    "infrastructure", "implementation", "configuration", "documentation",
    "authentication", "authorization", "visualization", "optimization",
    "troubleshooting", "microservices", "containerization", "orchestration",
    "parallelism", "asynchronous", "polymorphism", "encapsulation",
    "abstraction", "inheritance", "composition", "decomposition",
    "refactoring", "debugging", "profiling", "benchmarking",
    "deployment", "integration", "continuous", "automated",
  ],
};

export function generateDrillText(config: DrillConfig, length: number = 50): string {
  const words = WORD_BANK[config.level] || WORD_BANK["full"];
  const selected: string[] = [];
  let currentLength = 0;

  while (currentLength < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    selected.push(word);
    currentLength += word.length + 1;
  }

  return selected.join(" ");
}
