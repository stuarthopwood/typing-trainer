const CHALLENGE_POOL = [
  "The quick brown fox jumps over the lazy dog near the old stone wall by the river bank on a warm summer afternoon.",
  "Every morning she walks to the corner cafe and orders the same thing: a flat white and a croissant, no exceptions.",
  "He typed furiously, fingers dancing across keys, knowing that every word brought him closer to something worth reading.",
  "The rain hammered against the window as the cat watched, unblinking, waiting for the storm to pass.",
  "Sometimes the best code is the code you delete, leaving behind only what truly matters.",
  "A good keyboard should disappear beneath your fingers, becoming nothing more than a thought made physical.",
  "She found the letter tucked inside an old book, yellowed with age, still smelling faintly of lavender.",
  "The algorithm ran in constant time, elegant and efficient, doing in milliseconds what once took hours.",
  "Somewhere between the first coffee and the last commit, he realised this was what he was meant to do.",
  "Type fast, think faster, but never forget that accuracy wins the race every single time.",
  "The lighthouse keeper climbed the spiral staircase each evening, watching the beam sweep across dark waters.",
  "A well-placed semicolon can save a life. Or at least save you from debugging until three in the morning.",
  "She pressed enter and held her breath, waiting for the green checkmark that meant everything worked perfectly.",
  "Mountains teach patience. Each step is small, but string enough of them together and you reach the summit.",
  "The old typewriter sat in the corner, its keys worn smooth by decades of stories pressed into paper.",
  "Good code reads like prose: clear, intentional, and completely obvious in hindsight but hard to write fresh.",
  "The drummer counted silently, waiting for the exact moment to crash in, filling the room with thunder.",
  "Between zero and one lies an infinite universe of floating points, each one a tiny approximation of truth.",
  "He opened the terminal and typed three words that would change the production database forever. Oops.",
  "Every great typist started somewhere: hunting, pecking, cursing, and slowly building the neural pathways that fly.",
  "The clock on the wall ticked steadily, indifferent to deadlines, meetings, and the chaos of Monday mornings.",
  "A single well-chosen word can replace a paragraph. The art is knowing which word, and when to use it.",
  "The compiler never lies. It might be cryptic, obtuse, and infuriating, but it always tells the truth.",
  "She saved the file, pushed to main, and walked away whistling, knowing the tests were all green.",
  "Muscle memory is a strange thing: your fingers know where the keys are before your brain catches up.",
  "The spacebar gets the most wear, carrying the silence between every word, the pause that gives meaning.",
  "On quiet nights the server hummed gently, processing requests from across the world while no one watched.",
  "To type well is to think clearly. The keyboard is merely the bridge between thought and expression.",
  "He adjusted his chair height, tilted the screen, cracked his knuckles, and began the daily ritual.",
  "Somewhere a backup is running. Somewhere a deploy is failing. Somewhere a developer is learning why tests matter.",
  "The best error messages tell you what went wrong, where it happened, and exactly how to fix it.",
  "Dawn broke over the horizon as the last function passed its tests. Time for breakfast and a nap.",
  "A hundred words per minute sounds fast until you watch someone who types at a hundred and fifty.",
  "The garden grew slowly through spring, each seed a promise of colour waiting for the right moment.",
  "Tab or spaces? The eternal question that launched a thousand arguments and precisely zero productive outcomes.",
  "She picked up the phone, dialled the number from memory, and waited for the voice on the other end.",
  "Keyboard shortcuts save seconds. Seconds save minutes. Minutes save hours. Hours save sanity. Shortcuts save everything.",
  "The puppy chased its tail in circles, perfectly content with the simplest form of entertainment possible.",
  "When in doubt, console dot log. When still in doubt, add more console dot log until clarity emerges.",
  "A fresh terminal window holds infinite potential: anything could be built, any problem solved, any dream coded.",
  "The baker kneaded dough at four in the morning, finding rhythm in the repetition, peace in the process.",
  "Refactoring is like renovating: messy in the middle, satisfying at the end, and usually takes longer than expected.",
  "The wind picked up speed, scattering autumn leaves across the empty parking lot in golden spirals.",
  "Focus is a muscle. The more you exercise it, the stronger it gets, and the faster you type.",
  "Two roads diverged in a git repository, and I took the one less merged, and that made all the diff.",
  "She measured twice, coded once, tested thrice, and deployed with the confidence of someone who read the docs.",
  "The fireplace crackled as the family gathered, each person lost in their own screen, together but apart.",
  "Consistency beats speed. A steady twenty words per minute, perfectly accurate, outperforms a sloppy sixty.",
  "The bus arrived three minutes late, which was three minutes of unexpected practice time on the phone.",
  "Between keystrokes there are microseconds of decision, each one a tiny choice that shapes the final result.",
];

function hashDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const chr = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailyPrompt(date?: string): { prompt: string; date: string } {
  const d = date || new Date().toISOString().slice(0, 10);
  const index = hashDate(d) % CHALLENGE_POOL.length;
  return { prompt: CHALLENGE_POOL[index], date: d };
}

export interface DailyChallengeResult {
  date: string;
  wpm: number;
  accuracy: number;
  timeMs: number;
  completedAt: string;
  attempts: number;
}

export const MAX_DAILY_ATTEMPTS = 3;

export interface TodayChallengeStatus {
  completed: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
  bestWpm: number;
  bestAccuracy: number;
  avgWpm: number;
}

export function getTodayChallengeStatus(): TodayChallengeStatus {
  const today = new Date().toISOString().slice(0, 10);
  const history = getDailyChallengeHistory();
  const todayResult = history.find((h) => h.date === today);
  const allWpms = history.filter((h) => h.wpm > 0).map((h) => h.wpm);
  const avgWpm = allWpms.length > 0 ? Math.round(allWpms.reduce((a, b) => a + b, 0) / allWpms.length) : 0;

  if (!todayResult) {
    return { completed: false, attemptsUsed: 0, attemptsRemaining: MAX_DAILY_ATTEMPTS, bestWpm: 0, bestAccuracy: 0, avgWpm };
  }

  return {
    completed: todayResult.attempts >= MAX_DAILY_ATTEMPTS,
    attemptsUsed: todayResult.attempts,
    attemptsRemaining: Math.max(0, MAX_DAILY_ATTEMPTS - todayResult.attempts),
    bestWpm: todayResult.wpm,
    bestAccuracy: todayResult.accuracy,
    avgWpm,
  };
}

export function getDailyChallengeHistory(): DailyChallengeResult[] {
  if (typeof localStorage === "undefined") return [];
  const stored = localStorage.getItem("neuralkeys-daily-challenges");
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch { return []; }
}

export function recordDailyChallengeResult(result: Omit<DailyChallengeResult, "attempts">): DailyChallengeResult {
  const history = getDailyChallengeHistory();
  const existing = history.find((h) => h.date === result.date);

  if (existing) {
    existing.attempts++;
    if (result.wpm > existing.wpm) {
      existing.wpm = result.wpm;
      existing.accuracy = result.accuracy;
      existing.timeMs = result.timeMs;
      existing.completedAt = result.completedAt;
    }
    localStorage.setItem("neuralkeys-daily-challenges", JSON.stringify(history));
    return existing;
  }

  const newResult: DailyChallengeResult = { ...result, attempts: 1 };
  history.unshift(newResult);
  const trimmed = history.slice(0, 90);
  localStorage.setItem("neuralkeys-daily-challenges", JSON.stringify(trimmed));
  return newResult;
}

export function getDailyChallengeStreak(): number {
  const history = getDailyChallengeHistory();
  if (history.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dates = new Set(history.map((h) => h.date));

  let streak = 0;
  let check: string = dates.has(today) ? today : dates.has(yesterday) ? yesterday : "";
  if (!check) return 0;

  while (dates.has(check)) {
    streak++;
    const prev = new Date(check + "T12:00:00Z");
    prev.setDate(prev.getDate() - 1);
    check = prev.toISOString().slice(0, 10);
  }

  return streak;
}
